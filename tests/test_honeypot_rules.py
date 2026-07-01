import pytest
from src.honeypot_rules import (
    check_expert_no_duration,
    check_exp_sum_mismatch,
    check_overlapping_timeline,
    check_education_career_impossibility,
    check_skill_duration_exceeds_career,
    check_assessment_claim_mismatch,
    check_stacked_stuffing,
    check_profile_completeness_vs_polish
)

def test_expert_no_duration():
    # Expert but only 3 months -> trigger
    cand_trigger = {
        "skills": [{"name": "Python", "proficiency": "expert", "duration_months": 3}]
    }
    # Expert with 12 months -> no trigger
    cand_clean = {
        "skills": [{"name": "Python", "proficiency": "expert", "duration_months": 12}]
    }
    assert check_expert_no_duration(cand_trigger) == 1.0
    assert check_expert_no_duration(cand_clean) == 0.0

def test_exp_sum_mismatch():
    # Claimed 10 years, but career sum is 2 years (24 months) -> trigger
    cand_trigger = {
        "profile": {"years_of_experience": 10.0},
        "career_history": [
            {"duration_months": 12},
            {"duration_months": 12}
        ]
    }
    # Claimed 2 years, career sum is 2 years -> no trigger
    cand_clean = {
        "profile": {"years_of_experience": 2.0},
        "career_history": [
            {"duration_months": 12},
            {"duration_months": 12}
        ]
    }
    assert check_exp_sum_mismatch(cand_trigger) == 1.0
    assert check_exp_sum_mismatch(cand_clean) == 0.0

def test_overlapping_timeline():
    # Multiple current jobs -> trigger
    cand_multiple_current = {
        "career_history": [
            {"start_date": "2024-01-01", "is_current": True},
            {"start_date": "2024-06-01", "is_current": True}
        ]
    }
    # End date < Start date -> trigger
    cand_invalid_dates = {
        "career_history": [
            {"start_date": "2025-01-01", "end_date": "2024-01-01", "is_current": False}
        ]
    }
    # Standard non-overlapping timeline -> no trigger
    cand_clean = {
        "career_history": [
            {"start_date": "2023-01-01", "end_date": "2023-12-31", "is_current": False, "duration_months": 12},
            {"start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": False, "duration_months": 12}
        ]
    }
    assert check_overlapping_timeline(cand_multiple_current) == 1.0
    assert check_overlapping_timeline(cand_invalid_dates) == 1.0
    assert check_overlapping_timeline(cand_clean) == 0.0

def test_education_career_impossibility():
    # Degree ends in 2025, but career started in 2018 -> trigger
    cand_trigger = {
        "education": [{"start_year": 2021, "end_year": 2025}],
        "career_history": [
            {"start_date": "2018-01-01"}
        ]
    }
    # Education end_year < start_year -> trigger
    cand_edu_invalid = {
        "education": [{"start_year": 2025, "end_year": 2021}],
        "career_history": []
    }
    # Standard -> no trigger
    cand_clean = {
        "education": [{"start_year": 2015, "end_year": 2019}],
        "career_history": [
            {"start_date": "2019-06-01"}
        ]
    }
    assert check_education_career_impossibility(cand_trigger) == 1.0
    assert check_education_career_impossibility(cand_edu_invalid) == 1.0
    assert check_education_career_impossibility(cand_clean) == 0.0

def test_skill_duration_exceeds_career():
    # Claimed 2 years total exp, but Python skill has 10 years (120 months) -> trigger
    cand_trigger = {
        "profile": {"years_of_experience": 2.0},
        "skills": [{"name": "Python", "duration_months": 120}]
    }
    # python 1 year -> no trigger
    cand_clean = {
        "profile": {"years_of_experience": 2.0},
        "skills": [{"name": "Python", "duration_months": 12}]
    }
    assert check_skill_duration_exceeds_career(cand_trigger) == 1.0
    assert check_skill_duration_exceeds_career(cand_clean) == 0.0

def test_assessment_claim_mismatch():
    # Expert in Python, but assessment score is 20 (below 35) -> trigger
    cand_trigger = {
        "skills": [{"name": "Python", "proficiency": "expert"}],
        "redrob_signals": {"skill_assessment_scores": {"Python": 20}}
    }
    # Python expert with 80 -> no trigger
    cand_clean = {
        "skills": [{"name": "Python", "proficiency": "expert"}],
        "redrob_signals": {"skill_assessment_scores": {"Python": 80}}
    }
    assert check_assessment_claim_mismatch(cand_trigger) == 1.0
    assert check_assessment_claim_mismatch(cand_clean) == 0.0

def test_profile_completeness_vs_polish():
    # 20 skills but completeness is 30% -> trigger
    cand_trigger = {
        "skills": [{"name": f"Skill{i}"} for i in range(20)],
        "redrob_signals": {"profile_completeness_score": 30.0}
    }
    # 5 skills, completeness 90% -> no trigger
    cand_clean = {
        "skills": [{"name": f"Skill{i}"} for i in range(5)],
        "redrob_signals": {"profile_completeness_score": 90.0}
    }
    assert check_profile_completeness_vs_polish(cand_trigger) == 1.0
    assert check_profile_completeness_vs_polish(cand_clean) == 0.0
