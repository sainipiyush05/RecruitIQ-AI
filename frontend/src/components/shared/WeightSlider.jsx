import React from 'react';
import { toNum } from '../../lib/format';

export default function WeightSlider({ label, value, onChange }) {
  const cleanLabel = label.replace(/_/g, ' ');

  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
        <span style={{ color: 'var(--graphite)', textTransform: 'uppercase' }}>{cleanLabel}</span>
        <span style={{ color: 'var(--brass)', fontWeight: 700 }}>{toNum(value).toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ width: '100%', height: '4px', cursor: 'pointer' }}
        />
      </div>
    </div>
  );
}
