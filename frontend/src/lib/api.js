const API_BASE = 'http://localhost:8000';

export async function fetchConfigs() {
  const res = await fetch(`${API_BASE}/api/configs`);
  if (!res.ok) {
    throw new Error('Failed to fetch configurations from server');
  }
  return res.json();
}

export async function updateConfigs(configs) {
  const res = await fetch(`${API_BASE}/api/configs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configs)
  });
  if (!res.ok) {
    throw new Error('Failed to update configurations on server');
  }
  return res.json();
}

export async function analyzeJd(text) {
  const res = await fetch(`${API_BASE}/api/analyze_jd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to analyze Job Description');
  }
  return res.json();
}

export async function rankCandidates(candidates, limit = 100) {
  const res = await fetch(`${API_BASE}/api/rank?limit=${limit}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(candidates)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to score candidate list');
  }
  return res.json();
}

export async function uploadAndRank(file, limit = 100) {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_BASE}/api/upload_rank?limit=${limit}`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to process candidate upload file');
  }
  return res.json();
}

export async function rankLocalCandidates(filepath, limit = 100) {
  const res = await fetch(`${API_BASE}/api/rank_local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filepath, limit })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to rank local candidates database');
  }
  return res.json();
}
