import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import VerdictStamp from './VerdictStamp';
import { toNum, getTopSkills, getExperienceSummary } from '../../lib/format';

export default function CandidateCard({ cand, jdProfile, onClick }) {
  const isHoneypot = cand.features?.honeypot_risk > 0.3;
  const isDisqualified = cand.features?.disqualifier_multiplier < 0.6;
  const isTop3 = cand.rank <= 3;
  
  const shouldReduceMotion = useReducedMotion();

  // Redaction animation variants
  const redactionVariants = {
    initial: { scaleX: 1 },
    hover: { 
      scaleX: 0,
      transition: { 
        duration: shouldReduceMotion ? 0 : 0.22, 
        ease: [0.16, 1, 0.3, 1] 
      }
    }
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover="hover"
      className="dossier-card"
      style={{
        background: 'var(--paper-dim)',
        border: '1px solid var(--border-color)',
        borderRadius: '2px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '240px',
        overflow: 'hidden',
        position: 'relative',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
      }}
    >
      <div>
        {/* Header containing ID, Rank and Score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(138, 131, 117, 0.1)', paddingBottom: '10px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              className="mono-data" 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                background: isTop3 ? 'var(--brass)' : 'rgba(255,255,255,0.06)',
                color: isTop3 ? 'var(--ink)' : 'var(--paper)',
                fontWeight: 700,
                fontSize: '10px'
              }}
            >
              {cand.rank}
            </span>
            <span className="mono-data" style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>
              {cand.candidate_id}
            </span>
          </div>
          <div className="mono-data" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brass)' }}>
            {toNum(cand.score * 100).toFixed(1)}%
          </div>
        </div>

        {/* Anonymized Name (Redaction reveal) */}
        <div style={{ marginBottom: '6px' }}>
          <span className="mono-data" style={{ color: 'var(--graphite)', fontSize: '9px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Candidate Identity</span>
          <div className="redacted-wrapper" style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>
            <span>{cand.profile?.anonymized_name || "Unknown Candidate"}</span>
            <motion.div 
              variants={redactionVariants}
              initial="initial"
              className="redaction-bar"
            />
          </div>
        </div>

        {/* Headline (Redaction reveal) */}
        <div style={{ marginBottom: '12px' }}>
          <div className="redacted-wrapper" style={{ fontSize: '12px', color: 'var(--paper)', fontWeight: 500 }}>
            <span>{cand.profile?.current_title || "Software Engineer"}</span>
            <motion.div 
              variants={redactionVariants}
              initial="initial"
              className="redaction-bar"
            />
          </div>
        </div>

        {/* Experience Summary & Skills */}
        <div style={{ fontSize: '12px', color: 'var(--graphite)', lineHeight: '1.4' }}>
          <div style={{ marginBottom: '2px' }}>
            <span style={{ color: 'var(--paper)' }}>Exp:</span> {getExperienceSummary(cand)}
          </div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--paper)' }}>Skills:</span> {getTopSkills(cand, jdProfile)}
          </div>
        </div>
      </div>

      {/* Footer and Stamps */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(138, 131, 117, 0.06)', paddingTop: '10px', marginTop: '10px' }}>
        <span className="mono-data" style={{ fontSize: '10px', color: 'var(--graphite)' }}>
          {cand.profile?.location || "India"}
        </span>
        
        <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>
          <VerdictStamp isFlagged={isHoneypot || isDisqualified} isVerified={!isHoneypot && !isDisqualified} />
        </div>
      </div>
    </motion.div>
  );
}
