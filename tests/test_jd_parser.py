import pytest
from src.jd_parser import parse_job_description

def test_parse_job_description():
    skill_aliases = {
        "python": ["py"],
        "sentence-transformers": ["sentence transformers"],
        "embeddings": ["embedding"]
    }
    
    jd_text = """
    We are looking for a Python developer with experience in sentence-transformers and embeddings.
    Must have skills in Python.
    Nice to have: experience in embeddings and sentence transformers.
    The ideal candidate should have 5 years of experience in ML/AI.
    Notice period of 30 days.
    Location: Pune or Noida. Hyderabad is also acceptable.
    """
    
    parsed = parse_job_description(jd_text, skill_aliases)
    
    # Python should be mandatory because of "Must have skills in Python"
    assert "python" in parsed["mandatory_skills"]
    
    # sentence-transformers and embeddings are under "Nice to have"
    assert "sentence-transformers" in parsed["preferred_skills"]
    assert "embeddings" in parsed["preferred_skills"]
    
    # Pune and Noida should be ideal locations
    assert "Pune" in parsed["location_preference"]["ideal"]
    assert "Noida" in parsed["location_preference"]["ideal"]
    
    # Hyderabad is acceptable
    assert "Hyderabad" in parsed["location_preference"]["acceptable"]
    
    # Notice period
    assert parsed["notice_period_preference"]["ideal_max_days"] == 30
    
    # Ideal profile text matches years of experience sentence
    assert "years of experience" in parsed["ideal_profile_text"].lower()
