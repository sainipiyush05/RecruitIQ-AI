import datetime
import numpy as np

def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return None

def check_expert_no_duration(cand, min_months=6):
    """Rule 1: Expert proficiency with duration < min_months."""
    skills = cand.get("skills", [])
    for sk in skills:
        if sk.get("proficiency") == "expert" and sk.get("duration_months", 0) < min_months:
            return 1.0
    return 0.0

def check_exp_sum_mismatch(cand, max_deviation=0.25):
    """Rule 2: Sum of career durations deviates from profile years_of_experience."""
    profile = cand.get("profile", {})
    claimed_years = profile.get("years_of_experience", 0.0)
    
    career = cand.get("career_history", [])
    sum_months = sum(job.get("duration_months", 0) for job in career)
    sum_years = sum_months / 12.0
    
    if claimed_years == 0:
        return 1.0 if sum_years > 0.5 else 0.0
        
    deviation = abs(sum_years - claimed_years) / claimed_years
    return 1.0 if deviation > max_deviation else 0.0

def check_overlapping_timeline(cand):
    """Rule 3: Multiple current jobs, end_date < start_date, or heavy overlapping."""
    career = cand.get("career_history", [])
    current_count = sum(1 for job in career if job.get("is_current", False))
    if current_count > 1:
        return 1.0
        
    intervals = []
    ref_date = datetime.date(2026, 6, 30)
    
    for job in career:
        start = parse_date(job.get("start_date"))
        end = parse_date(job.get("end_date"))
        
        if start is None:
            continue
            
        if job.get("is_current", False) or end is None:
            end = ref_date
            
        if end < start:
            return 1.0 # Impossible end_date < start_date
            
        intervals.append((start, end))
        
    # Check for overlapping full-time intervals
    intervals.sort(key=lambda x: x[0])
    for i in range(len(intervals) - 1):
        end_current = intervals[i][1]
        start_next = intervals[i+1][0]
        # Allow small overlap of 30 days for transitions
        if end_current > start_next + datetime.timedelta(days=30):
            return 1.0
            
    return 0.0

def check_education_career_impossibility(cand):
    """Rule 4: Education end year < start year, or education end year after first career start."""
    education = cand.get("education", [])
    career = cand.get("career_history", [])
    
    for edu in education:
        start_yr = edu.get("start_year")
        end_yr = edu.get("end_year")
        if start_yr and end_yr and end_yr < start_yr:
            return 1.0
            
    if not career or not education:
        return 0.0
        
    # Get first career start year
    career_starts = []
    for job in career:
        sd = parse_date(job.get("start_date"))
        if sd:
            career_starts.append(sd.year)
            
    if not career_starts:
        return 0.0
        
    first_career_year = min(career_starts)
    
    for edu in education:
        end_yr = edu.get("end_year")
        # If education ended more than 2 years after starting first job
        if end_yr and end_yr > first_career_year + 2:
            return 1.0
            
    return 0.0

def check_skill_duration_exceeds_career(cand):
    """Rule 5: Skill duration exceeds years of experience significantly."""
    profile = cand.get("profile", {})
    claimed_years = profile.get("years_of_experience", 0.0)
    max_duration_months = claimed_years * 12.0 * 1.2 # allow 20% buffer
    
    skills = cand.get("skills", [])
    for sk in skills:
        if sk.get("duration_months", 0) > max_duration_months:
            return 1.0
    return 0.0

def check_assessment_claim_mismatch(cand, min_score=35):
    """Rule 6: Expert/advanced skill but assessment score < min_score."""
    skills = cand.get("skills", [])
    signals = cand.get("redrob_signals", {})
    assessments = signals.get("skill_assessment_scores", {}) or {}
    
    for sk in skills:
        name = sk.get("name", "")
        prof = sk.get("proficiency", "")
        if prof in ["expert", "advanced"]:
            score = assessments.get(name)
            if score is not None and score < min_score:
                return 1.0
    return 0.0

def check_stacked_stuffing(cand, min_months=6, min_score=35):
    """Rule 7: >= 4 skills trigger check 1 (expert no duration) or check 6 (assessment mismatch)."""
    skills = cand.get("skills", [])
    signals = cand.get("redrob_signals", {})
    assessments = signals.get("skill_assessment_scores", {}) or {}
    
    triggers = 0
    for sk in skills:
        name = sk.get("name", "")
        prof = sk.get("proficiency", "")
        dur = sk.get("duration_months", 0)
        
        t1 = (prof == "expert" and dur < min_months)
        
        score = assessments.get(name)
        t6 = (prof in ["expert", "advanced"] and score is not None and score < min_score)
        
        if t1 or t6:
            triggers += 1
            
    return 1.0 if triggers >= 4 else 0.0

def check_profile_completeness_vs_polish(cand):
    """Rule 8: High skill count (> 15) but very low profile completeness (< 40%)."""
    skills = cand.get("skills", [])
    signals = cand.get("redrob_signals", {})
    completeness = signals.get("profile_completeness_score", 100.0)
    
    if len(skills) > 15 and completeness < 40.0:
        return 1.0
    return 0.0

def check_sparse_evidence_semantic(cand, embedding_similarity, mandatory_coverage, avg_skill_trust):
    """Rule 9: High embedding similarity but low skill coverage or low trust."""
    # This is run after scoring starts since it needs embedding_similarity.
    # Top decile similarity (e.g. > 0.8) and low skill coverage (e.g. < 0.2) or avg skill trust < 0.3
    if embedding_similarity > 0.75:
        if mandatory_coverage < 0.2 or avg_skill_trust < 0.3:
            return 1.0
    return 0.0

def compute_honeypot_risk(cand, engineered_features, embedding_similarity=0.0):
    """Combines all rules to compute a composite honeypot risk score between 0.0 and 1.0."""
    r1 = check_expert_no_duration(cand)
    r2 = check_exp_sum_mismatch(cand)
    r3 = check_overlapping_timeline(cand)
    r4 = check_education_career_impossibility(cand)
    r5 = check_skill_duration_exceeds_career(cand)
    r6 = check_assessment_claim_mismatch(cand)
    r7 = check_stacked_stuffing(cand)
    r8 = check_profile_completeness_vs_polish(cand)
    
    mandatory_cov = engineered_features["mandatory_skill_coverage"]
    avg_trust = engineered_features["avg_skill_trust"]
    r9 = check_sparse_evidence_semantic(cand, embedding_similarity, mandatory_cov, avg_trust)
    
    # Weight the flags (some are very serious, others indicate minor risk)
    # Binary triggers: if any is 1.0, we get a risk score.
    # We sum them up and map to a 0-1 scale.
    triggers = [r1, r2, r3, r4, r5, r6, r7, r8, r9]
    num_triggers = sum(triggers)
    
    # Soft threshold: if 1 trigger, mild risk; if 2+ triggers, severe risk.
    if num_triggers == 0:
        return 0.0
    elif num_triggers == 1:
        return 0.2
    elif num_triggers == 2:
        return 0.5
    else:
        return 0.95
