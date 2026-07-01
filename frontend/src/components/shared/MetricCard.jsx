import React from 'react';

export default function MetricCard({ label, value, icon, colorClass = '' }) {
  // colorClass can be 'primary' | 'secondary' | 'accent' | 'danger'
  const getBoxStyle = () => {
    switch (colorClass) {
      case 'primary':
        return { background: 'rgba(198, 150, 62, 0.05)', color: 'var(--brass)' };
      case 'secondary':
        return { background: 'rgba(76, 122, 92, 0.05)', color: 'var(--verdict)' };
      case 'danger':
        return { background: 'rgba(162, 62, 50, 0.05)', color: 'var(--flag)' };
      default:
        return { background: 'rgba(138, 131, 117, 0.05)', color: 'var(--graphite)' };
    }
  };

  return (
    <div className="dossier-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'var(--paper-dim)' }}>
      <div style={{ padding: '10px', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...getBoxStyle() }}>
        {icon}
      </div>
      <div>
        <h4 className="mono-data" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--graphite)', margin: '0 0 4px', letterSpacing: '0.05em' }}>
          {label}
        </h4>
        <p className="mono-data" style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: 0 }}>
          {value}
        </p>
      </div>
    </div>
  );
}
