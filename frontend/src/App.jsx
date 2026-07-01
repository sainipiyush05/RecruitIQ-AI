import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Users, Percent, Activity, Search, Sparkles, 
  Settings, AlertTriangle, CheckCircle, ChevronRight, X, 
  Briefcase, GraduationCap, Award, Compass, Clock, MapPin, 
  User, Check, Info, RefreshCw, BarChart2, FileText, Download, ArrowRight, ArrowLeft
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

const API_BASE = 'http://localhost:8000';

const toNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

function App() {
  // Wizard flow steps: 'jd' | 'candidates' | 'results'
  const [activeStep, setActiveStep] = useState('jd');
  const [candidates, setCandidates] = useState([]);
  const [configs, setConfigs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  // JD States
  const [jdText, setJdText] = useState('');
  const [analyzedJd, setAnalyzedJd] = useState(null);
  const [jdLoading, setJdLoading] = useState(false);
  const [jdDragOver, setJdDragOver] = useState(false);
  
  // Candidate Upload States
  const [candDragOver, setCandDragOver] = useState(false);
  const [numCandidatesToDisplay, setNumCandidatesToDisplay] = useState(100);
  const [candFileName, setCandFileName] = useState('');
  const [rawUploadedCandidates, setRawUploadedCandidates] = useState([]);
  const [uploadMethod, setUploadMethod] = useState('upload'); // 'upload' | 'local'
  const [localFilePath, setLocalFilePath] = useState('data/candidates.jsonl');

  const jdFileInputRef = useRef(null);
  const candFileInputRef = useRef(null);

  // Load configs on startup
  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/configs`);
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
        if (data.jd_profile && !analyzedJd) {
          // Pre-populate with currently saved JD if user wants
          setAnalyzedJd({
            ...data.jd_profile,
            mandatory_skills: data.jd_profile.mandatory_skills?.join(', ') || '',
            preferred_skills: data.jd_profile.preferred_skills?.join(', ') || '',
            location_preference: {
              ...data.jd_profile.location_preference,
              ideal: data.jd_profile.location_preference?.ideal?.join(', ') || '',
              acceptable: data.jd_profile.location_preference?.acceptable?.join(', ') || ''
            }
          });
        }
      }
    } catch (err) {
      console.error('Error fetching configurations:', err);
    }
  };

  const saveConfigs = async (newConfigs) => {
    try {
      const res = await fetch(`${API_BASE}/api/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfigs)
      });
      if (res.ok) {
        setConfigs(newConfigs);
        // If we have candidates, re-rank them with new weights
        if (candidates.length > 0) {
          reRank(newConfigs);
        }
      }
    } catch (err) {
      console.error('Error updating configurations:', err);
    }
  };

  // JD Analysis Handler
  const handleAnalyzeJd = async (textToAnalyze) => {
    const rawText = textToAnalyze || jdText;
    if (!rawText.trim()) {
      alert("Please paste some Job Description text or upload a file first.");
      return;
    }
    setJdLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/analyze_jd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyzedJd({
          mandatory_skills: data.mandatory_skills?.join(', ') || '',
          preferred_skills: data.preferred_skills?.join(', ') || '',
          ideal_profile_text: data.ideal_profile_text || '',
          location_preference: {
            ideal: data.location_preference?.ideal?.join(', ') || '',
            acceptable: data.location_preference?.acceptable?.join(', ') || '',
            outside_india: data.location_preference?.outside_india || 'case_by_case_no_visa'
          },
          notice_period_preference: {
            ideal_max_days: data.notice_period_preference?.ideal_max_days || 30,
            buyout_max_days: data.notice_period_preference?.buyout_max_days || 30
          }
        });
      } else {
        const errData = await res.json();
        alert(`Analysis failed: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('JD Analysis error:', err);
      alert('Failed to connect to backend for JD analysis.');
    } finally {
      setJdLoading(false);
    }
  };

  const handleJdFileUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setJdText(text);
      handleAnalyzeJd(text);
    };
    reader.readAsText(file);
  };

  const handleSaveJdAndProceed = async () => {
    if (!analyzedJd) return;
    setLoading(true);
    
    // Parse comma separated values back into arrays
    const formattedProfile = {
      mandatory_skills: analyzedJd.mandatory_skills.split(',').map(s => s.trim()).filter(Boolean),
      preferred_skills: analyzedJd.preferred_skills.split(',').map(s => s.trim()).filter(Boolean),
      ideal_profile_text: analyzedJd.ideal_profile_text,
      location_preference: {
        ideal: analyzedJd.location_preference.ideal.split(',').map(s => s.trim()).filter(Boolean),
        acceptable: analyzedJd.location_preference.acceptable.split(',').map(s => s.trim()).filter(Boolean),
        outside_india: analyzedJd.location_preference.outside_india
      },
      notice_period_preference: {
        ideal_max_days: parseInt(analyzedJd.notice_period_preference.ideal_max_days) || 30,
        buyout_max_days: parseInt(analyzedJd.notice_period_preference.buyout_max_days) || 30
      }
    };

    try {
      const res = await fetch(`${API_BASE}/api/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...configs, 
          jd_profile: formattedProfile 
        })
      });
      if (res.ok) {
        setConfigs(prev => ({ ...prev, jd_profile: formattedProfile }));
        setActiveStep('candidates');
      } else {
        alert("Failed to save Job Description configuration.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving JD configs: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Candidate Upload & Ranking Handler
  const handleCandidatesUpload = async (file) => {
    if (!file) return;
    setCandFileName(file.name);
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/upload_rank`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.results || []);
        // Save raw candidate lists for re-weighting
        setRawUploadedCandidates(data.results.map(c => ({
          candidate_id: c.candidate_id,
          profile: c.profile,
          career_history: c.career_history,
          skills: c.skills,
          redrob_signals: c.redrob_signals
        })));
        
        if (data.results && data.results.length > 0) {
          setSelectedCandidate(null);
          setActiveStep('results');
        }
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.detail || 'Failed to rank candidates'}`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to connect to backend server. Ensure the python backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalLoad = async () => {
    if (!localFilePath.trim()) {
      alert("Please enter or select a valid local file path.");
      return;
    }
    setLoading(true);
    setCandFileName(localFilePath.split('/').pop());
    try {
      const res = await fetch(`${API_BASE}/api/rank_local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filepath: localFilePath
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.results || []);
        setRawUploadedCandidates(data.results.map(c => ({
          candidate_id: c.candidate_id,
          profile: c.profile,
          career_history: c.career_history,
          skills: c.skills,
          redrob_signals: c.redrob_signals
        })));
        if (data.results && data.results.length > 0) {
          setSelectedCandidate(null);
          setActiveStep('results');
        }
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.detail || 'Failed to load local candidates'}`);
      }
    } catch (err) {
      console.error('Local load failed:', err);
      alert('Failed to connect to backend server. Ensure the python backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const reRank = async (targetConfigs) => {
    if (rawUploadedCandidates.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawUploadedCandidates)
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.results || []);
        // Refresh selected candidate if open
        if (selectedCandidate) {
          const updatedSelected = data.results.find(c => c.candidate_id === selectedCandidate.candidate_id);
          if (updatedSelected) {
            setSelectedCandidate(updatedSelected);
          }
        }
      }
    } catch (err) {
      console.error('Re-ranking failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (key, value) => {
    if (!configs) return;
    
    const updatedWeights = {
      ...configs.weights,
      weights: {
        ...configs.weights.weights,
        [key]: parseFloat(value)
      }
    };
    
    saveConfigs({
      ...configs,
      weights: updatedWeights
    });
  };

  // Helper formatting functions for lists & exports
  const getTopSkills = (cand, jdProfile) => {
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

  const getExperienceSummary = (cand) => {
    const totalYears = cand.features?.years_of_experience || cand.profile?.years_of_experience || 0;
    const currentTitle = cand.profile?.current_title || "";
    const careerCount = cand.career_history?.length || 0;
    
    if (currentTitle) {
      return `${toNum(totalYears).toFixed(1)} years (${currentTitle} & ${careerCount} other role${careerCount !== 1 ? 's' : ''})`;
    }
    return `${toNum(totalYears).toFixed(1)} years of experience`;
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    const topX = filteredCandidates.slice(0, numCandidatesToDisplay);
    if (topX.length === 0) {
      alert("No candidates to export.");
      return;
    }

    const headers = ["Rank", "Candidate ID", "Confidence Score", "Why We Chose Them", "Top Skills", "Experience Summary"];
    
    const rows = topX.map(cand => [
      cand.rank,
      cand.candidate_id,
      `${toNum(cand.score * 100).toFixed(1)}%`,
      `"${cand.reasoning.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${getTopSkills(cand, configs?.jd_profile).replace(/"/g, '""')}"`,
      `"${getExperienceSummary(cand).replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ranked_candidates_top_${topX.length}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter candidates based on search query
  const filteredCandidates = candidates.filter(cand => {
    const query = searchQuery.toLowerCase();
    return (
      cand.candidate_id.toLowerCase().includes(query) ||
      (cand.profile.anonymized_name || '').toLowerCase().includes(query) ||
      (cand.profile.headline || '').toLowerCase().includes(query) ||
      (cand.profile.location || '').toLowerCase().includes(query)
    );
  });

  // Calculate high-level metrics
  const totalCount = candidates.length;
  const avgScore = totalCount > 0 
    ? toNum(candidates.reduce((sum, c) => sum + c.score, 0) / totalCount * 100).toFixed(1)
    : 0;
  const honeypotCount = candidates.filter(c => c.features.honeypot_risk > 0.3).length;
  const honeypotRate = totalCount > 0 
    ? toNum((honeypotCount / totalCount) * 100).toFixed(1)
    : 0;
  const responsiveRate = totalCount > 0
    ? toNum((candidates.filter(c => c.redrob_signals.recruiter_response_rate > 0.6).length / totalCount) * 100).toFixed(1)
    : 0;

  // Chart Data preparation
  const scoreIntervals = [
    { name: '0-20', count: 0 },
    { name: '21-40', count: 0 },
    { name: '41-60', count: 0 },
    { name: '61-80', count: 0 },
    { name: '81-100', count: 0 },
  ];
  candidates.forEach(c => {
    const s = c.score * 100;
    if (s <= 20) scoreIntervals[0].count++;
    else if (s <= 40) scoreIntervals[1].count++;
    else if (s <= 60) scoreIntervals[2].count++;
    else if (s <= 80) scoreIntervals[3].count++;
    else scoreIntervals[4].count++;
  });

  const noticeData = [
    { name: 'Immediate (≤15d)', value: 0 },
    { name: 'Standard (16-30d)', value: 0 },
    { name: 'Long (31-90d)', value: 0 },
    { name: 'Very Long (>90d)', value: 0 },
  ];
  candidates.forEach(c => {
    const n = c.redrob_signals.notice_period_days || 0;
    if (n <= 15) noticeData[0].value++;
    else if (n <= 30) noticeData[1].value++;
    else if (n <= 90) noticeData[2].value++;
    else noticeData[3].value++;
  });
  const filteredNoticeData = noticeData.filter(d => d.value > 0);

  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="app-container">
      <div className="bg-mesh"></div>
      
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">
            <Sparkles size={24} color="#fff" />
          </div>
          <div className="logo-text">
            <h1>RecruitIQ AI</h1>
            <p>Candidate Evidence Ranking Engine</p>
          </div>
        </div>

        {/* Step Indicator Progress Wizard */}
        <div className="step-wizard-bar">
          <div 
            className={`step-item ${activeStep === 'jd' ? 'active' : ''} ${activeStep !== 'jd' ? 'completed' : ''}`}
            onClick={() => setActiveStep('jd')}
          >
            <span className="step-num">{activeStep !== 'jd' ? <Check size={12} /> : '1'}</span>
            <span className="step-txt">Job Description</span>
          </div>
          <div className="step-connector"></div>
          <div 
            className={`step-item ${activeStep === 'candidates' ? 'active' : ''} ${activeStep === 'results' ? 'completed' : ''}`}
            onClick={() => { if (analyzedJd) setActiveStep('candidates'); }}
          >
            <span className="step-num">{activeStep === 'results' ? <Check size={12} /> : '2'}</span>
            <span className="step-txt">Candidates Database</span>
          </div>
          <div className="step-connector"></div>
          <div 
            className={`step-item ${activeStep === 'results' ? 'active' : ''}`}
            onClick={() => { if (candidates.length > 0) setActiveStep('results'); }}
          >
            <span className="step-num">3</span>
            <span className="step-txt">Ranked Pipeline</span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="dashboard-layout">
        
        {/* Sidebar Controls (Only shown in results dashboard view) */}
        {activeStep === 'results' ? (
          <aside className="sidebar">
            {/* Quick JD Overview & Action */}
            <div className="glass-card config-section">
              <h3 className="config-title">
                <FileText size={18} />
                Active JD Profile
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.4', marginBottom: '14px' }}>
                Currently ranking candidates against the custom analyzed Job Description.
              </p>
              <button className="btn-secondary flex-align flex-justify" onClick={() => setActiveStep('jd')}>
                <RefreshCw size={14} style={{ marginRight: '6px' }} />
                Change JD
              </button>
            </div>

            {/* Candidate List Query Sizing */}
            <div className="glass-card config-section">
              <h3 className="config-title">
                <Users size={18} />
                Query Size
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Show Top Matches</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{numCandidatesToDisplay} candidates</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max={Math.min(100, candidates.length || 100)} 
                  step="1"
                  value={numCandidatesToDisplay}
                  className="weight-slider"
                  onChange={(e) => setNumCandidatesToDisplay(parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Weights Configurator */}
            <div className="glass-card config-section">
              <h3 className="config-title">
                <Settings size={18} className="text-secondary" />
                Weight Tuning
              </h3>
              
              {configs ? (
                Object.keys(configs.weights.weights).map((key) => {
                  const label = key.replace(/_/g, ' ');
                  const val = configs.weights.weights[key];
                  return (
                    <div className="weight-control" key={key}>
                      <div className="weight-info">
                        <span className="weight-label">{label}</span>
                        <span className="weight-value">{toNum(val).toFixed(2)}</span>
                      </div>
                      <div className="slider-container">
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05"
                          value={val}
                          className="weight-slider"
                          onChange={(e) => handleWeightChange(key, e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading configurations...</p>
              )}

              <button className="btn-secondary flex-align flex-justify" onClick={fetchConfigs}>
                Reset Defaults
                <RefreshCw size={14} />
              </button>
            </div>
          </aside>
        ) : (
          <aside className="sidebar">
            {/* Guide Card during Steps 1 & 2 */}
            <div className="glass-card config-section">
              <h3 className="config-title">
                <Compass size={18} />
                Pipeline Steps
              </h3>
              <ul className="step-guide-list">
                <li className={activeStep === 'jd' ? 'active-guide' : 'completed-guide'}>
                  <strong>1. Job Description Fit</strong>
                  <p>Upload or paste the job description. The engine extracts skills, location parameters, and notices automatically.</p>
                </li>
                <li className={activeStep === 'candidates' ? 'active-guide' : (activeStep === 'results' ? 'completed-guide' : 'pending-guide')}>
                  <strong>2. Candidate Pool</strong>
                  <p>Provide candidate database profiles (JSON/JSONL) and specify matching parameters.</p>
                </li>
                <li className={activeStep === 'results' ? 'active-guide' : 'pending-guide'}>
                  <strong>3. Score & Export</strong>
                  <p>Interactively review evidence reasoning, score breakdowns, and export top candidates to CSV.</p>
                </li>
              </ul>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="main-content">
          
          {/* STEP 1: JOB DESCRIPTION UPLOAD & HEURISTIC ANALYSIS */}
          {activeStep === 'jd' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-card config-section">
                <h2 style={{ fontSize: '20px', color: 'white', marginBottom: '10px' }}>Upload or Paste Job Description (JD)</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                  The RecruitIQ AI engine will parse the raw JD to extract technical expectations, locations, and notice period constraints.
                </p>

                {/* JD File Uploader */}
                <div 
                  className={`jd-upload-zone ${jdDragOver ? 'drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setJdDragOver(true); }}
                  onDragLeave={() => setJdDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setJdDragOver(false); if (e.dataTransfer.files[0]) handleJdFileUpload(e.dataTransfer.files[0]); }}
                  onClick={() => jdFileInputRef.current.click()}
                >
                  <input 
                    type="file" 
                    ref={jdFileInputRef} 
                    style={{ display: 'none' }}
                    accept=".txt,.md"
                    onChange={(e) => handleJdFileUpload(e.target.files[0])}
                  />
                  <Upload size={32} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
                  <p style={{ fontWeight: 600 }}>Drag & Drop JD file (.txt or .md) or click to browse</p>
                </div>

                <div style={{ margin: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                  <span style={{ padding: '0 10px' }}>OR PASTE TEXT BELOW</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                </div>

                <textarea
                  className="jd-textarea"
                  placeholder="Paste the raw text of the job description here..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button 
                    className="upload-btn" 
                    onClick={() => handleAnalyzeJd()}
                    disabled={jdLoading}
                  >
                    {jdLoading ? <RefreshCw size={16} className="spinning" /> : <Sparkles size={16} />}
                    {jdLoading ? 'Analyzing JD...' : 'Analyze Job Description'}
                  </button>
                </div>
              </div>

              {/* Review Extracted JD parameters form */}
              {analyzedJd && (
                <div className="glass-card config-section" style={{ border: '1px solid var(--border-color-active)' }}>
                  <h3 style={{ fontSize: '18px', color: 'white', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="var(--secondary)" />
                    Heuristic Analysis Result
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                    Please review and refine the parameters extracted from your Job Description. Adjust any comma-separated values or text to fit your requirements.
                  </p>

                  <div className="jd-editor-form">
                    <div className="form-group">
                      <label>Mandatory Skills (Comma separated)</label>
                      <input 
                        type="text" 
                        value={analyzedJd.mandatory_skills} 
                        onChange={(e) => setAnalyzedJd({ ...analyzedJd, mandatory_skills: e.target.value })} 
                      />
                      <small>Candidates MUST have these skills. Examples: python, embeddings, vector-db</small>
                    </div>

                    <div className="form-group">
                      <label>Preferred Skills (Comma separated)</label>
                      <input 
                        type="text" 
                        value={analyzedJd.preferred_skills} 
                        onChange={(e) => setAnalyzedJd({ ...analyzedJd, preferred_skills: e.target.value })} 
                      />
                      <small>Candidates with these skills will receive extra ranking boosts.</small>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Ideal Locations (Comma separated)</label>
                        <input 
                          type="text" 
                          value={analyzedJd.location_preference.ideal} 
                          onChange={(e) => setAnalyzedJd({ 
                            ...analyzedJd, 
                            location_preference: { ...analyzedJd.location_preference, ideal: e.target.value } 
                          })} 
                        />
                      </div>
                      <div className="form-group">
                        <label>Acceptable Locations (Comma separated)</label>
                        <input 
                          type="text" 
                          value={analyzedJd.location_preference.acceptable} 
                          onChange={(e) => setAnalyzedJd({ 
                            ...analyzedJd, 
                            location_preference: { ...analyzedJd.location_preference, acceptable: e.target.value } 
                          })} 
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Notice Period - Max Days Allowed</label>
                        <input 
                          type="number" 
                          value={analyzedJd.notice_period_preference.ideal_max_days} 
                          onChange={(e) => setAnalyzedJd({ 
                            ...analyzedJd, 
                            notice_period_preference: { 
                              ...analyzedJd.notice_period_preference, 
                              ideal_max_days: e.target.value,
                              buyout_max_days: e.target.value
                            } 
                          })} 
                        />
                      </div>
                      <div className="form-group">
                        <label>International Candidates</label>
                        <select 
                          value={analyzedJd.location_preference.outside_india}
                          onChange={(e) => setAnalyzedJd({ 
                            ...analyzedJd, 
                            location_preference: { ...analyzedJd.location_preference, outside_india: e.target.value } 
                          })}
                        >
                          <option value="case_by_case_no_visa">Case-by-case (No Visa Support)</option>
                          <option value="allow_all">Allow International</option>
                          <option value="reject_outside">Strictly Remote/Domestic Only</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Ideal Profile Text Summary</label>
                      <textarea 
                        value={analyzedJd.ideal_profile_text} 
                        onChange={(e) => setAnalyzedJd({ ...analyzedJd, ideal_profile_text: e.target.value })} 
                        style={{ height: '70px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                      <button 
                        className="btn-secondary"
                        onClick={() => setAnalyzedJd(null)}
                      >
                        Reset / Re-upload
                      </button>
                      <button 
                        className="upload-btn" 
                        onClick={handleSaveJdAndProceed}
                        disabled={loading}
                      >
                        {loading ? <RefreshCw size={16} className="spinning" /> : <ArrowRight size={16} />}
                        Save JD & Proceed
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CANDIDATE DATABASE UPLOAD */}
          {activeStep === 'candidates' && (
            <div className="glass-card config-section" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <FileText size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
                <h2 style={{ fontSize: '24px', color: 'white', marginBottom: '10px' }}>Select Candidate Database</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '30px' }}>
                  Provide candidate profiles in JSON/JSONL format to rank against your Job Description.
                </p>

                {/* Selection Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', gap: '20px', justifyContent: 'center' }}>
                  <button 
                    onClick={() => setUploadMethod('upload')} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      borderBottom: uploadMethod === 'upload' ? '2px solid var(--primary)' : 'none', 
                      color: uploadMethod === 'upload' ? 'white' : 'var(--text-secondary)', 
                      paddingBottom: '10px', 
                      fontWeight: 600, 
                      cursor: 'pointer' 
                    }}
                  >
                    Upload File
                  </button>
                  <button 
                    onClick={() => setUploadMethod('local')} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      borderBottom: uploadMethod === 'local' ? '2px solid var(--primary)' : 'none', 
                      color: uploadMethod === 'local' ? 'white' : 'var(--text-secondary)', 
                      paddingBottom: '10px', 
                      fontWeight: 600, 
                      cursor: 'pointer' 
                    }}
                  >
                    Load Server File (Fast Cache)
                  </button>
                </div>

                {uploadMethod === 'upload' ? (
                  /* Candidate File Uploader */
                  <div 
                    className={`glass-card uploader-box ${candDragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setCandDragOver(true); }}
                    onDragLeave={() => setCandDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setCandDragOver(false); if (e.dataTransfer.files[0]) handleCandidatesUpload(e.dataTransfer.files[0]); }}
                    onClick={() => candFileInputRef.current.click()}
                    style={{ cursor: 'pointer', padding: '40px', border: '2px dashed var(--border-color)', margin: '20px 0' }}
                  >
                    <input 
                      type="file" 
                      ref={candFileInputRef} 
                      style={{ display: 'none' }}
                      accept=".json,.jsonl"
                      onChange={(e) => handleCandidatesUpload(e.target.files[0])}
                    />
                    {loading ? (
                      <>
                        <RefreshCw className="uploader-icon spinning" size={48} />
                        <h3 style={{ marginTop: '16px' }}>Ranking candidates pool...</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                          Running data cleaning, parsing experience, checking honeypot triggers, and scoring matches...
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="uploader-icon" size={48} style={{ marginBottom: '16px', color: 'var(--secondary)' }} />
                        <h3>Select Candidates Data File</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          Drag & Drop or click to browse (JSON / JSONL format)
                        </p>
                        {candFileName && <div className="cand-file-badge">{candFileName}</div>}
                      </>
                    )}
                  </div>
                ) : (
                  /* Local Server File Loader */
                  <div className="jd-editor-form" style={{ margin: '20px 0', textAlign: 'left' }}>
                    <div className="form-group">
                      <label>Select Preloaded Database File</label>
                      <select 
                        value={localFilePath} 
                        onChange={(e) => setLocalFilePath(e.target.value)}
                        style={{ width: '100%', marginBottom: '12px' }}
                      >
                        <option value="data/candidates.jsonl">data/candidates.jsonl (Full 100K Pool - Instant Cache)</option>
                        <option value="data/sample_candidates.json">data/sample_candidates.json (Small Sample - 200 candidates)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Or Enter Custom Local File Path</label>
                      <input 
                        type="text" 
                        value={localFilePath} 
                        onChange={(e) => setLocalFilePath(e.target.value)} 
                        placeholder="e.g. data/candidates.jsonl"
                      />
                      <small style={{ color: 'var(--text-muted)' }}>
                        Provide the path relative to the project directory. The backend will read the file directly from the local disk.
                      </small>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                      <button 
                        className="upload-btn" 
                        onClick={handleLocalLoad}
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        {loading ? <RefreshCw size={16} className="spinning" /> : <Sparkles size={16} />}
                        {loading ? 'Processing Database...' : 'Load & Rank Candidate Pool'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional back button */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                  <button className="btn-secondary flex-align" onClick={() => setActiveStep('jd')}>
                    <ArrowLeft size={16} style={{ marginRight: '6px' }} />
                    Back to JD Form
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RESULTS DASHBOARD VIEW */}
          {activeStep === 'results' && (
            <>
              {/* Metrics Grid */}
              <div className="metrics-grid">
                <div className="glass-card metric-card">
                  <div className="metric-icon-box primary">
                    <Users size={20} />
                  </div>
                  <div className="metric-info">
                    <h4>Candidates Pool</h4>
                    <p>{totalCount}</p>
                  </div>
                </div>
                <div className="glass-card metric-card">
                  <div className="metric-icon-box secondary">
                    <Percent size={20} />
                  </div>
                  <div className="metric-info">
                    <h4>Average Match</h4>
                    <p>{avgScore}%</p>
                  </div>
                </div>
                <div className="glass-card metric-card">
                  <div className="metric-icon-box danger">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="metric-info">
                    <h4>Honeypot Flags</h4>
                    <p>{honeypotRate}%</p>
                  </div>
                </div>
                <div className="glass-card metric-card">
                  <div className="metric-icon-box accent">
                    <Activity size={20} />
                  </div>
                  <div className="metric-info">
                    <h4>High Responsiveness</h4>
                    <p>{responsiveRate}%</p>
                  </div>
                </div>
              </div>

              {/* Visualizations Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="glass-card" style={{ padding: '20px', height: '240px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BarChart2 size={16} color="var(--primary)" />
                    Score Distribution (Count)
                  </h3>
                  <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={scoreIntervals}>
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: '#0D1322', borderColor: 'var(--border-color)', borderRadius: '8px' }} 
                        labelStyle={{ color: 'white' }}
                      />
                      <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="glass-card" style={{ padding: '20px', height: '240px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} color="var(--secondary)" />
                    Notice Period Breakdown
                  </h3>
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
                    <ResponsiveContainer width="50%" height="100%">
                      <PieChart>
                        <Pie
                          data={filteredNoticeData}
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {filteredNoticeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', width: '50%' }}>
                      {filteredNoticeData.map((d, index) => (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></span>
                          <span style={{ color: 'var(--text-secondary)' }}>{d.name}:</span>
                          <span style={{ color: 'white', fontWeight: 600 }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Candidates Table List */}
              <div className="glass-card table-card">
                <div className="table-header-row">
                  <div>
                    <h3 style={{ fontSize: '18px', color: 'white' }}>Ranked Candidate Pipeline (Top {numCandidatesToDisplay})</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Candidates ranked dynamically by evidence score match against the Job Description.
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="search-box">
                      <Search size={16} color="var(--text-secondary)" />
                      <input 
                        type="text" 
                        placeholder="Search name, headline, location..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <button 
                      className="upload-btn" 
                      onClick={handleExportCSV}
                      style={{ background: 'linear-gradient(135deg, var(--secondary), #059669)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)' }}
                    >
                      <Download size={15} />
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="candidate-table">
                    <thead>
                      <tr>
                        <th style={{ width: '70px' }}>Rank</th>
                        <th>Candidate Profile</th>
                        <th>Confidence Score</th>
                        <th>Top Skills</th>
                        <th>Experience Summary</th>
                        <th>Why We Chose Them</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.slice(0, numCandidatesToDisplay).map((cand) => {
                        const isTop3 = cand.rank <= 3;
                        const isHoneypot = cand.features.honeypot_risk > 0.3;
                        const isDisqualified = cand.features.disqualifier_multiplier < 0.6;
                        const isProduct = cand.features.product_company_ratio > 0.5;

                        return (
                          <tr key={cand.candidate_id} onClick={() => setSelectedCandidate(cand)}>
                            <td>
                              <span className={`rank-badge ${isTop3 ? 'top-3' : 'normal'}`}>
                                {cand.rank}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'white' }}>{cand.candidate_id}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {cand.profile.anonymized_name}
                              </div>
                            </td>
                            <td className="score-cell" style={{ fontWeight: 700 }}>
                              {toNum(cand.score * 100).toFixed(1)}%
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text-primary)', maxWidth: '180px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {getTopSkills(cand, configs?.jd_profile)}
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {getExperienceSummary(cand)}
                            </td>
                            <td style={{ maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                              {cand.reasoning}
                            </td>
                            <td>
                              <ChevronRight size={18} color="var(--text-muted)" />
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCandidates.length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            No candidates match search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Details Side Drawer */}
      {selectedCandidate && (
        <div className="drawer-backdrop" onClick={() => setSelectedCandidate(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3 style={{ fontSize: '20px', color: 'white' }}>
                  {selectedCandidate.candidate_id}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {selectedCandidate.profile.anonymized_name} • Rank {selectedCandidate.rank}
                </p>
              </div>
              <button className="drawer-close" onClick={() => setSelectedCandidate(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="drawer-content">
              {/* Score Box */}
              <div className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 className="drawer-section-title" style={{ marginBottom: '4px' }}>Evaluation Score</h4>
                  <span style={{ fontSize: '32px', fontWeight: 800, color: 'white', fontFamily: 'Outfit' }}>
                    {toNum(selectedCandidate.score * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className={`badge ${selectedCandidate.features.honeypot_risk > 0.3 ? 'honeypot' : 'product'}`} style={{ padding: '6px 12px', fontSize: '13px' }}>
                    {selectedCandidate.features.honeypot_risk > 0.3 ? 'Honeypot Flagged' : 'Verified Candidate'}
                  </span>
                </div>
              </div>

              {/* Alerts (Honeypot Risk Details) */}
              {selectedCandidate.features.honeypot_risk > 0.3 && (
                <div className="alert-box danger">
                  <AlertTriangle size={18} />
                  <div>
                    <h5 style={{ fontWeight: 700, marginBottom: '4px' }}>Honeypot Verification Warning</h5>
                    This profile triggered checks indicating high inconsistency or keyword-stuffing patterns (Trust Factor penalty of {(toNum(selectedCandidate.features.honeypot_risk) * 100).toFixed(0)}%). Check assessment scores and career gaps.
                  </div>
                </div>
              )}

              {/* Alerts (Disqualification Rules Details) */}
              {selectedCandidate.features.disqualifier_multiplier < 0.6 && (
                <div className="alert-box warning">
                  <AlertTriangle size={18} />
                  <div>
                    <h5 style={{ fontWeight: 700, marginBottom: '4px' }}>JD Exclusion Signals Triggered</h5>
                    Profile matched negative signals specified in the Job Description (e.g. consulting-only history, langchain-only recent experience, cv-only focus). Score heavily penalized.
                  </div>
                </div>
              )}

              {/* AI Reasoning */}
              <div>
                <h4 className="drawer-section-title">Verified Evidence Reasoning</h4>
                <div className="reasoning-box">
                  {selectedCandidate.reasoning}
                </div>
              </div>

              {/* Profile Overview */}
              <div>
                <h4 className="drawer-section-title">Profile Overview</h4>
                <div className="profile-meta-grid">
                  <div className="meta-item">
                    <label>Designation</label>
                    <span>{selectedCandidate.profile.current_title}</span>
                  </div>
                  <div className="meta-item">
                    <label>Total Experience</label>
                    <span>{toNum(selectedCandidate.features.years_of_experience).toFixed(1)} Years</span>
                  </div>
                  <div className="meta-item">
                    <label>Location</label>
                    <span>{selectedCandidate.profile.location || 'Not Specified'}</span>
                  </div>
                  <div className="meta-item">
                    <label>Notice Period</label>
                    <span>{selectedCandidate.redrob_signals.notice_period_days || 0} Days</span>
                  </div>
                </div>
              </div>

              {/* Score Breakdown Bars */}
              <div>
                <h4 className="drawer-section-title">Scoring Components</h4>
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div className="score-breakdown-row">
                    <span className="score-breakdown-label">Technical Fit (Skills & Focus)</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="score-breakdown-bar-bg">
                        <div className="score-breakdown-bar-fg" style={{ width: `${(toNum(selectedCandidate.features.mandatory_skill_coverage) * 100)}%`, background: 'var(--secondary)' }}></div>
                      </div>
                      <span className="score-breakdown-value">{(toNum(selectedCandidate.features.mandatory_skill_coverage) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="score-breakdown-row">
                    <span className="score-breakdown-label">Semantic Similarity (JD Match)</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="score-breakdown-bar-bg">
                        <div className="score-breakdown-bar-fg" style={{ width: `${(toNum(selectedCandidate.features.embedding_similarity) * 100)}%` }}></div>
                      </div>
                      <span className="score-breakdown-value">{(toNum(selectedCandidate.features.embedding_similarity) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="score-breakdown-row">
                    <span className="score-breakdown-label">Career Quality & Tenure</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="score-breakdown-bar-bg">
                        <div className="score-breakdown-bar-fg" style={{ width: `${(toNum(selectedCandidate.features.product_company_ratio) * 100)}%` }}></div>
                      </div>
                      <span className="score-breakdown-value">{(toNum(selectedCandidate.features.product_company_ratio) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="score-breakdown-row">
                    <span className="score-breakdown-label">Behavioral Readiness</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="score-breakdown-bar-bg">
                        <div className="score-breakdown-bar-fg" style={{ width: `${(toNum(selectedCandidate.features.behavioral_readiness) * 100)}%` }}></div>
                      </div>
                      <span className="score-breakdown-value">{(toNum(selectedCandidate.features.behavioral_readiness) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h4 className="drawer-section-title">Skills & Endorsements</h4>
                <div className="skills-grid">
                  {selectedCandidate.skills.map((sk) => {
                    const isMandatory = configs?.jd_profile?.mandatory_skills?.includes(sk.name.toLowerCase());
                    const profClass = sk.proficiency?.toLowerCase() || 'beginner';
                    
                    return (
                      <span key={sk.name} className={`skill-tag ${isMandatory ? 'mandatory' : ''}`}>
                        <span className={`proficiency-dot ${profClass}`}></span>
                        {sk.name}
                        {sk.endorsements > 0 && (
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '2px' }}>
                            ({sk.endorsements})
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Career History Timeline */}
              <div>
                <h4 className="drawer-section-title">Employment History</h4>
                <div className="timeline">
                  {selectedCandidate.career_history.map((job, idx) => (
                    <div className={`timeline-item ${job.is_current ? 'current' : ''}`} key={idx}>
                      <span className="timeline-dot"></span>
                      <div className="timeline-header">
                        <span className="timeline-title">{job.title}</span>
                        <span className="timeline-duration">{job.duration_months} mos</span>
                      </div>
                      <div className="timeline-company">{job.company}</div>
                      <p className="timeline-desc">{job.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
