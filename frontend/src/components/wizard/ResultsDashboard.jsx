import React, { useState, useRef } from 'react';

// Custom lightweight virtualized list to resolve React 19 + Vite ESM/CJS build issues
function VirtualizedList({ height, itemCount, itemSize, width, children }) {
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const startIndex = Math.max(0, Math.floor(scrollTop / itemSize) - 2);
  const endIndex = Math.min(itemCount - 1, Math.floor((scrollTop + height) / itemSize) + 2);

  const items = [];
  for (let i = startIndex; i <= endIndex; i++) {
    items.push(
      <div 
        key={i} 
        style={{
          position: 'absolute',
          top: `${i * itemSize}px`,
          left: 0,
          right: 0,
          height: `${itemSize}px`,
        }}
      >
        {children({ index: i, style: { height: '100%' } })}
      </div>
    );
  }

  return (
    <div
      onScroll={handleScroll}
      style={{
        overflowY: 'auto',
        position: 'relative',
        height: `${height}px`,
        width: width || '100%'
      }}
    >
      <div style={{ height: `${itemCount * itemSize}px`, width: '100%', position: 'relative' }}>
        {items}
      </div>
    </div>
  );
}
import { Users, Percent, AlertTriangle, Activity, Search, Download, RefreshCw, FileText, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import MetricCard from '../shared/MetricCard';
import ScoreChart from '../shared/ScoreChart';
import NoticeChart from '../shared/NoticeChart';
import WeightSlider from '../shared/WeightSlider';
import VerdictStamp from '../candidate/VerdictStamp';
import { toNum, getTopSkills, getExperienceSummary } from '../../lib/format';

export default function ResultsDashboard({
  candidates,
  configs,
  onWeightChange,
  onResetWeights,
  onExportCSV,
  onSelectCandidate,
  onBackToJd,
  targetLimit,
  setTargetLimit
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [numCandidatesToDisplay, setNumCandidatesToDisplay] = useState(100);

  // 1. Filter candidates based on search
  const filteredCandidates = candidates.filter(cand => {
    const query = searchQuery.toLowerCase();
    return (
      cand.candidate_id.toLowerCase().includes(query) ||
      (cand.profile?.anonymized_name || '').toLowerCase().includes(query) ||
      (cand.profile?.headline || '').toLowerCase().includes(query) ||
      (cand.profile?.location || '').toLowerCase().includes(query)
    );
  });

  const slicedCandidates = filteredCandidates.slice(0, numCandidatesToDisplay);

  // 2. High-level Metrics calculations
  const totalCount = candidates.length;
  const avgScore = totalCount > 0 
    ? toNum(candidates.reduce((sum, c) => sum + c.score, 0) / totalCount * 100).toFixed(1)
    : 0;
  const honeypotCount = candidates.filter(c => c.features?.honeypot_risk > 0.3).length;
  const honeypotRate = totalCount > 0 
    ? toNum((honeypotCount / totalCount) * 100).toFixed(1)
    : 0;
  const responsiveRate = totalCount > 0
    ? toNum((candidates.filter(c => c.redrob_signals?.recruiter_response_rate > 0.6).length / totalCount) * 100).toFixed(1)
    : 0;

  // 3. Score intervals calculations for BarChart
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

  // 4. Notice intervals calculations for PieChart
  const noticeData = [
    { name: 'Immediate (≤15d)', value: 0 },
    { name: 'Standard (16-30d)', value: 0 },
    { name: 'Long (31-90d)', value: 0 },
    { name: 'Very Long (>90d)', value: 0 },
  ];
  candidates.forEach(c => {
    const n = c.redrob_signals?.notice_period_days || 0;
    if (n <= 15) noticeData[0].value++;
    else if (n <= 30) noticeData[1].value++;
    else if (n <= 90) noticeData[2].value++;
    else noticeData[3].value++;
  });

  // 5. Redaction animation variants
  const redactionVariants = {
    initial: { scaleX: 1 },
    hover: { 
      scaleX: 0,
      transition: { 
        duration: 0.22, 
        ease: [0.16, 1, 0.3, 1] 
      }
    }
  };

  // 6. Virtualized Row Renderer
  const Row = ({ index, style }) => {
    const cand = slicedCandidates[index];
    if (!cand) return null;

    const isTop3 = cand.rank <= 3;
    const isHoneypot = cand.features?.honeypot_risk > 0.3;
    const isDisqualified = cand.features?.disqualifier_multiplier < 0.6;

    return (
      <div style={style}>
        <motion.div
          whileHover="hover"
          onClick={() => onSelectCandidate(cand)}
          style={{
            display: 'grid',
            gridTemplateColumns: '70px 140px 90px 140px 150px 1fr 40px',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'var(--paper-dim)',
            borderBottom: '1px solid rgba(138, 131, 117, 0.08)',
            cursor: 'pointer',
            height: '64px',
            boxSizing: 'border-box'
          }}
        >
          {/* Rank */}
          <div>
            <span 
              className="mono-data" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                background: isTop3 ? 'var(--brass)' : 'rgba(255,255,255,0.05)',
                color: isTop3 ? 'var(--ink)' : 'var(--paper)',
                fontWeight: 700,
                fontSize: '11px'
              }}
            >
              {cand.rank}
            </span>
          </div>

          {/* Candidate Profile */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="mono-data" style={{ fontWeight: 700, fontSize: '13px', color: 'white' }}>
              {cand.candidate_id}
            </span>
            <div className="redacted-wrapper" style={{ fontSize: '11px', color: 'var(--graphite)', marginTop: '2px', alignSelf: 'flex-start' }}>
              <span>{cand.profile?.anonymized_name}</span>
              <motion.div variants={redactionVariants} initial="initial" className="redaction-bar" />
            </div>
          </div>

          {/* Confidence Score */}
          <div className="mono-data" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brass)' }}>
            {toNum(cand.score * 100).toFixed(1)}%
          </div>

          {/* Headline */}
          <div className="redacted-wrapper" style={{ fontSize: '11px', color: 'var(--paper)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginRight: '16px', alignSelf: 'center' }}>
            <span>{cand.profile?.current_title || 'Engineer'}</span>
            <motion.div variants={redactionVariants} initial="initial" className="redaction-bar" />
          </div>

          {/* Top Skills */}
          <div style={{ fontSize: '11px', color: 'var(--paper)', paddingRight: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {getTopSkills(cand, configs?.jd_profile)}
          </div>

          {/* Why We Chose Them */}
          <div style={{ fontSize: '12px', color: 'var(--graphite)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
            {cand.reasoning}
          </div>

          {/* Arrow */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <VerdictStamp isFlagged={isHoneypot || isDisqualified} isVerified={false} />
            <ChevronRight size={16} style={{ color: 'var(--graphite)', marginLeft: '4px' }} />
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', boxSizing: 'border-box' }}>
      
      {/* Sidebar Controls */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Active JD Spec Card */}
        <div className="dossier-card" style={{ background: 'var(--paper-dim)' }}>
          <h3 className="mono-data" style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
            <FileText size={15} style={{ color: 'var(--brass)' }} />
            Profile Spec
          </h3>
          <p style={{ color: 'var(--graphite)', fontSize: '12px', lineHeight: '1.4', marginBottom: '16px' }}>
            Evaluating candidates using BGE semantic and BM25 local match indexes.
          </p>
          <button className="btn-dossier" style={{ width: '100%' }} onClick={onBackToJd}>
            Change Spec
          </button>
        </div>

        {/* Display Limit Slider */}
        <div className="dossier-card" style={{ background: 'var(--paper-dim)' }}>
          <h3 className="mono-data" style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
            <Users size={15} style={{ color: 'var(--brass)' }} />
            Display limit
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--graphite)' }}>SHOW TOP</span>
            <span style={{ color: 'var(--brass)', fontWeight: 700 }}>{numCandidatesToDisplay} RECORDS</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max={Math.max(10, candidates.length)}
            value={numCandidatesToDisplay}
            onChange={(e) => setNumCandidatesToDisplay(parseInt(e.target.value))}
            style={{ width: '100%', height: '4px', cursor: 'pointer' }}
          />
        </div>

        {/* Weights Tuning Sliders */}
        <div className="dossier-card" style={{ background: 'var(--paper-dim)' }}>
          <h3 className="mono-data" style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
            <RefreshCw size={15} style={{ color: 'var(--brass)' }} />
            Score Tuning
          </h3>
          {configs?.weights?.weights ? (
            Object.keys(configs.weights.weights).map((key) => (
              <WeightSlider 
                key={key} 
                label={key} 
                value={configs.weights.weights[key]} 
                onChange={(val) => onWeightChange(key, val)}
              />
            ))
          ) : (
            <p style={{ color: 'var(--graphite)', fontSize: '12px' }}>Loading weight coefficients...</p>
          )}

          <button 
            className="btn-dossier" 
            style={{ width: '100%', marginTop: '10px' }} 
            onClick={onResetWeights}
          >
            Reset Coefficients
          </button>
        </div>
      </aside>

      {/* Main Dashboard Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <MetricCard label="Registry Size" value={totalCount} icon={<Users size={16} />} colorClass="primary" />
          <MetricCard label="Mean Score" value={`${avgScore}%`} icon={<Percent size={16} />} colorClass="secondary" />
          <MetricCard label="Honeypot Trigger" value={`${honeypotRate}%`} icon={<AlertTriangle size={16} />} colorClass="danger" />
          <MetricCard label="Highly Active" value={`${responsiveRate}%`} icon={<Activity size={16} />} colorClass="primary" />
        </div>

        {/* Visualization Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <ScoreChart data={scoreIntervals} />
          <NoticeChart data={noticeData} />
        </div>

        {/* Candidate List Box */}
        <div className="dossier-card" style={{ background: 'var(--paper-dim)', display: 'flex', flexDirection: 'column', height: '480px' }}>
          
          {/* Table Toolbar Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div>
              <h3 className="serif-title" style={{ fontSize: '18px', color: 'white', margin: 0 }}>
                Ranked Pipeline Evidence File
              </h3>
              <p style={{ color: 'var(--graphite)', fontSize: '12px', margin: '4px 0 0' }}>
                Double-click or click to declassify details for each candidate.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* Search Box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '6px 12px', width: '220px' }}>
                <Search size={14} style={{ color: 'var(--graphite)' }} />
                <input 
                  type="text" 
                  placeholder="Filter name, id, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '12px', width: '100%', outline: 'none' }}
                />
              </div>
              
              {/* CSV Export Button */}
              <button 
                onClick={() => onExportCSV(slicedCandidates)} 
                className="btn-dossier primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
              >
                <Download size={14} />
                EXPORT CSV
              </button>
            </div>
          </div>

          {/* Table header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '70px 140px 90px 140px 150px 1fr 40px',
            padding: '8px 16px',
            borderBottom: '1px solid var(--border-color)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--graphite)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 700
          }}>
            <span>Rank</span>
            <span>Candidate ID</span>
            <span>Score</span>
            <span>Designation</span>
            <span>Top Skills</span>
            <span>Evidence Summary</span>
            <span></span>
          </div>

          {/* Virtualized Candidate List */}
          <div style={{ flex: 1, width: '100%', height: '100%' }}>
            {slicedCandidates.length > 0 ? (
              <VirtualizedList
                height={350}
                itemCount={slicedCandidates.length}
                itemSize={64}
                width="100%"
              >
                {Row}
              </VirtualizedList>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--graphite)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                NO DOSSIERS MATCHING KEYWORDS FOUND
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
