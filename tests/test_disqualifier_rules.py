import pytest
from src.disqualifier_rules import (
    evaluate_pure_research_only,
    evaluate_langchain_only_recent,
    evaluate_architecture_stale_code,
    evaluate_cv_speech_robotics_only,
    evaluate_consulting_only_career,
    evaluate_closed_source_no_validation,
    evaluate_title_chaser
)

def test_pure_research_only():
    # Only academic keywords, no production keywords -> trigger (returns 0.2)
    cand_trigger = {
        "career_history": [
            {"title": "PhD Student", "description": "Conducted research at academic lab, published paper, teaching assistant.", "duration_months": 36}
        ]
    }
    # Has academic but also production keywords -> no trigger (returns 1.0)
    cand_clean = {
        "career_history": [
            {"title": "PhD Student", "description": "Conducted research at academic lab.", "duration_months": 36},
            {"title": "ML Engineer", "description": "Deployed models to production at scale.", "duration_months": 24}
        ]
    }
    assert evaluate_pure_research_only(cand_trigger) == 0.2
    assert evaluate_pure_research_only(cand_clean) == 1.0

def test_consulting_only_career():
    # 100% consulting -> trigger (returns 0.2)
    feats_trigger = {"consulting_company_ratio": 1.0, "actual_years_exp": 5.0}
    # 50% consulting -> no trigger (returns 1.0)
    feats_clean = {"consulting_company_ratio": 0.5, "actual_years_exp": 5.0}
    assert evaluate_consulting_only_career(feats_trigger) == 0.2
    assert evaluate_consulting_only_career(feats_clean) == 1.0

def test_cv_speech_robotics_only():
    # Vision keywords, no nlp/ir -> trigger (returns 0.5)
    cand_trigger = {
        "skills": [
            {"name": "Computer Vision"},
            {"name": "YOLO"},
            {"name": "Image processing"}
        ]
    }
    # Vision + NLP -> no trigger (returns 1.0)
    cand_clean = {
        "skills": [
            {"name": "Computer Vision"},
            {"name": "NLP"},
            {"name": "Embeddings"}
        ]
    }
    assert evaluate_cv_speech_robotics_only(cand_trigger) == 0.5
    assert evaluate_cv_speech_robotics_only(cand_clean) == 1.0
