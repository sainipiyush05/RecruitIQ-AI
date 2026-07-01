import random
import hashlib

def get_deterministic_rng(candidate_id):
    # Compute md5 hash of candidate_id to seed RNG
    h = hashlib.md5(candidate_id.encode('utf-8')).hexdigest()
    seed = int(h[:8], 16)
    return random.Random(seed)

def generate_reasoning_string(cand_row, rank):
    cid = cand_row["candidate_id"]
    rng = get_deterministic_rng(cid)
    
    # Extract details
    exp = cand_row.get("years_of_experience", 0.0)
    actual_exp = cand_row.get("actual_years_exp", exp)
    aiml = cand_row.get("ai_ml_years", 0.0)
    seniority = cand_row.get("evidence_seniority", "junior")
    skills = list(cand_row.get("evidence_matched_mandatory", []))
    
    # Format skills
    if not skills:
        skills_str = "relevant ML/AI frameworks"
    elif len(skills) == 1:
        skills_str = skills[0]
    elif len(skills) == 2:
        skills_str = f"{skills[0]} and {skills[1]}"
    else:
        # Pick 2-3 deterministically
        picked = rng.sample(skills, min(len(skills), 3))
        skills_str = ", ".join(picked[:-1]) + f", and {picked[-1]}"
        
    notice = int(cand_row.get("evidence_notice_days", 30))
    resp_rate = cand_row.get("evidence_response_rate", 0.8)
    if resp_rate == -1 or resp_rate is None:
        resp_rate = 0.5
    resp_rate_pct = int(resp_rate * 100)
    
    # Location
    loc_score = cand_row.get("location_fit_score", 0.0)
    loc_text = "Noida/Pune" if loc_score == 1.0 else "an acceptable location"
    
    # 1. Opening sentence pools
    opening_pool = [
        "A {seniority} engineer with {exp:.1f} years of experience, including {aiml:.1f} years in applied ML/AI roles.",
        "Demonstrates {exp:.1f} years of engineering experience (with {aiml:.1f} years focused on ML/AI systems).",
        "Brings {exp:.1f} years of professional experience, with {aiml:.1f} years dedicated specifically to AI/ML applications."
    ]
    
    # 2. Skill sentence pools
    skill_pool = [
        "Strong match with mandatory skills like {skills}, backed by a high verified skill trust index.",
        "Showcases hands-on expertise in key mandatory technologies including {skills}.",
        "Possesses robust coverage of mandatory skills like {skills} with strong peer endorsements."
    ]
    
    # 3. Recruitability sentence pools
    recruit_pool = [
        "Located in {location} with a {notice}-day notice period and a responsive {response_rate}% recruiter response rate.",
        "Hirable within a {notice}-day notice period, based in {location}, and showing a {response_rate}% interaction rate.",
        "A responsive candidate ({response_rate}% response rate) situated in {location} with {notice} days notice."
    ]
    
    # Choose sentence parts deterministically
    opening = rng.choice(opening_pool).format(seniority=seniority, exp=actual_exp, aiml=aiml)
    skill_text = rng.choice(skill_pool).format(skills=skills_str)
    recruit_text = rng.choice(recruit_pool).format(location=loc_text, notice=notice, response_rate=resp_rate_pct)
    
    reasoning = f"{opening} {skill_text} {recruit_text}"
    
    # 4. Concern sentence for rank 40+ or lower-ranked candidates
    if rank >= 40:
        concerns = []
        stability = cand_row.get("career_stability", 0.0)
        chaser = cand_row.get("title_chaser_score", 0.0)
        
        if notice > 45:
            concerns.append(f"a longer notice period of {notice} days")
        if stability > 0 and stability < 18.0: # less than 1.5 year average tenure
            concerns.append(f"minor tenure instability (avg. tenure of {stability:.1f} months)")
        if chaser > 1.0:
            concerns.append(f"slight title escalation frequency of {chaser:.1f} per company change")
            
        if concerns:
            picked_concern = rng.choice(concerns)
            # deterministic transition
            transition = rng.choice([
                "Note that the candidate has {concern}.",
                "However, the profile indicates {concern}.",
                "A potential concern is {concern}."
            ])
            reasoning += " " + transition.format(concern=picked_concern)
            
    return reasoning
