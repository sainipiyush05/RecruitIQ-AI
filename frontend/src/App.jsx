import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Users, Percent, Activity, Search, Sparkles, 
  Settings, AlertTriangle, CheckCircle, ChevronRight, X, 
  Briefcase, GraduationCap, Award, Compass, Clock, MapPin, 
  User, Check, Info, RefreshCw, BarChart2
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

const API_BASE = 'http://localhost:8000';

function App() {
  const [candidates, setCandidates] = useState([]);
  const [configs, setConfigs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleFileUpload = async (file) => {
    if (!file) return;
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
        if (data.results && data.results.length > 0) {
          setSelectedCandidate(null);
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

  const reRank = async (targetConfigs) => {
    if (candidates.length === 0) return;
    setLoading(true);
    
    // We send the current candidate list (with original profiles) back to be re-scored
    const rawCandidates = candidates.map(c => ({
      candidate_id: c.candidate_id,
      profile: c.profile,
      career_history: c.career_history,
      skills: c.skills,
      redrob_signals: c.redrob_signals
    }));

    try {
      const res = await fetch(`${API_BASE}/api/rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawCandidates)
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
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
    
    // Normalize weights to sum up to roughly 1.0 if desired, or keep as raw
    // For this tuner, we let the user adjust raw values and save
    saveConfigs({
      ...configs,
      weights: updatedWeights
    });
  };

  // Filter candidates based on search
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
    ? (candidates.reduce((sum, c) => sum + c.score, 0) / totalCount * 100).toFixed(1)
    : 0;
  const honeypotCount = candidates.filter(c => c.features.honeypot_risk > 0.3).length;
  const honeypotRate = totalCount > 0 
    ? ((honeypotCount / totalCount) * 100).toFixed(1)
    : 0;
  const responsiveRate = totalCount > 0
    ? ((candidates.filter(c => c.redrob_signals.recruiter_response_rate > 0.6).length / totalCount) * 100).toFixed(1)
    : 0;

  // Chart Data preparation
  // 1. Scores distribution
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

  // 2. Notice period distribution
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

        {totalCount > 0 && (
          <button className="upload-btn" onClick={() => fileInputRef.current.click()}>
            <Upload size={16} />
            Upload New File
          </button>
        )}
      </header>

      {/* Main Layout */}
      <div className="dashboard-layout">
        
        {/* Sidebar Controls */}
        <aside className="sidebar">
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
                      <span className="weight-value">{val.toFixed(2)}</span>
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

          {/* JD Information Overview */}
          {configs && configs.jd_profile && (
            <div className="glass-card config-section">
              <h3 className="config-title">
                <Compass size={18} />
                JD Targets
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                <div>
                  <h4 style={{ color: 'white', marginBottom: '4px', fontWeight: 600 }}>Mandatory Skills:</h4>
                  <div className="skills-grid" style={{ marginTop: '6px' }}>
                    {configs.jd_profile.mandatory_skills.slice(0, 5).map(s => (
                      <span key={s} className="skill-tag mandatory" style={{ padding: '3px 8px', fontSize: '10px' }}>{s}</span>
                    ))}
                    {configs.jd_profile.mandatory_skills.length > 5 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', alignSelf: 'center' }}>
                        +{configs.jd_profile.mandatory_skills.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 style={{ color: 'white', marginBottom: '4px', fontWeight: 600 }}>Location Focus:</h4>
                  <p style={{ color: 'var(--text-secondary)' }}>Ideal: {configs.jd_profile.location_preference.ideal.join(', ')}</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Pane */}
        <main className="main-content">
          
          {totalCount === 0 ? (
            /* Upload Screen */
            <div 
              className={`glass-card uploader-box ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }}
                accept=".json,.jsonl"
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />
              {loading ? (
                <>
                  <RefreshCw className="uploader-icon" size={48} style={{ animation: 'spin 2s linear infinite' }} />
                  <h3>Processing candidates pool...</h3>
                  <p>Running data cleaning, parsing experience, running lexical matching and checking honeypots...</p>
                </>
              ) : (
                <>
                  <Upload className="uploader-icon" size={48} />
                  <h3>Upload Candidates Database</h3>
                  <p>Drag and drop candidate profiles file in JSON or JSONL format (e.g. sample_candidates.json) to start evaluation.</p>
                  <button className="upload-btn" style={{ pointerEvents: 'none' }}>Select File</button>
                </>
              )}
            </div>
          ) : (
            /* Dashboard view */
            <>
              {/* Metrics Grid */}
              <div className="metrics-grid">
                <div className="glass-card metric-card">
                  <div className="metric-icon-box primary">
                    <Users size={20} />
                  </div>
                  <div className="metric-info">
                    <h4>Candidates Pools</h4>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                  <h3 style={{ fontSize: '18px' }}>Ranked Candidate Pipeline</h3>
                  <div className="search-box">
                    <Search size={16} color="var(--text-secondary)" />
                    <input 
                      type="text" 
                      placeholder="Search name, headline, location..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="candidate-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>ID / Name</th>
                        <th>Headline</th>
                        <th>Matching Score</th>
                        <th>Signals</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((cand) => {
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
                            <td style={{ maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {cand.profile.headline}
                            </td>
                            <td className="score-cell">
                              {(cand.score * 100).toFixed(1)}%
                            </td>
                            <td>
                              <div className="indicator-badges">
                                {isHoneypot && (
                                  <span className="badge honeypot">Honeypot</span>
                                )}
                                {isDisqualified && (
                                  <span className="badge disq">Disqualified</span>
                                )}
                                {isProduct && (
                                  <span className="badge product">Product Exp</span>
                                )}
                                {!isHoneypot && !isDisqualified && !isProduct && (
                                  <span className="badge normal-status">Clear</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <ChevronRight size={18} color="var(--text-muted)" />
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCandidates.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
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
                    {(selectedCandidate.score * 100).toFixed(1)}%
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
                    This profile triggered checks indicating high inconsistency or keyword-stuffing patterns (Trust Factor penalty of {((selectedCandidate.features.honeypot_risk) * 100).toFixed(0)}%). Check assessment scores and career gaps.
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
                    <span>{selectedCandidate.features.years_of_experience.toFixed(1)} Years</span>
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
                        <div className="score-breakdown-bar-fg" style={{ width: `${(selectedCandidate.features.mandatory_skill_coverage * 100)}%`, background: 'var(--secondary)' }}></div>
                      </div>
                      <span className="score-breakdown-value">{(selectedCandidate.features.mandatory_skill_coverage * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="score-breakdown-row">
                    <span className="score-breakdown-label">Semantic Similarity (JD Match)</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="score-breakdown-bar-bg">
                        <div className="score-breakdown-bar-fg" style={{ width: `${(selectedCandidate.features.embedding_similarity * 100)}%` }}></div>
                      </div>
                      <span className="score-breakdown-value">{(selectedCandidate.features.embedding_similarity * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="score-breakdown-row">
                    <span className="score-breakdown-label">Career Quality & Tenure</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="score-breakdown-bar-bg">
                        <div className="score-breakdown-bar-fg" style={{ width: `${(selectedCandidate.features.product_company_ratio * 100)}%` }}></div>
                      </div>
                      <span className="score-breakdown-value">{(selectedCandidate.features.product_company_ratio * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="score-breakdown-row">
                    <span className="score-breakdown-label">Behavioral Readiness</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="score-breakdown-bar-bg">
                        <div className="score-breakdown-bar-fg" style={{ width: `${(selectedCandidate.features.behavioral_readiness * 100)}%` }}></div>
                      </div>
                      <span className="score-breakdown-value">{(selectedCandidate.features.behavioral_readiness * 100).toFixed(0)}%</span>
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
