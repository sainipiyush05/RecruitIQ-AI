import datetime
import numpy as np
import pandas as pd
from src.data_cleaning import DataCleaner

def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return None

class FeatureEngineer:
    def __init__(self, cleaner, jd_profile):
        self.cleaner = cleaner
        self.jd_profile = jd_profile
        
        self.mandatory_skills = [s.lower() for s in jd_profile.get("mandatory_skills", [])]
        self.preferred_skills = [s.lower() for s in jd_profile.get("preferred_skills", [])]
        
        # Keyword sets
        self.ai_ml_kws = {"ml", "machine learning", "ai", "deep learning", "neural", "nlp", "nlp/ir", "natural language",
                          "computer vision", "speech", "robotics", "retrieval", "ranking", "search", "recsys", "recommendation"}
        self.retrieval_ranking_kws = {"retrieval", "ranking", "search", "recsys", "recommendation", "vector search",
                                      "dense retrieval", "hybrid search", "bm25", "information retrieval"}

    def engineer_candidate_features(self, cand):
        # 1. Clean Skills
        skills_raw = cand.get("skills", [])
        cleaned_skills = []
        for sk in skills_raw:
            name = sk.get("name", "")
            canon_name = self.cleaner.normalize_skill_name(name)
            cleaned_skills.append({
                "name": canon_name.lower(),
                "original_name": name,
                "proficiency": sk.get("proficiency", "beginner"),
                "endorsements": sk.get("endorsements", 0),
                "duration_months": sk.get("duration_months", 0)
            })
            
        # Skill coverage
        skill_names = {s["name"] for s in cleaned_skills}
        matched_mandatory = [s for s in self.mandatory_skills if s in skill_names]
        matched_preferred = [s for s in self.preferred_skills if s in skill_names]
        
        mandatory_coverage = len(matched_mandatory) / max(1, len(self.mandatory_skills))
        preferred_coverage = len(matched_preferred) / max(1, len(self.preferred_skills))
        
        # Skill trust scores and assessments
        signals = cand.get("redrob_signals", {})
        assessment_scores = signals.get("skill_assessment_scores", {})
        
        skill_trust_list = []
        for sk in cleaned_skills:
            prof = sk["proficiency"]
            dur = sk["duration_months"]
            endors = sk["endorsements"]
            name = sk["name"]
            
            # Base score by proficiency
            base_prof = {"expert": 1.0, "advanced": 0.8, "intermediate": 0.5, "beginner": 0.2}.get(prof, 0.2)
            
            # Duration factor (log scale or ratio)
            dur_factor = min(1.0, dur / 12.0) if dur > 0 else 0.1
            
            # Endorsement factor
            endors_factor = 0.5 + 0.5 * min(1.0, endors / 10.0)
            
            # Assessment score factor
            assess_score = assessment_scores.get(sk["original_name"]) or assessment_scores.get(name)
            if assess_score is not None:
                assess_factor = assess_score / 100.0
            else:
                assess_factor = 1.0 # no penalty if not assessed
                
            trust_score = base_prof * dur_factor * endors_factor * assess_factor
            skill_trust_list.append(trust_score)
            
        avg_skill_trust = np.mean(skill_trust_list) if skill_trust_list else 0.0

        # 2. Career History Analysis
        career = cand.get("career_history", [])
        total_months = 0
        ai_ml_months = 0
        retrieval_ranking_months = 0
        product_months = 0
        consulting_months = 0
        
        companies_seen = set()
        switches = 0
        seniority_levels = []
        
        for job in career:
            comp = job.get("company", "")
            title = job.get("title", "")
            desc = job.get("description", "") or ""
            dur = job.get("duration_months", 0)
            
            total_months += dur
            
            # Company classification
            comp_class = self.cleaner.classify_company(comp, job.get("industry", ""), job.get("company_size", ""))
            if comp_class == "product":
                product_months += dur
            elif comp_class == "consulting":
                consulting_months += dur
                
            # Job title normalization
            norm_title = self.cleaner.normalize_title(title)
            seniority_levels.append(norm_title["seniority"])
            
            # Track company switches
            if comp and comp.lower().strip() not in companies_seen:
                companies_seen.add(comp.lower().strip())
                if len(companies_seen) > 1:
                    switches += 1
                    
            # Text matching for AI/ML and retrieval/ranking
            combined_job_text = f"{title} {desc}".lower()
            
            is_aiml = any(kw in combined_job_text for kw in self.ai_ml_kws)
            if is_aiml:
                ai_ml_months += dur
                
            is_ret_rank = any(kw in combined_job_text for kw in self.retrieval_ranking_kws)
            if is_ret_rank:
                retrieval_ranking_months += dur
                
        total_years = total_months / 12.0
        ai_ml_years = ai_ml_months / 12.0
        retrieval_ranking_years = retrieval_ranking_months / 12.0
        
        # Product company ratio
        product_ratio = product_months / max(1, total_months)
        consulting_ratio = consulting_months / max(1, total_months)
        
        # Career stability (avg tenure in months)
        avg_tenure = total_months / max(1, len(career))
        
        # Title chaser check: escalation of seniority vs switches & tenure
        # Seniority hierarchy: junior=0, senior=1, lead=2, director=3
        seniority_map = {"junior": 0, "senior": 1, "lead": 2, "director": 3}
        numerical_seniority = [seniority_map.get(s, 0) for s in seniority_levels]
        
        title_chaser_score = 0.0
        if switches > 0 and total_years > 0:
            # Escalation rate
            max_sen = max(numerical_seniority) if numerical_seniority else 0
            min_sen = min(numerical_seniority) if numerical_seniority else 0
            escalation = max(0, max_sen - min_sen)
            title_chaser_score = (escalation * switches) / total_years
            
        # 3. Location preference score
        profile = cand.get("profile", {})
        cand_loc = profile.get("location", "") or ""
        cand_country = profile.get("country", "") or ""
        
        loc_pref = self.jd_profile.get("location_preference", {})
        ideal_locs = [l.lower() for l in loc_pref.get("ideal", [])]
        acceptable_locs = [l.lower() for l in loc_pref.get("acceptable", [])]
        
        loc_fit_score = 0.0
        cand_loc_lower = cand_loc.lower().strip()
        
        if any(il in cand_loc_lower for il in ideal_locs):
            loc_fit_score = 1.0
        elif any(al in cand_loc_lower for al in acceptable_locs):
            loc_fit_score = 0.7
        elif signals.get("willing_to_relocate", False):
            loc_fit_score = 0.5
        elif cand_country.lower().strip() == "india":
            loc_fit_score = 0.3
        else:
            loc_fit_score = 0.0 # outside India, visa case-by-case
            
        # 4. Notice period score
        notice_days = signals.get("notice_period_days", 90)
        # smooth decay: <= 30 days is 1.0, decay to 0 at 180 days
        if notice_days <= 30:
            notice_period_score = 1.0
        elif notice_days >= 180:
            notice_period_score = 0.0
        else:
            notice_period_score = 1.0 - (notice_days - 30) / 150.0
            
        # 5. Recency / Activity Score
        last_active = parse_date(signals.get("last_active_date", ""))
        recency_days = 365 # default if no data
        if last_active:
            # Assume local reference date is 2026-06-30 (from current local time)
            ref_date = datetime.date(2026, 6, 30)
            recency_days = max(0, (ref_date - last_active).days)
            
        # Normalize recency to 0-1 (active within 30 days = 1.0, decays to 0 at 365 days)
        if recency_days <= 30:
            recency_score = 1.0
        elif recency_days >= 365:
            recency_score = 0.0
        else:
            recency_score = 1.0 - (recency_days - 30) / 335.0
            
        # 6. Behavioral readiness
        open_to_work = 1.0 if signals.get("open_to_work_flag", False) else 0.0
        resp_rate = signals.get("recruiter_response_rate", 0.0)
        # If response rate is -1 (no data), treat as 0.5 (neutral)
        if resp_rate == -1 or resp_rate is None:
            resp_rate = 0.5
            
        interview_rate = signals.get("interview_completion_rate", 0.0)
        if interview_rate == -1 or interview_rate is None:
            interview_rate = 0.5
            
        saved_30d = signals.get("saved_by_recruiters_30d", 0)
        saved_score = min(1.0, saved_30d / 10.0)
        
        behavioral_readiness = (
            0.3 * open_to_work +
            0.3 * resp_rate +
            0.2 * interview_rate +
            0.1 * recency_score +
            0.1 * saved_score
        )
        
        # Profile completeness
        completeness = signals.get("profile_completeness_score", 0.0) / 100.0

        # Return dict of engineered features
        features = {
            "candidate_id": cand["candidate_id"],
            "years_of_experience": profile.get("years_of_experience") or total_years,
            "actual_years_exp": total_years,
            "ai_ml_years": ai_ml_years,
            "retrieval_ranking_years": retrieval_ranking_years,
            "product_company_ratio": product_ratio,
            "consulting_company_ratio": consulting_ratio,
            "career_stability": avg_tenure,
            "title_chaser_score": title_chaser_score,
            "mandatory_skill_coverage": mandatory_coverage,
            "preferred_skill_coverage": preferred_coverage,
            "avg_skill_trust": avg_skill_trust,
            "num_skills": len(cleaned_skills),
            "location_fit_score": loc_fit_score,
            "notice_period_score": notice_period_score,
            "recency_days": recency_days,
            "behavioral_readiness": behavioral_readiness,
            "profile_completeness_score": completeness,
            "github_activity_score": signals.get("github_activity_score", -1),
            # Evidence elements saved for reasoning assembly
            "evidence_skills": [sk["name"] for sk in cleaned_skills],
            "evidence_matched_mandatory": matched_mandatory,
            "evidence_matched_preferred": matched_preferred,
            "evidence_seniority": seniority_levels[0] if seniority_levels else "junior",
            "evidence_recent_company": career[0].get("company", "") if career else "",
            "evidence_recent_title": career[0].get("title", "") if career else "",
            "evidence_notice_days": notice_days,
            "evidence_response_rate": signals.get("recruiter_response_rate", -1)
        }
        return features
