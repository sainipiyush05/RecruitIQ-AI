import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Cpu, AlertOctagon, Sliders, FileSearch, ChevronRight } from 'lucide-react';

const stages = [
  {
    icon: <Sparkles size={18} />,
    id: 'parse',
    label: 'JD PARSING',
    title: 'JD Heuristic Auto-Parsing',
    desc: 'Ingests raw text and extracts skill sets, location expectations, and notice periods using localized regex classifiers without external API latency.',
    color: '#00F2FE',
    terminalLines: [
      { text: '$ recruitiq parse --input="Senior Frontend Engineer, Bengaluru"', type: 'cmd' },
      { text: '[PARSE] Tokenizing raw JD text...', type: 'info', delay: 400 },
      { text: '[EXTRACT] mandatory_skills: ["react", "typescript", "node.js"]', type: 'success', delay: 800 },
      { text: '[EXTRACT] preferred_skills: ["docker", "kubernetes", "aws"]', type: 'success', delay: 1100 },
      { text: '[EXTRACT] location: Bengaluru (primary), Pune (fallback)', type: 'success', delay: 1400 },
      { text: '[EXTRACT] notice_period: <= 30 days', type: 'success', delay: 1600 },
      { text: '[OK] JD spec compiled. Forwarding to retrieval engine...', type: 'info', delay: 2000 },
    ]
  },
  {
    icon: <Cpu size={18} />,
    id: 'retrieve',
    label: 'RETRIEVAL',
    title: 'Offline Hybrid Retrieval',
    desc: 'Uses precomputed BAAI/bge-base-en-v1.5 dense embeddings and local BM25 indexes to return dynamic scores across massive pools in under 2 seconds.',
    color: '#4FACFE',
    terminalLines: [
      { text: '$ recruitiq rank --pool=100000 --method=hybrid', type: 'cmd' },
      { text: '[INDEX] Loading BM25 lexical index (4.2 GB)...', type: 'info', delay: 500 },
      { text: '[INDEX] Loading bge-base-en-v1.5 dense vectors...', type: 'info', delay: 900 },
      { text: '[RANK] Fusing BM25 + Cosine Similarity scores...', type: 'info', delay: 1300 },
      { text: '[OK] 100,000 candidates scored in 1,850ms.', type: 'success', delay: 1800 },
      { text: '[OK] Top 25 candidates forwarded to audit stage.', type: 'success', delay: 2200 },
    ]
  },
  {
    icon: <AlertOctagon size={18} />,
    id: 'audit',
    label: 'HONEYPOT AUDIT',
    title: 'Honeypot Identification',
    desc: 'Flags timeline overlaps, education anomalies, inflated skill claims with poor duration, and keyword-stuffing patterns automatically.',
    color: '#FF0055',
    terminalLines: [
      { text: '$ recruitiq audit --candidates=25 --strict', type: 'cmd' },
      { text: '[AUDIT] Scanning employment timelines...', type: 'info', delay: 400 },
      { text: '[FLAG] CAND_004812: timeline_overlap (2019-2021)', type: 'warn', delay: 900 },
      { text: '[FLAG] CAND_009241: expert_skill_tenure < 6mo', type: 'warn', delay: 1200 },
      { text: '[SAFE] 23/25 candidates passed integrity checks.', type: 'success', delay: 1700 },
      { text: '[OK] Audit complete. Forwarding clean pool to scoring...', type: 'info', delay: 2100 },
    ]
  },
  {
    icon: <Sliders size={18} />,
    id: 'score',
    label: 'WEIGHT TUNING',
    title: 'Dynamic Weight Tuning',
    desc: 'Recalculates career quality, location fits, and technical matches in real-time. Adjust coefficients on the fly to re-rank candidates instantly.',
    color: '#00FF87',
    terminalLines: [
      { text: '$ recruitiq score --weights="tech:0.35,sem:0.25,loc:0.15"', type: 'cmd' },
      { text: '[SCORE] Applying weight vector to candidate pool...', type: 'info', delay: 400 },
      { text: '[CALC] technical_fit: 0.35 × cosine(jd, resume)', type: 'info', delay: 800 },
      { text: '[CALC] semantic_fit: 0.25 × bge_score', type: 'info', delay: 1100 },
      { text: '[CALC] location_fit: 0.15 × geo_match', type: 'info', delay: 1400 },
      { text: '[OK] Final scores generated. Compiling verdicts...', type: 'success', delay: 1900 },
    ]
  },
  {
    icon: <FileSearch size={18} />,
    id: 'verdict',
    label: 'VERDICT',
    title: 'Declassified Evidence',
    desc: 'Compiles a fully transparent, deterministic justification statement detailing experience matches and potential flags for every pipeline candidate.',
    color: '#F5A623',
    terminalLines: [
      { text: '$ recruitiq explain --top=5 --verbose', type: 'cmd' },
      { text: '[REASON] Compiling deterministic justification...', type: 'info', delay: 500 },
      { text: '[VERDICT] CAND_0088192: VERIFIED (91.8%)', type: 'success', delay: 1000 },
      { text: '  → 4.5yr React experience matches mandatory specs', type: 'info', delay: 1300 },
      { text: '  → Location verified: Pune, IN', type: 'info', delay: 1500 },
      { text: '  → No timeline overlaps or honeypot flags', type: 'success', delay: 1800 },
      { text: '[OK] Dossier declassified. Evidence report sealed.', type: 'success', delay: 2300 },
    ]
  }
];

