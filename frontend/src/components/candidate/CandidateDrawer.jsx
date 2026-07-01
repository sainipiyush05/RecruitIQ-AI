import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, AlertOctagon, AlertTriangle } from 'lucide-react';
import ScoreBreakdown from './ScoreBreakdown';
import Timeline from './Timeline';
import VerdictStamp from './VerdictStamp';
import { toNum } from '../../lib/format';

export default function CandidateDrawer({ cand, configs, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!cand) return null;

  const isHoneypot = cand.features?.honeypot_risk > 0.3;
  const isDisqualified = cand.features?.disqualifier_multiplier < 0.6;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 1000, 
        display: 'flex', 
        justifyContent: 'flex-end',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%', opacity: 0.9 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0.9 }}
        transition={{ type: 'tween', duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: 'min(580px, 100%)',
          height: '100%',
          background: 'var(--paper-dim)',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.8)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gold header bar */}
        <div style={{ height: '4px', background: 'var(--brass)', width: '100%' }} />

        {/* Drawer Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="mono-data" style={{ fontSize: '18px', fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>
                {cand.candidate_id}
              </span>
              <VerdictStamp isFlagged={isHoneypot || isDisqualified} isVerified={!isHoneypot && !isDisqualified} />
            </div>
            <p className="mono-data" style={{ fontSize: '12px', color: 'var(--graphite)', margin: '4px 0 0' }}>
              {cand.profile?.anonymized_name || 'Anonymous'} • RANK {cand.rank}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="btn-dossier" 
            style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Score Highlight Box */}
          <div className="dossier-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
            <div>
              <h4 className="mono-data" style={{ fontSize: '11px', color: 'var(--graphite)', marginBottom: '4px', letterSpacing: '0.05em' }}>EVALUATION SCORE</h4>
              <span className="mono-data" style={{ fontSize: '36px', fontWeight: 800, color: 'var(--brass)', textShadow: '0 0 15px var(--brass-glow)' }}>
                {toNum(cand.score * 100).toFixed(1)}%
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="mono-data" style={{ fontSize: '11px', color: 'var(--graphite)', display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }}>RISK PENALTY</span>
              <span className="mono-data" style={{ fontSize: '16px', fontWeight: 700, color: isHoneypot ? 'var(--flag)' : 'var(--verdict)' }}>
                {isHoneypot ? `-${(cand.features?.honeypot_risk * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
          </div>

          {/* Honeypot Alert Warning */}
          {isHoneypot && (
            <div style={{ display: 'flex', gap: '12px', padding: '16px', border: '1px solid var(--flag)', background: 'rgba(212, 84, 72, 0.05)', color: 'var(--paper)', fontSize: '13px', lineHeight: '1.5' }}>
              <AlertOctagon size={18} style={{ color: 'var(--flag)', flexShrink: 0 }} />
              <div>
                <h5 className="mono-data" style={{ fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase', color: 'var(--flag)', textShadow: '0 0 8px var(--flag-glow)' }}>Honeypot Verification Triggered</h5>
                This candidate profile exhibits high-risk indicators such as career sum mismatch or expert proficiency claims with short tenure. Verification recommended.
              </div>
            </div>
          )}

          {/* Disqualification Penalty Warning */}
          {isDisqualified && (
            <div style={{ display: 'flex', gap: '12px', padding: '16px', border: '1px solid var(--flag)', background: 'rgba(212, 84, 72, 0.03)', color: 'var(--paper)', fontSize: '13px', lineHeight: '1.5' }}>
              <AlertTriangle size={18} style={{ color: 'var(--flag)', flexShrink: 0 }} />
              <div>
                <h5 className="mono-data" style={{ fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase', color: 'var(--flag)' }}>Exclusion Rules Triggered</h5>
                Profile matched negative search exclusions specified in the active Job Description, resulting in a structural match score penalty.
              </div>
            </div>
          )}

          {/* AI Evidence Explanation */}
          <div>
            <h4 className="mono-data" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--graphite)', marginBottom: '10px', letterSpacing: '0.05em' }}>Verified Evidence Statement</h4>
            <div style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)', padding: '16px', fontSize: '13px', lineHeight: '1.6', color: 'var(--paper)', borderRadius: '2px' }}>
              {cand.reasoning}
            </div>
          </div>

          {/* Profile overview specs */}
          <div>
            <h4 className="mono-data" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--graphite)', marginBottom: '10px', letterSpacing: '0.05em' }}>Profile Specs</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
              <div style={{ border: '1px solid var(--border-color)', padding: '12px 14px', background: 'rgba(255,255,255,0.01)' }}>
                <span className="mono-data" style={{ color: 'var(--graphite)', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Designation</span>
                <span style={{ fontWeight: 600, color: 'white', marginTop: '2px', display: 'block' }}>{cand.profile?.current_title || 'N/A'}</span>
              </div>
              <div style={{ border: '1px solid var(--border-color)', padding: '12px 14px', background: 'rgba(255,255,255,0.01)' }}>
                <span className="mono-data" style={{ color: 'var(--graphite)', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Total Experience</span>
                <span style={{ fontWeight: 600, color: 'white', marginTop: '2px', display: 'block' }}>{toNum(cand.features?.years_of_experience || cand.profile?.years_of_experience).toFixed(1)} Years</span>
              </div>
              <div style={{ border: '1px solid var(--border-color)', padding: '12px 14px', background: 'rgba(255,255,255,0.01)' }}>
                <span className="mono-data" style={{ color: 'var(--graphite)', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Location</span>
                <span style={{ fontWeight: 600, color: 'white', marginTop: '2px', display: 'block' }}>{cand.profile?.location || 'India'}</span>
              </div>
              <div style={{ border: '1px solid var(--border-color)', padding: '12px 14px', background: 'rgba(255,255,255,0.01)' }}>
                <span className="mono-data" style={{ color: 'var(--graphite)', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Notice Period</span>
                <span style={{ fontWeight: 600, color: 'white', marginTop: '2px', display: 'block' }}>{cand.redrob_signals?.notice_period_days || 30} Days</span>
              </div>
            </div>
          </div>

          {/* Scoring breakdown bars */}
          <div>
            <h4 className="mono-data" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--graphite)', marginBottom: '12px', letterSpacing: '0.05em' }}>Component Score Analysis</h4>
            <div className="dossier-card" style={{ padding: '20px', background: 'rgba(0,0,0,0.1)' }}>
              <ScoreBreakdown features={cand.features} />
            </div>
          </div>

          {/* Skills Grid */}
          <div>
            <h4 className="mono-data" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--graphite)', marginBottom: '12px', letterSpacing: '0.05em' }}>Verified Skill Inventory</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {cand.skills?.map((sk, idx) => {
                const isMandatory = configs?.jd_profile?.mandatory_skills?.some(s => s.toLowerCase() === sk.name.toLowerCase());
                const isPreferred = configs?.jd_profile?.preferred_skills?.some(s => s.toLowerCase() === sk.name.toLowerCase());

                return (
                  <span 
                    key={idx} 
                    style={{ 
                      fontSize: '11px', 
                      padding: '4px 10px', 
                      border: isMandatory ? '1px solid var(--brass)' : (isPreferred ? '1px solid var(--verdict)' : '1px solid var(--border-color)'),
                      background: isMandatory ? 'rgba(220, 174, 90, 0.05)' : (isPreferred ? 'rgba(91, 168, 120, 0.05)' : 'rgba(255,255,255,0.02)'),
                      color: isMandatory ? 'var(--brass)' : (isPreferred ? 'var(--verdict)' : 'var(--paper)'),
                      fontFamily: 'var(--font-mono)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      borderRadius: '2px'
                    }}
                  >
                    {sk.name}
                    {sk.endorsements > 0 && <span style={{ color: 'var(--graphite)', fontSize: '9px' }}>({sk.endorsements})</span>}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Career History Timeline */}
          <div>
            <h4 className="mono-data" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--graphite)', marginBottom: '16px', letterSpacing: '0.05em' }}>Timeline Verification</h4>
            <Timeline history={cand.career_history} />
          </div>

        </div>
      </motion.div>
    </div>
  );
}
