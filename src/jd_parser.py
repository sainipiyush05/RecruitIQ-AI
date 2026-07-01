import re
from typing import Dict, Any, List

def parse_job_description(text: str, skill_aliases: Dict[str, List[str]]) -> Dict[str, Any]:
    """
    Parses unstructured Job Description text using rule-based heuristics.
    Identifies:
      - mandatory_skills
      - preferred_skills
      - ideal_profile_text
      - location_preference
      - notice_period_preference
    """
    if not text:
        text = ""

    # Clean text and lower case
    text_clean = text.lower()
    
    # 1. Skill Extraction
    # Map lowercase terms to canonical skill names
    skill_map = {}
    for canonical, aliases in skill_aliases.items():
        skill_map[canonical.lower()] = canonical
        for alias in aliases:
            skill_map[alias.lower()] = canonical

    # Split text into sentences for sentence-level context analysis
    # Split by periods/exclamation/question followed by space, or newline
    sentences = re.split(r'(?<=[.!?])\s+|\n+', text)
    
    preferred_keywords = ["preferred", "nice to have", "plus", "desirable", "good to have", "advantage", "bonus", "optional"]
    preferred_sentences = []
    for sentence in sentences:
        s_lower = sentence.lower()
        if any(kw in s_lower for kw in preferred_keywords):
            preferred_sentences.append(s_lower)

    found_skills = set()
    mandatory_skills = []
    preferred_skills = []

    # Helper function to find skills in text
    for term, canonical in skill_map.items():
        # Match using word boundaries if the term contains only word characters, else literal match
        if re.match(r'^\w+$', term):
            pattern = rf"\b{re.escape(term)}\b"
        else:
            pattern = re.escape(term)
            
        if re.search(pattern, text_clean):
            found_skills.add(canonical)

    # Sort them into mandatory vs preferred
    for skill in found_skills:
        # Get all aliases for the skill
        skill_aliases_list = [skill.lower()]
        for canonical, aliases in skill_aliases.items():
            if canonical == skill:
                skill_aliases_list.extend([a.lower() for a in aliases])

        # Check if any alias is mentioned in a sentence with preferred keywords
        is_preferred = False
        for sent in preferred_sentences:
            if any(alias in sent for alias in skill_aliases_list):
                is_preferred = True
                break
                
        if is_preferred:
            preferred_skills.append(skill)
        else:
            mandatory_skills.append(skill)

    # Fallbacks if no skills detected
    if not mandatory_skills and not preferred_skills:
        # Default to some standard skills from our configs
        mandatory_skills = ["python"]
        if "sentence-transformers" in skill_aliases:
            mandatory_skills.append("sentence-transformers")

    # 2. Location Extraction
    cities = {
        "pune": "Pune",
        "noida": "Noida",
        "hyderabad": "Hyderabad",
        "mumbai": "Mumbai",
        "bangalore": "Bangalore",
        "bengaluru": "Bangalore",
        "delhi": "Delhi NCR",
        "gurgaon": "Gurgaon",
        "gurugram": "Gurgaon",
        "ncr": "Delhi NCR",
        "chennai": "Chennai"
    }

    ideal_locations = []
    acceptable_locations = []

    # Scan text for cities
    for key, name in cities.items():
        if re.search(rf"\b{re.escape(key)}\b", text_clean):
            # Pune and Noida are traditionally the ideal cities in this codebase structure
            if name in ["Pune", "Noida"]:
                if name not in ideal_locations:
                    ideal_locations.append(name)
            else:
                if name not in acceptable_locations:
                    acceptable_locations.append(name)

    # Clean up locations and use defaults if empty
    if not ideal_locations and not acceptable_locations:
        ideal_locations = ["Pune", "Noida"]
        acceptable_locations = ["Hyderabad", "Mumbai", "Bangalore", "Delhi NCR", "Gurgaon"]
    elif not ideal_locations:
        # If we found other cities but no ideal ones, promote the first acceptable one to ideal
        if acceptable_locations:
            ideal_locations = [acceptable_locations.pop(0)]
        else:
            ideal_locations = ["Pune", "Noida"]

    # 3. Notice Period Extraction
    notice_days = 30  # Default fallback
    
    # Check for immediate joiners first
    if any(keyword in text_clean for keyword in ["immediate join", "join immediately", "immediate joiner", "join asap", "available immediately"]):
        notice_days = 15
    else:
        # Look for numbers of days
        days_match = re.search(r"(\d+)\s*(?:-|\s+to\s+)?\d*\s*days?\s+(?:notice|join)", text_clean)
        if not days_match:
            days_match = re.search(r"(?:notice|join)\D*(\d+)\s*days?", text_clean)
        
        if days_match:
            try:
                notice_days = int(days_match.group(1))
            except ValueError:
                pass
        else:
            # Check for months (e.g. "1 month notice", "2 months notice")
            months_match = re.search(r"(\d+)\s*months?\s+(?:notice|join)", text_clean)
            if not months_match:
                months_match = re.search(r"(?:notice|join)\D*(\d+)\s*months?", text_clean)
            if months_match:
                try:
                    notice_days = int(months_match.group(1)) * 30
                except ValueError:
                    pass

    # 4. Ideal Profile Description Extraction
    # Clean sentences and extract those describing candidate requirements/profile
    profile_sentences = []
    for sentence in sentences:
        s_clean = sentence.strip()
        if not s_clean:
            continue
        s_lower = s_clean.lower()
        # Look for profile description patterns
        if any(keyword in s_lower for keyword in ["looking for", "ideal candidate", "role is", "requirements", "experience in", "years of experience", "responsible for"]):
            profile_sentences.append(s_clean)

    if profile_sentences:
        ideal_profile_text = " ".join(profile_sentences[:3])
    else:
        # Fallback to the first few readable sentences
        ideal_profile_text = " ".join([s.strip() for s in sentences if len(s.strip()) > 15][:3])

    # Limit size of summary
    if len(ideal_profile_text) > 400:
        ideal_profile_text = ideal_profile_text[:397] + "..."

    return {
        "mandatory_skills": mandatory_skills,
        "preferred_skills": preferred_skills,
        "ideal_profile_text": ideal_profile_text,
        "location_preference": {
            "ideal": ideal_locations,
            "acceptable": acceptable_locations,
            "outside_india": "case_by_case_no_visa"
        },
        "notice_period_preference": {
            "ideal_max_days": notice_days,
            "buyout_max_days": notice_days
        }
    }
