export const toNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

export const getTopSkills = (cand, jdProfile) => {
  if (!cand.skills || cand.skills.length === 0) return "N/A";
  const jdSkills = new Set([
    ...(jdProfile?.mandatory_skills || []),
    ...(jdProfile?.preferred_skills || [])
  ].map(s => s.toLowerCase()));
  
  const matched = cand.skills
    .filter(s => jdSkills.has(s.name.toLowerCase()))
    .map(s => s.name);
    
  if (matched.length > 0) return matched.slice(0, 5).join(", ");
  
  // Fallback to highest proficiency/endorsed skills
  return cand.skills.slice(0, 3).map(s => s.name).join(", ");
};

export const getExperienceSummary = (cand) => {
  const totalYears = cand.features?.years_of_experience || cand.profile?.years_of_experience || 0;
  const currentTitle = cand.profile?.current_title || "";
  const careerCount = cand.career_history?.length || 0;
  
  if (currentTitle) {
    return `${toNum(totalYears).toFixed(1)} years (${currentTitle} & ${careerCount} other role${careerCount !== 1 ? 's' : ''})`;
  }
  return `${toNum(totalYears).toFixed(1)} years of experience`;
};

export const CHART_COLORS = ['#C6963E', '#4C7A5C', '#A23E32', '#8A8375'];
