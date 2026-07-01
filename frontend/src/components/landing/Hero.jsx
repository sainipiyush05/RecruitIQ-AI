import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, Lock, Unlock } from 'lucide-react';
import VerdictStamp from '../candidate/VerdictStamp';

// Simulated commands and responses for continuous terminal feed
const SIMULATED_STREAM = [
  { text: '$ recruitiq-agent scan --pool=active', type: 'cmd' },
  { text: '[SCAN] Auditing local parquet features...', type: 'info' },
  { text: '[OK] Loaded 100,000 candidate records.', type: 'success' },
  { text: '$ check-honeypots --strict=true', type: 'cmd' },
  { text: '[SAFE] 0 timeline overlap triggers detected.', type: 'success' },
  { text: '$ check-disqualifiers --active', type: 'cmd' },
  { text: '[OK] Exclusion filters validated on sample sets.', type: 'success' },
  { text: '$ recruitiq-agent speed-test', type: 'cmd' },
  { text: '[METRIC] Local vector re-rank completed in 1.84s.', type: 'info' },
  { text: '$ refresh-cache --bm25', type: 'cmd' },
  { text: '[OK] Lexical index sync completed successfully.', type: 'success' }
];

export default function Hero({ onStart }) {
  // Declassification Teaser Card State
  const [isDeclassified, setIsDeclassified] = useState(false);
  const [candidateName, setCandidateName] = useState('███████████');
  const [candidateRole, setCandidateRole] = useState('██████████████████████████');
  const [isShaking, setIsShaking] = useState(false);

  // Terminal Console Log lines
  const [terminalLogs, setTerminalLogs] = useState([
    { text: '$ recruitiq-agent init --vault', type: 'cmd' },
    { text: '[INFO] Security vault initialized successfully.', type: 'info' },
    { text: '[OK] Registry connection secure: 100K active profiles.', type: 'success' }
  ]);

  // Refs for 3D tilts and terminal scroll
  const card1Ref = useRef(null);
  const card2Ref = useRef(null);
  const terminalScrollRef = useRef(null);

  const [rX1, setRX1] = useState(0);
  const [rY1, setRY1] = useState(0);
  const [rX2, setRX2] = useState(0);
  const [rY2, setRY2] = useState(0);

  // Continuous Terminal Command Simulator loop
  useEffect(() => {
    let streamIdx = 0;
    const interval = setInterval(() => {
      setTerminalLogs(prev => {
        const nextLog = SIMULATED_STREAM[streamIdx];
        streamIdx = (streamIdx + 1) % SIMULATED_STREAM.length;
        
        // Keep logs compact (max 30 items for scroll history)
        const updated = [...prev, nextLog];
        if (updated.length > 30) {
          return updated.slice(updated.length - 20);
        }
        return updated;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Scroll terminal to bottom on new logs
  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Card 1 Mouse Move
  const handleCard1MouseMove = (e) => {
    const card = card1Ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRX1(-y / 15);
    setRY1(x / 15);
  };

  const handleCard1MouseLeave = () => {
    setRX1(0);
    setRY1(0);
  };

  // Card 2 Mouse Move
  const handleCard2MouseMove = (e) => {
    const card = card2Ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRX2(-y / 15);
    setRY2(x / 15);
  };

  const handleCard2MouseLeave = () => {
    setRX2(0);
    setRY2(0);
  };

  // Click declassify
  const handleDeclassifyClick = () => {
    if (isDeclassified) return;
    
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 250);

    const realName = 'Aria Sharma';
    const realRole = 'Principal IR & Retrieval Architect';
    
    setCandidateName(realName.replace(/./g, '#'));
    setCandidateRole(realRole.replace(/./g, '#'));
    setIsDeclassified(true);

    // Inject declassification events immediately
    setTerminalLogs(prev => [
      ...prev,
      { text: '$ declassify --id=CAND_0088192', type: 'cmd' },
      { text: '[DECRYPTING] Deciphering CAND_0088192 field hashes...', type: 'warn' },
      { text: '[OK] Decrypted Name: Aria Sharma', type: 'success' },
      { text: '[OK] Decrypted Role: Principal IR & Retrieval Architect', type: 'success' },
      { text: '[STATUS] Verified credentials applied: OK.', type: 'info' }
    ]);

    const chars = 'A#X$@O&981%?*Z';
    
    let iterName = 0;
    const intervalName = setInterval(() => {
      setCandidateName(() => {
        return realName.split('').map((char, idx) => {
          if (idx < Math.floor(iterName)) return realName[idx];
          if (realName[idx] === ' ') return ' ';
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
      });
      iterName += 0.4;
      if (iterName >= realName.length + 1) {
        clearInterval(intervalName);
        setCandidateName(realName);
      }
    }, 30);

    let iterRole = 0;
    const intervalRole = setInterval(() => {
      setCandidateRole(() => {
        return realRole.split('').map((char, idx) => {
          if (idx < Math.floor(iterRole)) return realRole[idx];
          if (realRole[idx] === ' ') return ' ';
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
      });
      iterRole += 0.6;
      if (iterRole >= realRole.length + 1) {
        clearInterval(intervalRole);
        setCandidateRole(realRole);
      }
    }, 25);
  };

  return (
    <section style={{ padding: '60px 24px 40px', maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
      
      {/* Top Badge */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '6px 14px', 
          border: '1px solid var(--border-color-active)', 
          background: 'rgba(0, 242, 254, 0.05)', 
          color: 'var(--brass)', 
          fontFamily: 'var(--font-mono)', 
          fontSize: '10px', 
          textTransform: 'uppercase', 
          letterSpacing: '0.12em', 
          marginBottom: '24px',
          borderRadius: '4px',
          boxShadow: '0 0 15px rgba(0, 242, 254, 0.1)'
        }}
      >
        <Shield size={12} />
        RECRUITER PIPELINE SANDBOX ACTIVE
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        style={{ 
          fontFamily: 'var(--font-hero)',
          fontWeight: 450,
          fontSize: 'clamp(42px, 6vw, 76px)', 
          lineHeight: '1.05', 
          color: 'white', 
          margin: '0 0 20px', 
          letterSpacing: '0.01em',
          fontOpticalSizing: 'auto',
          fontVariationSettings: '"slnt" 0, "CRSV" 0.5, "ELSH" 0, "ELXP" 0',
          textShadow: '0 0 40px rgba(0, 242, 254, 0.15), 0 10px 40px rgba(0,0,0,0.5)'
        }}
      >
        Every candidate resume,<br />
        <span style={{ 
          color: 'var(--brass)', 
          textShadow: '0 0 30px var(--brass-glow), 0 0 60px rgba(0, 242, 254, 0.1)',
          letterSpacing: '0.03em'
        }}>cross-examined.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        style={{ 
          fontFamily: 'var(--font-body)', 
          fontSize: '16px', 
          color: 'var(--graphite)', 
          maxWidth: '600px', 
          margin: '0 auto 32px', 
          lineHeight: '1.6'
        }}
      >
        Evaluate candidate registries against strict job specs offline. Score skill overlaps, trigger declassification decryption, and slam honeypot flags.
      </motion.p>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        style={{ marginBottom: '50px' }}
      >
        <button 
          onClick={onStart}
          className="btn-dossier primary"
          style={{ 
            padding: '12px 32px', 
            fontSize: '12px', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '10px'
          }}
        >
          Initialize Evidence Vault
          <ArrowRight size={14} />
        </button>
      </motion.div>

      {/* TWO REDUCED-SIZE BALANCED 3D TILT CARDS */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
          gap: '24px', 
          textAlign: 'left',
          width: '100%',
          maxWidth: '840px',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        
        {/* CARD 1: Declassification Teaser (Left) */}
        <div
          ref={card1Ref}
          onMouseMove={handleCard1MouseMove}
          onMouseLeave={handleCard1MouseLeave}
          style={{
            transform: `perspective(1000px) rotateX(${rX1}deg) rotateY(${rY1}deg)`,
            transformStyle: 'preserve-3d',
            transition: isShaking ? 'none' : 'transform 0.15s ease-out, border-color 0.2s, box-shadow 0.2s',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '290px',
            padding: '20px'
          }}
          className={`dossier-card ${isShaking ? 'shake-element' : ''}`}
        >
          <div>
            <h3 className="mono-data" style={{ fontSize: '10px', color: 'var(--brass)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px', borderBottom: '1px solid rgba(0, 242, 254, 0.12)', paddingBottom: '6px' }}>
              01. Declassification Teaser
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <span className="mono-data" style={{ color: 'var(--graphite)', fontSize: '9px' }}>DOSSIER ID</span>
                <div className="mono-data" style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginTop: '2px' }}>CAND_0088192</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="mono-data" style={{ color: 'var(--graphite)', fontSize: '9px' }}>SCORE</span>
                <div className="mono-data" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brass)', marginTop: '2px' }}>91.8%</div>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span className="mono-data" style={{ color: 'var(--graphite)', fontSize: '9px', display: 'block', marginBottom: '4px' }}>CANDIDATE IDENTITY</span>
              <div className="mono-data" style={{ fontSize: '16px', fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>
                {candidateName}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', fontSize: '12px', marginBottom: '14px' }}>
              <div>
                <span className="mono-data" style={{ color: 'var(--graphite)', fontSize: '9px' }}>ROLE DESIGNATION</span>
                <div style={{ color: 'var(--paper)', fontWeight: 500, marginTop: '2px', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.3' }}>{candidateRole}</div>
              </div>
              <div>
                <span className="mono-data" style={{ color: 'var(--graphite)', fontSize: '9px' }}>EXPERIENCE SUM</span>
                <div style={{ color: 'var(--paper)', fontWeight: 500, marginTop: '2px' }}>8.4 Years (Pune, IN)</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0, 242, 254, 0.08)', paddingTop: '12px', marginTop: '8px' }}>
            <button 
              onClick={handleDeclassifyClick}
              disabled={isDeclassified}
              className="btn-dossier"
              style={{ 
                padding: '6px 12px', 
                fontSize: '9px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                borderColor: isDeclassified ? 'transparent' : 'var(--border-color)',
                color: isDeclassified ? 'var(--verdict)' : 'white'
              }}
            >
              {isDeclassified ? <Unlock size={11} /> : <Lock size={11} />}
              {isDeclassified ? 'DECLASSIFIED' : 'DECLASSIFY'}
            </button>

            <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>
              {isDeclassified && <VerdictStamp isFlagged={false} isVerified={true} />}
            </div>
          </div>
        </div>

        {/* CARD 2: Interactive Terminal Console (Right) */}
        <div
          ref={card2Ref}
          onMouseMove={handleCard2MouseMove}
          onMouseLeave={handleCard2MouseLeave}
          style={{
            transform: `perspective(1000px) rotateX(${rX2}deg) rotateY(${rY2}deg)`,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.15s ease-out, border-color 0.2s, box-shadow 0.2s',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '290px',
            padding: '20px'
          }}
          className="dossier-card"
        >
          <div>
            <h3 className="mono-data" style={{ fontSize: '10px', color: 'var(--brass)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px', borderBottom: '1px solid rgba(0, 242, 254, 0.12)', paddingBottom: '6px' }}>
              02. Live Agent Console
            </h3>

            {/* Terminal Window */}
            <div 
              ref={terminalScrollRef}
              style={{
                background: '#04060a',
                border: '1px solid var(--border-color)',
                padding: '14px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--brass)',
                height: '190px',
                overflowY: 'auto',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)',
                lineHeight: '1.6',
                scrollBehavior: 'smooth'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--graphite)', fontSize: '8px', borderBottom: '1px solid rgba(0,242,254,0.08)', paddingBottom: '4px', marginBottom: '8px' }}>
                <span>AGENT_SYS_LOG</span>
                <span>ONLINE</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {terminalLogs.map((log, idx) => {
                  let color = 'var(--paper)';
                  if (log.type === 'cmd') color = 'var(--brass)';
                  else if (log.type === 'success') color = 'var(--verdict)';
                  else if (log.type === 'warn') color = 'var(--flag)';
                  else if (log.type === 'info') color = 'var(--graphite)';
                  
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        color, 
                        textShadow: log.type === 'success' || log.type === 'warn' ? '0 0 8px currentColor' : 'none'
                      }}
                    >
                      {log.text}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
