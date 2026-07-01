import yaml
import re
from rapidfuzz import process, fuzz

def load_yaml(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

class DataCleaner:
    def __init__(self, skill_aliases_path, title_mapping_path, company_mapping_path):
        self.skill_aliases = load_yaml(skill_aliases_path) or {}
        self.title_mapping = load_yaml(title_mapping_path) or {}
        self.company_mapping = load_yaml(company_mapping_path) or {}
        
        # Build inverted skill aliases map
        self.skill_map = {}
        for canonical, aliases in self.skill_aliases.items():
            self.skill_map[canonical.lower()] = canonical
            for alias in aliases:
                self.skill_map[alias.lower()] = canonical
                
    def normalize_skill_name(self, name):
        if not name:
            return ""
        name_lower = name.strip().lower()
        # Direct lookup
        if name_lower in self.skill_map:
            return self.skill_map[name_lower]
        
        # Fuzzy match if direct lookup fails
        choices = list(self.skill_map.keys())
        match = process.extractOne(name_lower, choices, scorer=fuzz.ratio, score_cutoff=85)
        if match:
            return self.skill_map[match[0]]
            
        return name.strip()

    def normalize_title(self, title):
        if not title:
            return {"seniority": "junior", "category": "swe"}
        
        title_lower = title.lower()
        
        # Determine seniority
        seniority = "junior" # default
        for level, keywords in self.title_mapping.get("seniority_levels", {}).items():
            for kw in keywords:
                if kw in title_lower:
                    seniority = level
                    break
            if seniority != "junior":
                break
                
        # Determine functional category
        category = "swe" # default
        for cat, keywords in self.title_mapping.get("functional_categories", {}).items():
            for kw in keywords:
                if kw in title_lower:
                    category = cat
                    break
            if category != "swe":
                break
                
        return {"seniority": seniority, "category": category}

    def classify_company(self, company_name, current_industry="", company_size=""):
        if not company_name:
            return "unknown"
        
        comp_lower = company_name.lower().strip()
        
        # Check explicit consulting companies list
        consulting_list = self.company_mapping.get("consulting_companies", [])
        for c in consulting_list:
            if c in comp_lower:
                return "consulting"
                
        # Heuristics
        # If company size is very large and industry is IT/Services, often consulting
        if current_industry:
            ind_lower = current_industry.lower()
            if "consulting" in ind_lower or "it services" in ind_lower or "outsourcing" in ind_lower:
                return "consulting"
                
        # By size
        if company_size == "10001+":
            # If not explicitly known, default enterprise/unknown, but check keywords
            if any(k in comp_lower for k in ["services", "technologies", "global", "solutions"]):
                return "consulting"
            return "enterprise"
            
        return "product" # default assumption or "unknown" if size is missing
