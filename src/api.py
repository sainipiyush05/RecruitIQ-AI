import os
import sys
import json
import yaml
import pandas as pd
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Add workspace directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.data_cleaning import DataCleaner, load_yaml
from src.feature_engineering import FeatureEngineer
from src.retrieval import RetrievalSystem
from src.honeypot_rules import compute_honeypot_risk
from src.disqualifier_rules import compute_disqualifier_multiplier
from src.scoring import compute_composite_score
from src.reasoning import generate_reasoning_string
from src.jd_parser import parse_job_description

app = FastAPI(title="RecruitIQ AI API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIG_DIR = "configs"

def get_yaml_path(filename):
    return os.path.join(CONFIG_DIR, filename)

@app.get("/api/configs")
def get_configs():
    try:
        jd_profile = load_yaml(get_yaml_path("jd_profile.yaml"))
        weights = load_yaml(get_yaml_path("weights.yaml"))
        rules = load_yaml(get_yaml_path("rules.yaml"))
        return {
            "jd_profile": jd_profile,
            "weights": weights,
            "rules": rules
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load configurations: {str(e)}")

class UpdateConfigsRequest(BaseModel):
    weights: Optional[Dict[str, Any]] = None
    rules: Optional[Dict[str, Any]] = None
    jd_profile: Optional[Dict[str, Any]] = None

@app.post("/api/configs")
def update_configs(req: UpdateConfigsRequest):
    try:
        if req.weights:
            with open(get_yaml_path("weights.yaml"), "w", encoding="utf-8") as f:
                yaml.dump(req.weights, f, default_flow_style=False)
        if req.rules:
            with open(get_yaml_path("rules.yaml"), "w", encoding="utf-8") as f:
                yaml.dump(req.rules, f, default_flow_style=False)
        if req.jd_profile:
            with open(get_yaml_path("jd_profile.yaml"), "w", encoding="utf-8") as f:
                yaml.dump(req.jd_profile, f, default_flow_style=False)
        return {"status": "success", "message": "Configurations updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update configurations: {str(e)}")

class AnalyzeJDRequest(BaseModel):
    text: str

@app.post("/api/analyze_jd")
def analyze_jd(req: AnalyzeJDRequest):
    try:
        skill_aliases = load_yaml(get_yaml_path("skill_aliases.yaml")) or {}
        parsed_jd = parse_job_description(req.text, skill_aliases)
        return parsed_jd
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze JD: {str(e)}")

def recalculate_jd_dependent_features(df_features, candidates, jd_profile):
    mandatory_skills = [s.lower() for s in jd_profile.get("mandatory_skills", [])]
    preferred_skills = [s.lower() for s in jd_profile.get("preferred_skills", [])]
    
    # 1. Recalculate skill coverages
    mandatory_covs = []
    preferred_covs = []
    matched_mandatories = []
    matched_preferreds = []
    
    for _, row in df_features.iterrows():
        skills = row["evidence_skills"]
        # Convert to list if it is a numpy array or string
        if isinstance(skills, str):
            skills = [skills]
        elif isinstance(skills, np.ndarray):
            skills = skills.tolist()
        elif not isinstance(skills, list):
            skills = []
            
        skills_lower = [s.lower() for s in skills]
        
        mm = [s for s in mandatory_skills if s in skills_lower]
        mp = [s for s in preferred_skills if s in skills_lower]
        
        mandatory_covs.append(len(mm) / max(1, len(mandatory_skills)))
        preferred_covs.append(len(mp) / max(1, len(preferred_skills)))
        matched_mandatories.append(mm)
        matched_preferreds.append(mp)
        
    df_features["mandatory_skill_coverage"] = mandatory_covs
    df_features["preferred_skill_coverage"] = preferred_covs
    df_features["evidence_matched_mandatory"] = matched_mandatories
    df_features["evidence_matched_preferred"] = matched_preferreds
    
    # 2. Recalculate location fit scores
    loc_pref = jd_profile.get("location_preference", {})
    ideal_locs = [l.lower() for l in loc_pref.get("ideal", [])]
    acceptable_locs = [l.lower() for l in loc_pref.get("acceptable", [])]
    
    candidates_map = {c["candidate_id"]: c for c in candidates}
    location_fit_scores = []
    
    for cid in df_features["candidate_id"]:
        cand = candidates_map.get(cid, {})
        profile = cand.get("profile", {})
        cand_loc = profile.get("location", "") or ""
        cand_country = profile.get("country", "") or ""
        signals = cand.get("redrob_signals", {})
        
        loc_fit_score = 0.0
        cand_loc_lower = cand_loc.lower().strip()
        
        if any(il in cand_loc_lower for il in ideal_locs):
            loc_fit_score = 1.0
        elif any(al in cand_loc_lower for al in acceptable_locs):
            loc_fit_score = 0.7
        elif signals.get("willing_to_relocate", False):
            loc_fit_score = 0.5
        elif cand_country.lower().strip() == "india":
            loc_fit_score = 0.3
        else:
            loc_fit_score = 0.0
            
        location_fit_scores.append(loc_fit_score)
        
    df_features["location_fit_score"] = location_fit_scores
    return df_features

@app.post("/api/rank")
def rank_candidates(candidates: List[Dict[str, Any]]):
    if not candidates:
        raise HTTPException(status_code=400, detail="Candidate list is empty")
        
    try:
        jd_profile = load_yaml(get_yaml_path("jd_profile.yaml"))
        weights_config = load_yaml(get_yaml_path("weights.yaml"))
        
        # Check cache
        artifacts_dir = "artifacts"
        features_parquet = os.path.join(artifacts_dir, "candidate_features.parquet")
        embeddings_file = os.path.join(artifacts_dir, "candidate_embeddings.npy")
        bm25_file = os.path.join(artifacts_dir, "bm25_index.pkl")
        
        precomputed_available = False
        df_features = None
        
        input_ids = [c["candidate_id"] for c in candidates]
        
        if os.path.exists(features_parquet) and os.path.exists(embeddings_file) and os.path.exists(bm25_file):
            print(f"Checking precomputed cache features and index files...")
            try:
                df_cached = pd.read_parquet(features_parquet)
                cache_ids = set(df_cached["candidate_id"])
                missing_ids = [cid for cid in input_ids if cid not in cache_ids]
                
                if len(missing_ids) == 0:
                    print("All requested candidates exist in cache! Running fast re-scoring.")
                    retrieval = RetrievalSystem()
                    retrieval.load_bm25(bm25_file)
                    query_terms = jd_profile.get("mandatory_skills", []) + jd_profile.get("preferred_skills", [])
                    
                    # Compute new BM25 scores on cache index
                    df_cached["bm25_score"] = retrieval.compute_bm25_scores(query_terms)
                    
                    # Load embeddings and calculate similarities
                    embeddings = np.load(embeddings_file)
                    ideal_text = jd_profile.get("ideal_profile_text", "")
                    df_cached["embedding_similarity"] = retrieval.compute_embedding_similarities(ideal_text, embeddings)
                    
                    # Recalculate coverages and location fits
                    df_cached = recalculate_jd_dependent_features(df_cached, candidates, jd_profile)
                    
                    # Reorder/filter to input order
                    df_features = df_cached.set_index("candidate_id").loc[input_ids].reset_index()
                    precomputed_available = True
                    print("Completed fast re-scoring successfully!")
            except Exception as cache_err:
                print(f"Precomputed cache loading failed: {cache_err}. Falling back to slow on-the-fly path.")
        
        # Slow fallback: Run feature engineering on-the-fly
        if not precomputed_available:
            print("Running slow path on-the-fly calculation...")
            cleaner = DataCleaner(
                get_yaml_path("skill_aliases.yaml"),
                get_yaml_path("title_mapping.yaml"),
                get_yaml_path("company_mapping.yaml")
            )
            engineer = FeatureEngineer(cleaner, jd_profile)
            
            # 1. Feature Engineering
            feature_list = []
            for cand in candidates:
                feats = engineer.engineer_candidate_features(cand)
                feature_list.append(feats)
                
            df_features = pd.DataFrame(feature_list)
            
            # 2. BM25 / Lexical scores
            retrieval = RetrievalSystem()
            retrieval.build_bm25_index(candidates)
            query_terms = jd_profile.get("mandatory_skills", []) + jd_profile.get("preferred_skills", [])
            df_features["bm25_score"] = retrieval.compute_bm25_scores(query_terms)
            
            # 3. Dense embeddings similarities (for smaller lists, compute on-the-fly, otherwise fallback)
            if len(candidates) <= 200:
                try:
                    embeddings = retrieval.precompute_embeddings(candidates)
                    ideal_text = jd_profile.get("ideal_profile_text", "")
                    df_features["embedding_similarity"] = retrieval.compute_embedding_similarities(ideal_text, embeddings)
                except Exception as emb_err:
                    print(f"Embedding computation failed: {str(emb_err)}. Falling back to lexical scores.")
                    df_features["embedding_similarity"] = df_features["bm25_score"]
            else:
                df_features["embedding_similarity"] = df_features["bm25_score"]

        # Convert df_features rows to dict for downstream honeypot & disqualifier evaluation
        feature_list = df_features.to_dict(orient="records")
            
        # 4. Honeypots & Disqualifiers
        honeypot_risks = []
        disq_multipliers = []
        for idx, cand in enumerate(candidates):
            feats = feature_list[idx]
            sim = df_features["embedding_similarity"].iloc[idx]
            honeypot_risks.append(compute_honeypot_risk(cand, feats, sim))
            disq_multipliers.append(compute_disqualifier_multiplier(cand, feats))
            
        df_features["honeypot_risk"] = honeypot_risks
        df_features["disqualifier_multiplier"] = disq_multipliers
        
        # 5. Composite Score
        df_features["composite_score"] = compute_composite_score(df_features, weights_config)
        df_features["final_score"] = (
            df_features["composite_score"] * 
            df_features["disqualifier_multiplier"] * 
            (1.0 - df_features["honeypot_risk"])
        )
        
        # 6. Sort and Rank
        df_sorted = df_features.sort_values(
            by=["final_score", "candidate_id"], 
            ascending=[False, True]
        )
        
        # Keep original candidate profiles mapped by id for detailing
        candidates_map = {c["candidate_id"]: c for c in candidates}
        
        # Only return top 100 candidate matches to prevent browser out-of-memory crashes
        top_n = min(100, len(df_sorted))
        df_top = df_sorted.head(top_n)
        
        results = []
        for idx, (_, row) in enumerate(df_top.iterrows()):
            cid = row["candidate_id"]
            rank = idx + 1
            reasoning = generate_reasoning_string(row, rank)
            
            # Extract key details to send back to frontend
            cand_profile = candidates_map[cid]
            
            # Map features dictionary to JSON friendly structure
            features_dict = {}
            for k, v in row.items():
                if isinstance(v, (list, np.ndarray)):
                    features_dict[k] = v.tolist() if isinstance(v, np.ndarray) else v
                elif isinstance(v, (dict, str, bool)):
                    features_dict[k] = v
                elif isinstance(v, (np.integer, np.floating)):
                    features_dict[k] = float(v) if isinstance(v, np.floating) else int(v)
                elif pd.isna(v):
                    features_dict[k] = None
                else:
                    features_dict[k] = str(v)
                    
            results.append({
                "candidate_id": cid,
                "rank": rank,
                "score": float(row["final_score"]),
                "reasoning": reasoning,
                "profile": cand_profile["profile"],
                "career_history": cand_profile.get("career_history", []),
                "skills": cand_profile.get("skills", []),
                "redrob_signals": cand_profile.get("redrob_signals", {}),
                "features": features_dict
            })
            
        return {
            "status": "success",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ranking pipeline failed: {str(e)}")

@app.post("/api/upload_rank")
async def upload_and_rank(file: UploadFile = File(...)):
    try:
        content = await file.read()
        text = content.decode("utf-8")
        
        # Try JSON array first
        try:
            candidates = json.loads(text)
        except json.JSONDecodeError:
            # Try JSON lines
            candidates = []
            for line in text.splitlines():
                if line.strip():
                    candidates.append(json.loads(line))
                    
        return rank_candidates(candidates)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

def load_local_candidates(filepath: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")
        
    candidates = []
    if filepath.endswith('.jsonl'):
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    candidates.append(json.loads(line))
                    if limit and len(candidates) >= limit:
                        break
    else:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, list):
                candidates = data[:limit] if limit else data
            else:
                candidates = [data]
    return candidates

class RankLocalRequest(BaseModel):
    filepath: str
    limit: Optional[int] = None

@app.post("/api/rank_local")
def rank_local_candidates_endpoint(req: RankLocalRequest):
    try:
        filepath = req.filepath
        if not os.path.isabs(filepath):
            filepath = os.path.join(os.getcwd(), filepath)
            
        print(f"Loading local candidates from {filepath} (limit: {req.limit})...")
        candidates = load_local_candidates(filepath, req.limit)
        print(f"Loaded {len(candidates)} candidates. Proceeding to rank...")
        return rank_candidates(candidates)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Local ranking failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api:app", host="0.0.0.0", port=8000, reload=True)
