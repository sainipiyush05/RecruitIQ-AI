import React, { useState, useEffect, useRef } from 'react';

const BOOT_SEQUENCE = [
  { text: 'INITIALIZING SECURE VAULT CONNECTION...', delay: 0 },
  { text: '[OK] TLS handshake verified.', delay: 400 },
  { text: '[OK] bge-base-en-v1.5 embeddings loaded (4.2 GB).', delay: 800 },
  { text: '[OK] BM25 lexical index mounted.', delay: 1200 },
  { text: '[OK] Honeypot ruleset compiled (127 patterns).', delay: 1600 },
  { text: 'LOADING CANDIDATE REGISTRY...', delay: 2000 },
  { text: '[OK] 100,000 candidate profiles online.', delay: 2500 },
  { text: 'ALL SYSTEMS NOMINAL. LAUNCHING INTERFACE...', delay: 3200 },
];

export default function SplashScreen({ onComplete }) {
  const [visibleLines, setVisibleLines] = useState([]);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('boot'); // 'boot' | 'reveal' | 'done'
  const [glitchName, setGlitchName] = useState('');
  const canvasRef = useRef(null);

  // Canvas scan-line effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let scanY = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Moving scan line
      scanY = (scanY + 1.5) % height;
      const gradient = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.5, 'rgba(0, 242, 254, 0.04)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, scanY - 30, width, 60);

      raf = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Name decrypt effect
  useEffect(() => {
    const target = 'RecruitIQ AI';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*0123456789';
    let iteration = 0;

    const interval = setInterval(() => {
      setGlitchName(
        target.split('').map((char, idx) => {
          if (char === ' ') return ' ';
          if (idx < Math.floor(iteration)) return target[idx];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('')
      );
      iteration += 0.3;
      if (iteration >= target.length + 1) {
        clearInterval(interval);
        setGlitchName(target);
      }
    }, 40);

    return () => clearInterval(interval);
  }, []);

  // Boot sequence terminal lines
  useEffect(() => {
    const timeouts = [];

    BOOT_SEQUENCE.forEach((line, idx) => {
      timeouts.push(setTimeout(() => {
        setVisibleLines(prev => [...prev, line.text]);
        // Progress bar mapped to boot sequence progress
        setProgress(((idx + 1) / BOOT_SEQUENCE.length) * 100);
      }, line.delay));
    });

    // After boot sequence completes, transition to reveal phase
    timeouts.push(setTimeout(() => {
      setPhase('reveal');
    }, 3800));

    // Then fade out and call onComplete
    timeouts.push(setTimeout(() => {
      setPhase('done');
    }, 4600));

    timeouts.push(setTimeout(() => {
      onComplete();
    }, 5200));

    return () => timeouts.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: '#05070B',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: phase === 'done' ? 0 : 1,
      transition: 'opacity 0.6s ease-out',
      overflow: 'hidden'
    }}>
      {/* Canvas scan line */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      />

      {/* Center content */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '560px', padding: '0 24px' }}>
        
        {/* Shield icon with pulse */}
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 24px',
          border: '2px solid rgba(0, 242, 254, 0.3)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          animation: 'splashPulse 2s ease-in-out infinite'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00F2FE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          {/* Outer pulse ring */}
          <div style={{
            position: 'absolute',
            inset: '-8px',
            borderRadius: '50%',
            border: '1px solid rgba(0, 242, 254, 0.2)',
            animation: 'splashRing 2s ease-out infinite'
          }} />
        </div>

        {/* Glitching brand name */}
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(32px, 6vw, 56px)',
          color: '#fff',
          margin: '0 0 6px',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          textShadow: '0 0 40px rgba(0, 242, 254, 0.15)'
        }}>
          {glitchName || 'RecruitIQ AI'}
        </h1>

        {/* Tagline */}
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: 'rgba(0, 242, 254, 0.5)',
          margin: '0 0 40px'
        }}>
          Candidate Evidence Vault
        </p>

        {/* Progress bar */}
        <div style={{
          width: '280px',
          height: '2px',
          background: 'rgba(0, 242, 254, 0.1)',
          borderRadius: '1px',
          margin: '0 auto 20px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #00F2FE, #4FACFE)',
            borderRadius: '1px',
            transition: 'width 0.3s ease-out',
            boxShadow: '0 0 10px rgba(0, 242, 254, 0.5)'
          }} />
        </div>

        {/* Boot sequence terminal */}
        <div style={{
          textAlign: 'left',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          lineHeight: '1.8',
          minHeight: '140px',
          color: 'rgba(139, 155, 180, 0.7)'
        }}>
          {visibleLines.map((line, idx) => {
            const isOk = line.startsWith('[OK]');
            const isAction = !line.startsWith('[');
            return (
              <div
                key={idx}
                style={{
                  color: isAction ? 'rgba(0, 242, 254, 0.6)' : isOk ? 'rgba(0, 255, 135, 0.5)' : 'rgba(139, 155, 180, 0.5)',
                  animation: 'splashLineIn 0.3s ease-out'
                }}
              >
                {isAction ? `> ${line}` : `  ${line}`}
              </div>
            );
          })}
          
          {/* Blinking cursor */}
          {phase === 'boot' && (
            <span style={{
              color: 'rgba(0, 242, 254, 0.5)',
              animation: 'splashBlink 0.8s step-end infinite'
            }}>▋</span>
          )}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes splashPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 242, 254, 0.15); }
          50% { box-shadow: 0 0 30px 5px rgba(0, 242, 254, 0.1); }
        }
        @keyframes splashRing {
          0% { transform: scale(1); opacity: 0.3; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes splashBlink {
          50% { opacity: 0; }
        }
        @keyframes splashLineIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
