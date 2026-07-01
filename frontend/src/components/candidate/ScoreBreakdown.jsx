import React from 'react';
import { toNum } from '../../lib/format';

export default function ScoreBreakdown({ features }) {
  const components = [
    {
      label: "Technical Fit (Skills & Focus)",
      value: (features.mandatory_skill_coverage * 100),
      color: 'var(--brass)'
    },
    {
      label: "Semantic Similarity (JD Match)",
      value: (features.embedding_similarity * 100),
      color: 'var(--brass)'
    },
    {
      label: "Career Quality & Tenure",
      value: (features.product_company_ratio * 100),
      color: 'var(--brass)'
    },
    {
      label: "Behavioral Readiness",
      value: (features.behavioral_readiness * 100),
      color: 'var(--brass)'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {components.map((c, idx) => (
        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--graphite)', textTransform: 'uppercase' }}>{c.label}</span>
            <span style={{ color: 'white', fontWeight: 700 }}>{toNum(c.value).toFixed(0)}%</span>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', height: '4px', position: 'relative' }}>
            <div 
              style={{ 
                height: '100%', 
                background: c.color, 
                width: `${Math.max(0, Math.min(100, toNum(c.value)))}%`, 
                position: 'absolute', 
                left: 0, 
                top: 0 
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
