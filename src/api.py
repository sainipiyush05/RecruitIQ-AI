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

@app.post("/api/rank")
def rank_candidates(candidates: List[Dict[str, Any]]):
    if not candidates:
        raise HTTPException(status_code=400, detail="Candidate list is empty")
        
    try:
        jd_profile = load_yaml(get_yaml_path("jd_profile.yaml"))
        weights_config = load_yaml(get_yaml_path("weights.yaml"))
        
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
        
        # 3. Dense embeddings similarities (for smaller uploaded list, compute on-the-fly, otherwise fallback)
        if len(candidates) <= 200:
            try:
                # Compute embeddings on the fly for small lists
                embeddings = retrieval.precompute_embeddings(candidates)
                ideal_text = jd_profile.get("ideal_profile_text", "")
                df_features["embedding_similarity"] = retrieval.compute_embedding_similarities(ideal_text, embeddings)
            except Exception as emb_err:
                print(f"Embedding computation failed: {str(emb_err)}. Falling back to lexical scores.")
                df_features["embedding_similarity"] = df_features["bm25_score"]
        else:
            # Fallback for large uploads
            df_features["embedding_similarity"] = df_features["bm25_score"]
            
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
        
        results = []
        for idx, (_, row) in enumerate(df_sorted.iterrows()):
            cid = row["candidate_id"]
            rank = idx + 1
            reasoning = generate_reasoning_string(row, rank)
            
            # Extract key details to send back to frontend
            cand_profile = candidates_map[cid]
            
            # Map features dictionary to JSON friendly structure
            features_dict = {}
            for k, v in row.items():
                if isinstance(v, (np.integer, np.floating)):
                    features_dict[k] = float(v) if isinstance(v, np.floating) else int(v)
                elif isinstance(v, (list, dict, str, bool)):
                    features_dict[k] = v
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api:app", host="0.0.0.0", port=8000, reload=True)
