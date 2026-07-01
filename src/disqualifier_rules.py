import datetime

def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return None

def evaluate_pure_research_only(cand):
    """Rule: Entire career is academic/research lab terms, zero production language."""
    career = cand.get("career_history", [])
    if not career:
        return 1.0 # no history, neutral
        
    academic_keywords = {"academic", "university", "professor", "research lab", "teaching assistant", "postdoc", "phd student"}
    production_keywords = {"production", "shipped", "deployed", "users", "scale", "system", "product", "aws", "kubernetes", "cloud", "docker"}
    
    total_desc = ""
    for job in career:
        desc = (job.get("description", "") or "").lower()
        title = (job.get("title", "") or "").lower()
        total_desc += f" {title} {desc}"
        
    has_academic = any(kw in total_desc for kw in academic_keywords)
    has_production = any(kw in total_desc for kw in production_keywords)
    
    if has_academic and not has_production:
        return 0.2 # Strong down-weight (80% penalty)
    return 1.0

def evaluate_langchain_only_recent(cand, engineered_features):
    """Rule: AI skills concentrated in last 12 months & no pre-2022 ML/ranking experience."""
    career = cand.get("career_history", [])
    if not career:
        return 1.0
        
    # Check if there is any pre-2022 ML or ranking experience
    has_pre_2022_ml = False
    ai_ml_kws = {"ml", "machine learning", "ai", "deep learning", "neural", "nlp", "retrieval", "ranking", "search", "recsys"}
    
    for job in career:
        start_date = parse_date(job.get("start_date"))
        if start_date and start_date.year < 2022:
            combined_text = f"{job.get('title', '')} {job.get('description', '')}".lower()
            if any(kw in combined_text for kw in ai_ml_kws):
                has_pre_2022_ml = True
                break
                
    # If they have AI/ML years but none before 2022, check if they are langchain only recent
    if engineered_features.get("ai_ml_years", 0.0) > 0 and not has_pre_2022_ml:
        # Check if skills contain only recent frameworks
        skills = cand.get("skills", [])
        has_langchain = any("langchain" in sk.get("name", "").lower() for sk in skills)
        has_classic_ml = any(any(c in sk.get("name", "").lower() for c in ["xgboost", "scikit", "tensorflow", "pytorch", "sentence-transformers"]) for sk in skills)
        
        if has_langchain and not has_classic_ml:
            return 0.3 # Strong down-weight
            
    return 1.0

def evaluate_architecture_stale_code(cand, engineered_features):
    """Rule: Current title is architect/lead/head/director, current role > 18mo, lacks hands-on/coding."""
    career = cand.get("career_history", [])
    if not career:
        return 1.0
        
    current_jobs = [job for job in career if job.get("is_current", False)]
    if not current_jobs:
        # Check the most recent job
        current_jobs = [career[0]]
        
    job = current_jobs[0]
    title = (job.get("title", "") or "").lower()
    desc = (job.get("description", "") or "").lower()
    dur = job.get("duration_months", 0)
    
    is_architect_lead = any(kw in title for kw in ["architect", "lead", "head", "director", "manager"])
    
    if is_architect_lead and dur > 18:
        # Check if description lacks coding/development indicators
        coding_kws = {"python", "code", "coding", "hands-on", "develop", "implement", "write", "build", "programming", "sql"}
        has_coding = any(kw in desc for kw in coding_kws)
        if not has_coding:
            return 0.5 # Moderate down-weight
            
    return 1.0

def evaluate_cv_speech_robotics_only(cand):
    """Rule: Skill/industry set dominated by vision/speech/robotics with no NLP/IR/retrieval."""
    skills = cand.get("skills", [])
    if not skills:
        return 1.0
        
    vision_kws = {"vision", "computer vision", "image", "speech", "audio", "robotics", "yolo", "cnn", "opencv", "ros"}
    nlp_ir_kws = {"nlp", "natural language", "text", "retrieval", "search", "ranking", "recsys", "information retrieval", "embeddings"}
    
    vision_count = 0
    nlp_count = 0
    
    for sk in skills:
        name = sk.get("name", "").lower()
        if any(kw in name for kw in vision_kws):
            vision_count += 1
        if any(kw in name for kw in nlp_ir_kws):
            nlp_count += 1
            
    if vision_count > 0 and nlp_count == 0:
        return 0.5 # Moderate down-weight
    return 1.0

def evaluate_consulting_only_career(engineered_features):
    """Rule: 100% of career companies classified as consulting."""
    if engineered_features.get("consulting_company_ratio", 0.0) == 1.0 and engineered_features.get("actual_years_exp", 0.0) > 0:
        return 0.2 # Strong down-weight (explicit JD exclusion)
    return 1.0

def evaluate_closed_source_no_validation(cand, engineered_features):
    """Rule: 5+ years at private companies, github activity score == -1, no certs, no public signal."""
    total_years = engineered_features.get("years_of_experience", 0.0)
    github_score = engineered_features.get("github_activity_score", -1)
    certifications = cand.get("certifications", [])
    
    if total_years >= 5.0 and github_score == -1 and len(certifications) == 0:
        return 0.8 # Mild down-weight (20% penalty)
    return 1.0

def evaluate_title_chaser(engineered_features):
    """Rule: Rapid title escalation across short (<18mo) tenures."""
    chaser_score = engineered_features.get("title_chaser_score", 0.0)
    if chaser_score > 1.5: # 1.5 title changes per year with switches
        return 0.8 # Mild down-weight
    return 1.0

def compute_disqualifier_multiplier(cand, engineered_features):
    """Combines all disqualifier checks to return a composite multiplier between 0.0 and 1.0."""
    m_research = evaluate_pure_research_only(cand)
    m_langchain = evaluate_langchain_only_recent(cand, engineered_features)
    m_architect = evaluate_architecture_stale_code(cand, engineered_features)
    m_cv = evaluate_cv_speech_robotics_only(cand)
    m_consulting = evaluate_consulting_only_career(engineered_features)
    m_closed = evaluate_closed_source_no_validation(cand, engineered_features)
    m_chaser = evaluate_title_chaser(engineered_features)
    
    # Combined multiplier (multiplication of all penalties)
    return m_research * m_langchain * m_architect * m_cv * m_consulting * m_closed * m_chaser
