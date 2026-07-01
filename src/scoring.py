import numpy as np
import pandas as pd

def min_max_normalize(series):
    s_min = series.min()
    s_max = series.max()
    if s_max == s_min:
        return series * 0.0 + 1.0
    return (series - s_min) / (s_max - s_min)

def compute_composite_score(df, weights_config):
    """Computes composite score for candidate features dataframe.
    
    Weights configuration:
    weights:
      technical_fit: 0.30
      semantic_lexical_fit: 0.15
      career_quality: 0.20
      location_fit: 0.10
      behavioral_readiness: 0.10
      trust_score: 0.15
    """
    w = weights_config.get("weights", {})
    sub_w = weights_config.get("subweights", {}).get("semantic_lexical", {})
    
    # 1. Technical Fit
    # mandatory_skill_coverage, preferred_skill_coverage, avg_skill_trust, retrieval_ranking_years
    ret_rank_years_norm = np.minimum(1.0, df["retrieval_ranking_years"] / 5.0)
    technical_fit = (
        0.4 * df["mandatory_skill_coverage"] +
        0.2 * df["preferred_skill_coverage"] +
        0.2 * df["avg_skill_trust"] +
        0.2 * ret_rank_years_norm
    )
    
    # 2. Semantic Lexical Fit (needs normalization across pool)
    emb_sim_norm = min_max_normalize(df["embedding_similarity"])
    bm25_norm = min_max_normalize(df["bm25_score"])
    
    w_emb = sub_w.get("embedding_similarity", 0.6)
    w_bm25 = sub_w.get("bm25_score", 0.4)
    
    semantic_lexical_fit = w_emb * emb_sim_norm + w_bm25 * bm25_norm
    
    # 3. Career Quality
    # product_company_ratio, career_stability (months), title_chaser_score
    stability_norm = np.minimum(1.0, df["career_stability"] / 36.0) # 36 months ideal tenure
    anti_chaser = 1.0 - np.minimum(1.0, df["title_chaser_score"] / 2.0)
    
    career_quality = (
        0.4 * df["product_company_ratio"] +
        0.4 * stability_norm +
        0.2 * anti_chaser
    )
    
    # 4. Location Fit
    location_fit = df["location_fit_score"]
    
    # 5. Behavioral Readiness
    behavioral_readiness = df["behavioral_readiness"]
    
    # 6. Trust Score
    trust_score = 1.0 - df["honeypot_risk"]
    
    # Composite (Weighted Sum)
    w_tech = w.get("technical_fit", 0.30)
    w_sem = w.get("semantic_lexical_fit", 0.15)
    w_career = w.get("career_quality", 0.20)
    w_loc = w.get("location_fit", 0.10)
    w_beh = w.get("behavioral_readiness", 0.10)
    w_trust = w.get("trust_score", 0.15)
    
    weighted_sum = (
        w_tech * technical_fit +
        w_sem * semantic_lexical_fit +
        w_career * career_quality +
        w_loc * location_fit +
        w_beh * behavioral_readiness +
        w_trust * trust_score
    )
    
    # Calculate sum of all weights to normalize score to 1.0 (100% max)
    total_weight = w_tech + w_sem + w_career + w_loc + w_beh + w_trust
    
    # Normalize score by dividing the weighted sum by total weight
    composite = weighted_sum / max(1e-5, total_weight)
    
    return composite
