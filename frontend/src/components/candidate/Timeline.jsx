import React from 'react';

export default function Timeline({ history }) {
  if (!history || history.length === 0) {
    return <div style={{ color: 'var(--graphite)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>NO CAREER HISTORY FILED</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '14px', borderLeft: '1px solid var(--border-color)', marginLeft: '6px' }}>
      {history.map((job, idx) => (
        <div key={idx} style={{ position: 'relative' }}>
          {/* Timeline Dot Indicator */}
          <div 
            style={{ 
              position: 'absolute', 
              left: '-18px', 
              top: '5px', 
              width: '7px', 
              height: '7px', 
              borderRadius: '50%', 
              background: job.is_current ? 'var(--brass)' : 'var(--graphite)',
              boxShadow: job.is_current ? '0 0 8px var(--brass)' : 'none',
              border: '2px solid var(--ink)'
            }} 
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'white', fontWeight: 700 }}>{job.title}</span>
            <span style={{ color: 'var(--graphite)' }}>{job.duration_months} MOS</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--brass)', fontFamily: 'var(--font-mono)', marginTop: '2px', textTransform: 'uppercase' }}>
            {job.company}
          </div>
          {job.description && (
            <p style={{ fontSize: '12px', color: 'var(--graphite)', lineHeight: '1.5', margin: '6px 0 0' }}>
              {job.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