// Animated data packet component
function DataPacket({ from, to, color, onComplete }) {
  const [pos, setPos] = useState(0);

  useEffect(() => {
    let raf;
    let start = null;
    const duration = 600;
    
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      // Eased progress
      const eased = 1 - Math.pow(1 - progress, 3);
      setPos(eased);
      
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        onComplete && onComplete();
      }
    };
    
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      position: 'absolute',
      left: `${from + (to - from) * pos}%`,
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: color,
      boxShadow: `0 0 12px ${color}, 0 0 24px ${color}`,
      zIndex: 20,
      transition: 'none'
    }} />
  );
}

export default function Features() {
  const [activeStage, setActiveStage] = useState(null);
  const [visibleLines, setVisibleLines] = useState([]);
  const [packets, setPackets] = useState([]);
  const [completedStages, setCompletedStages] = useState(new Set());
  const terminalRef = useRef(null);

  // When active stage changes, animate terminal lines one by one
  useEffect(() => {
    if (activeStage === null) {
      setVisibleLines([]);
      return;
    }

    setVisibleLines([]);
    const stage = stages[activeStage];
    const timeouts = [];

    stage.terminalLines.forEach((line, idx) => {
      const t = setTimeout(() => {
        setVisibleLines(prev => [...prev, line]);
      }, line.delay || idx * 300);
      timeouts.push(t);
    });

    // Mark stage as completed after all lines
    const lastDelay = stage.terminalLines[stage.terminalLines.length - 1]?.delay || 2000;
    const completeTimeout = setTimeout(() => {
      setCompletedStages(prev => new Set([...prev, activeStage]));
    }, lastDelay + 300);
    timeouts.push(completeTimeout);

    return () => timeouts.forEach(clearTimeout);
  }, [activeStage]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [visibleLines]);

  const handleStageClick = (idx) => {
    if (activeStage === idx) {
      setActiveStage(null);
      return;
    }
    
    setActiveStage(idx);

    // Fire a data packet from the clicked stage to the next
    if (idx < stages.length - 1) {
      const packetId = Date.now();
      setPackets(prev => [...prev, { id: packetId, from: idx, color: stages[idx].color }]);
      setTimeout(() => {
        setPackets(prev => prev.filter(p => p.id !== packetId));
      }, 700);
    }
  };

  return (
    <section style={{ padding: '60px 24px 80px', borderTop: '1px solid var(--border-color)', marginTop: '40px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h2 className="serif-title" style={{ fontSize: '32px', color: 'white', marginBottom: '16px', textAlign: 'center' }}>
          Core Investigative Capabilities
        </h2>
        <p style={{ color: 'var(--graphite)', fontSize: '14px', textAlign: 'center', marginBottom: '50px', maxWidth: '550px', margin: '0 auto 50px' }}>
          A deterministic, five-stage pipeline. Click any stage to observe the data flow.
        </p>

        {/* ── PIPELINE FLOW DIAGRAM ── */}
        <div style={{ position: 'relative', marginBottom: '40px' }}>
          
          {/* Connection Line (horizontal bar behind the nodes) */}
          <div style={{
            position: 'absolute',
            top: '28px',
            left: '10%',
            right: '10%',
            height: '2px',
            background: 'var(--border-color)',
            zIndex: 1
          }}>
            {/* Glow progress bar fills up to the active stage */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: activeStage !== null ? `${(activeStage / (stages.length - 1)) * 100}%` : '0%',
              background: 'linear-gradient(90deg, #00F2FE, #4FACFE, #00FF87)',
              boxShadow: '0 0 10px rgba(0, 242, 254, 0.5)',
              transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              borderRadius: '1px'
            }} />

            {/* Data packets */}
            {packets.map(p => (
              <DataPacket
                key={p.id}
                from={(p.from / (stages.length - 1)) * 100}
                to={((p.from + 1) / (stages.length - 1)) * 100}
                color={p.color}
                onComplete={() => {}}
              />
            ))}
          </div>

          {/* Pipeline Stage Nodes */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 5,
            padding: '0 5%'
          }}>
            {stages.map((stage, idx) => {
              const isActive = activeStage === idx;
              const isCompleted = completedStages.has(idx);
              
              return (
                <div
                  key={stage.id}
                  onClick={() => handleStageClick(idx)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    width: '100px',
                    textAlign: 'center',
                    transition: 'transform 0.3s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {/* Node Circle */}
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: `2px solid ${isActive ? stage.color : isCompleted ? stage.color : 'var(--border-color)'}`,
                    background: isActive 
                      ? `radial-gradient(circle, ${stage.color}22, transparent)` 
                      : isCompleted 
                        ? `radial-gradient(circle, ${stage.color}15, transparent)`
                        : 'var(--paper-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive || isCompleted ? stage.color : 'var(--graphite)',
                    transition: 'all 0.3s ease',
                    boxShadow: isActive 
                      ? `0 0 20px ${stage.color}55, 0 0 40px ${stage.color}22` 
                      : isCompleted 
                        ? `0 0 10px ${stage.color}33` 
                        : 'none',
                    position: 'relative'
                  }}>
                    {stage.icon}
                    
                    {/* Pulse ring animation when active */}
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        inset: '-6px',
                        borderRadius: '50%',
                        border: `1px solid ${stage.color}`,
                        opacity: 0.4,
                        animation: 'pulseRing 1.5s ease-out infinite'
                      }} />
                    )}
                  </div>

                  {/* Stage Label */}
                  <span className="mono-data" style={{
                    fontSize: '9px',
                    marginTop: '10px',
                    color: isActive ? stage.color : isCompleted ? 'var(--paper)' : 'var(--graphite)',
                    letterSpacing: '0.06em',
                    lineHeight: '1.3',
                    transition: 'color 0.3s ease',
                    textShadow: isActive ? `0 0 8px ${stage.color}55` : 'none'
                  }}>
                    {stage.label}
                  </span>

                  {/* Chevron connector (between nodes) */}
                  {idx < stages.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      left: `calc(${((idx + 0.5) / (stages.length - 1)) * 90 + 5}%)`,
                      top: '22px',
                      color: isCompleted ? stages[idx].color : 'var(--graphite)',
                      opacity: 0.5,
                      transition: 'color 0.3s, opacity 0.3s',
                      zIndex: 6,
                      pointerEvents: 'none'
                    }}>
                      <ChevronRight size={14} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── STAGE DETAIL PANEL ── */}
        <AnimatePresence mode="wait">
          {activeStage !== null && (
            <motion.div
              key={activeStage}
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div 
                className="dossier-card"
                style={{
                  border: `1px solid ${stages[activeStage].color}44`,
                  boxShadow: `0 0 30px ${stages[activeStage].color}15, var(--shadow-premium)`,
                  padding: '24px'
                }}
              >
                {/* Stage Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: stages[activeStage].color }}>{stages[activeStage].icon}</span>
                      <span className="mono-data" style={{ fontSize: '10px', color: stages[activeStage].color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        STAGE 0{activeStage + 1} — {stages[activeStage].label}
                      </span>
                    </div>
                    <h3 className="serif-title" style={{ fontSize: '22px', color: 'white', margin: '0 0 8px' }}>
                      {stages[activeStage].title}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--graphite)', lineHeight: '1.6', margin: 0, maxWidth: '500px' }}>
                      {stages[activeStage].desc}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    border: `1px solid ${stages[activeStage].color}33`,
                    borderRadius: '4px',
                    background: `${stages[activeStage].color}08`
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: stages[activeStage].color,
                      boxShadow: `0 0 6px ${stages[activeStage].color}`,
                      animation: 'pulseRing 1.5s ease-in-out infinite'
                    }} />
                    <span className="mono-data" style={{ fontSize: '9px', color: stages[activeStage].color }}>
                      LIVE
                    </span>
                  </div>
                </div>

                {/* Simulated Terminal */}
                <div 
                  ref={terminalRef}
                  style={{
                    background: '#04060a',
                    border: '1px solid var(--border-color)',
                    padding: '14px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    minHeight: '120px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)',
                    lineHeight: '1.7',
                    scrollBehavior: 'smooth'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--graphite)', fontSize: '8px', borderBottom: '1px solid rgba(0,242,254,0.08)', paddingBottom: '4px', marginBottom: '8px' }}>
                    <span>PIPELINE_STAGE_{stages[activeStage].id.toUpperCase()}</span>
                    <span style={{ color: stages[activeStage].color }}>EXECUTING</span>
                  </div>

                  {visibleLines.map((line, idx) => {
                    let color = 'var(--paper)';
                    if (line.type === 'cmd') color = 'var(--brass)';
                    else if (line.type === 'success') color = 'var(--verdict)';
                    else if (line.type === 'warn') color = 'var(--flag)';
                    else if (line.type === 'info') color = 'var(--graphite)';

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          color,
                          textShadow: line.type === 'success' || line.type === 'warn' ? '0 0 6px currentColor' : 'none'
                        }}
                      >
                        {line.text}
                      </motion.div>
                    );
                  })}

                  {/* Blinking cursor */}
                  {visibleLines.length < (stages[activeStage]?.terminalLines.length || 0) && (
                    <span style={{ color: stages[activeStage].color, animation: 'blink 1s step-end infinite' }}>▋</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No active stage hint */}
        {activeStage === null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              border: '1px dashed var(--border-color)',
              borderRadius: '6px',
              color: 'var(--graphite)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px'
            }}
          >
            Click any stage above to observe data flow through the pipeline.
          </motion.div>
        )}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </section>
  );
}
