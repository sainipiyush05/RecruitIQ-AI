import os
import sys
import json
import argparse
import pandas as pd
import numpy as np

# Add workspace directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.data_cleaning import load_yaml
from src.scoring import compute_composite_score
from src.reasoning import generate_reasoning_string

def load_candidates_metadata(filepath):
    """Loads candidate IDs and checks format rapidly without loading full body if possible."""
    candidates = []
    if filepath.endswith('.jsonl'):
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    cand = json.loads(line)
                    candidates.append(cand)
    else:
        with open(filepath, 'r', encoding='utf-8') as f:
            candidates = json.load(f)
    return candidates

def main():
    parser = argparse.ArgumentParser(description="RecruitIQ AI Timed Ranking Command")
    parser.add_argument("--candidates", required=True, help="Path to input candidates file")
    parser.add_argument("--out", required=True, help="Path to output submission CSV")
    parser.add_argument("--artifacts", default="artifacts", help="Path to precomputed artifacts folder")
    args = parser.parse_args()

    # 1. Load weights configuration
    config_dir = "configs"
    weights_path = os.path.join(config_dir, "weights.yaml")
    weights_config = load_yaml(weights_path)

    # 2. Load candidate profiles
    print(f"Loading input candidates from {args.candidates}...")
    candidates = load_candidates_metadata(args.candidates)
    input_ids = [c["candidate_id"] for c in candidates]
    print(f"Loaded {len(candidates)} candidates.")

    # 3. Load precomputed features if available
    features_parquet = os.path.join(args.artifacts, "candidate_features.parquet")
    
    precomputed_available = False
    if os.path.exists(features_parquet):
        print(f"Loading cached features from {features_parquet}...")
        df_features = pd.read_parquet(features_parquet)
        
        # Verify that all input IDs exist in our cache
        cache_ids = set(df_features["candidate_id"])
        missing_ids = [cid for cid in input_ids if cid not in cache_ids]
        
        if len(missing_ids) == 0:
            precomputed_available = True
            print("All input candidate IDs found in cache! Using high-speed cached features.")
            # Filter and re-order cache to match input candidates order
            df_features = df_features.set_index("candidate_id").loc[input_ids].reset_index()
        else:
            print(f"Warning: Cache is missing {len(missing_ids)} candidates. Falling back to on-the-fly extraction.")
    else:
        print("Warning: No cached features parquet found. Performing on-the-fly feature calculation.")

    if not precomputed_available:
        # On-the-fly extraction (for safety / fallback)
        print("Running on-the-fly feature calculation...")
        from src.data_cleaning import DataCleaner
        from src.feature_engineering import FeatureEngineer
        from src.retrieval import RetrievalSystem
        from src.honeypot_rules import compute_honeypot_risk
        from src.disqualifier_rules import compute_disqualifier_multiplier

        jd_profile_path = os.path.join(config_dir, "jd_profile.yaml")
        jd_profile = load_yaml(jd_profile_path)
        
        cleaner = DataCleaner(
            os.path.join(config_dir, "skill_aliases.yaml"),
            os.path.join(config_dir, "title_mapping.yaml"),
            os.path.join(config_dir, "company_mapping.yaml")
        )
        engineer = FeatureEngineer(cleaner, jd_profile)
        
        # Build features
        feature_list = []
        for cand in candidates:
            feats = engineer.engineer_candidate_features(cand)
            feature_list.append(feats)
            
        df_features = pd.DataFrame(feature_list)
        
        # Lexical scores (BM25)
        print("Calculating lexical scores on-the-fly...")
        retrieval = RetrievalSystem()
        retrieval.build_bm25_index(candidates)
        query_terms = jd_profile.get("mandatory_skills", []) + jd_profile.get("preferred_skills", [])
        df_features["bm25_score"] = retrieval.compute_bm25_scores(query_terms)
        
        # For embeddings similarity, if cache embeddings are not available, use zero or simple similarity
        emb_file = os.path.join(args.artifacts, "candidate_embeddings.npy")
        if os.path.exists(emb_file) and len(candidates) == len(df_features):
            print("Loading cached embeddings...")
            embeddings = np.load(emb_file)
            ideal_text = jd_profile.get("ideal_profile_text", "")
            df_features["embedding_similarity"] = retrieval.compute_embedding_similarities(ideal_text, embeddings)
        else:
            print("Embeddings cache not matching/found. Using lexical score for semantic similarity fallback.")
            df_features["embedding_similarity"] = df_features["bm25_score"]

        # Honeypots & Disqualifiers
        honeypot_risks = []
        disq_multipliers = []
        for idx, cand in enumerate(candidates):
            feats = feature_list[idx]
            sim = df_features["embedding_similarity"].iloc[idx]
            honeypot_risks.append(compute_honeypot_risk(cand, feats, sim))
            disq_multipliers.append(compute_disqualifier_multiplier(cand, feats))
            
        df_features["honeypot_risk"] = honeypot_risks
        df_features["disqualifier_multiplier"] = disq_multipliers

    # 4. Compute composite score
    print("Computing composite candidate scores...")
    df_features["composite_score"] = compute_composite_score(df_features, weights_config)

    # 5. Apply Disqualifier and Honeypot Multipliers
    print("Applying disqualifiers and honeypot risk multipliers...")
    # Composite score: score = composite * disqualifier_multiplier * (1 - honeypot_risk)
    df_features["final_score"] = (
        df_features["composite_score"] * 
        df_features["disqualifier_multiplier"] * 
        (1.0 - df_features["honeypot_risk"])
    )

    # 6. Sort and pick top 100
    # Ties are broken by candidate_id ascending
    df_sorted = df_features.sort_values(
        by=["final_score", "candidate_id"], 
        ascending=[False, True]
    )
    
    top_n = min(100, len(df_sorted))
    top_100 = df_sorted.head(top_n).copy()
    top_100["rank"] = list(range(1, top_n + 1))

    # 7. Generate reasoning strings for top 100
    print("Generating explanations for top 100 candidates...")
    reasoning_list = []
    for idx, row in top_100.iterrows():
        rank = row["rank"]
        reasoning = generate_reasoning_string(row, rank)
        reasoning_list.append(reasoning)
        
    top_100["reasoning"] = reasoning_list

    # 8. Format submission
    # Output columns: candidate_id, rank, score, reasoning
    submission_df = top_100[["candidate_id", "rank", "final_score", "reasoning"]].copy()
    submission_df.columns = ["candidate_id", "rank", "score", "reasoning"]

    # Write output to CSV
    submission_df.to_csv(args.out, index=False)
    print(f"Successfully generated ranked submission in {args.out}!")

    # 9. Verify with the local validate_submission if it is present
    validator_path = "data/validate_submission.py"
    if os.path.exists(validator_path):
        print(f"Running validator {validator_path} on generated CSV...")
        import subprocess
        result = subprocess.run([sys.executable, validator_path, args.out], capture_output=True, text=True)
        print(result.stdout)
        if result.returncode != 0:
            print("Warning: Validator script reported issues:")
            print(result.stderr)

if __name__ == "__main__":
    main()
