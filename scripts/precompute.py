import os
import sys
import json
import argparse
import numpy as np
import pandas as pd

# Add workspace directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.data_cleaning import DataCleaner
from src.feature_engineering import FeatureEngineer
from src.retrieval import RetrievalSystem
from src.honeypot_rules import compute_honeypot_risk
from src.disqualifier_rules import compute_disqualifier_multiplier

def load_candidates(filepath):
    if filepath.endswith('.jsonl'):
        print(f"Loading candidates from JSON Lines: {filepath}")
        candidates = []
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    candidates.append(json.loads(line))
        return candidates
    else:
        print(f"Loading candidates from JSON Array: {filepath}")
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

def main():
    parser = argparse.ArgumentParser(description="RecruitIQ AI Phase A Precomputation")
    parser.add_argument("--candidates", required=True, help="Path to candidates json/jsonl file")
    parser.add_argument("--output", default="artifacts", help="Directory to save precomputed artifacts")
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    # 1. Load Configurations
    config_dir = "configs"
    jd_profile_path = os.path.join(config_dir, "jd_profile.yaml")
    weights_path = os.path.join(config_dir, "weights.yaml")
    rules_path = os.path.join(config_dir, "rules.yaml")
    skill_aliases_path = os.path.join(config_dir, "skill_aliases.yaml")
    title_mapping_path = os.path.join(config_dir, "title_mapping.yaml")
    company_mapping_path = os.path.join(config_dir, "company_mapping.yaml")

    # Initialize data structures
    from src.data_cleaning import load_yaml
    jd_profile = load_yaml(jd_profile_path)

    print("Initializing Cleaner, FeatureEngineer, and RetrievalSystem...")
    cleaner = DataCleaner(skill_aliases_path, title_mapping_path, company_mapping_path)
    engineer = FeatureEngineer(cleaner, jd_profile)
    retrieval = RetrievalSystem()

    # 2. Load candidate profiles
    candidates = load_candidates(args.candidates)
    print(f"Loaded {len(candidates)} candidates.")

    # 3. Clean and Engineer Features
    print("Engineering candidate features...")
    feature_list = []
    for idx, cand in enumerate(candidates):
        feats = engineer.engineer_candidate_features(cand)
        feature_list.append(feats)
        if (idx + 1) % 10000 == 0:
            print(f"Processed {idx + 1} candidates...")

    df_features = pd.DataFrame(feature_list)

    # 4. Dense Embeddings & BM25 Index
    print("Building BM25 Index...")
    retrieval.build_bm25_index(candidates)
    bm25_filepath = os.path.join(args.output, "bm25_index.pkl")
    retrieval.save_bm25(bm25_filepath)
    print(f"BM25 index saved to {bm25_filepath}")

    print("Computing BGE semantic embeddings (this may take a while)...")
    # For speed during testing or large scale, print status
    embeddings = retrieval.precompute_embeddings(candidates)
    embeddings_filepath = os.path.join(args.output, "candidate_embeddings.npy")
    np.save(embeddings_filepath, embeddings)
    print(f"Embeddings saved to {embeddings_filepath} (shape: {embeddings.shape})")

    # 5. Compute embedding similarities and BM25 scores against target JD
    print("Calculating JD relevance scores...")
    ideal_text = jd_profile.get("ideal_profile_text", "")
    embedding_similarities = retrieval.compute_embedding_similarities(ideal_text, embeddings)
    df_features["embedding_similarity"] = embedding_similarities

    # For BM25 query terms, combine mandatory and preferred skills
    query_terms = jd_profile.get("mandatory_skills", []) + jd_profile.get("preferred_skills", [])
    bm25_scores = retrieval.compute_bm25_scores(query_terms)
    df_features["bm25_score"] = bm25_scores

    # 6. Evaluate Rules (Honeypot risk and disqualifier multiplier)
    print("Evaluating Honeypot Risk and Disqualifier Multipliers...")
    honeypot_risks = []
    disq_multipliers = []
    
    for idx, cand in enumerate(candidates):
        feats = feature_list[idx]
        sim = embedding_similarities[idx]
        
        # Honeypot risk includes Rule 9 (sparse evidence for high similarity)
        hp_risk = compute_honeypot_risk(cand, feats, sim)
        honeypot_risks.append(hp_risk)
        
        # Disqualifier multiplier
        disq_mult = compute_disqualifier_multiplier(cand, feats)
        disq_multipliers.append(disq_mult)

    df_features["honeypot_risk"] = honeypot_risks
    df_features["disqualifier_multiplier"] = disq_multipliers

    # 7. Save cache Parquet file
    parquet_filepath = os.path.join(args.output, "candidate_features.parquet")
    df_features.to_parquet(parquet_filepath)
    print(f"All precomputed features saved to {parquet_filepath}")
    print("Phase A Precomputation Completed successfully!")

if __name__ == "__main__":
    main()
