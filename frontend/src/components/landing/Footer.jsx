import React from 'react';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border-color)', padding: '40px 24px', marginTop: '60px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--brass)', padding: '6px', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={16} color="#15130F" />
          </div>
          <div>
            <span className="serif-title" style={{ fontWeight: 800, fontSize: '16px', color: 'white' }}>RecruitIQ AI</span>
            <p className="mono-data" style={{ fontSize: '10px', color: 'var(--graphite)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evidence Verification Protocol</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          <a href="https://github.com/sainipiyush05/RecruitIQ-AI" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--graphite)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'var(--brass)'} onMouseLeave={e => e.target.style.color = 'var(--graphite)'}>GITHUB_SOURCE</a>
          <span style={{ color: 'rgba(138, 131, 117, 0.2)' }}>|</span>
          <span style={{ color: 'var(--graphite)' }}>Team No_Connection</span>
          <span style={{ color: 'rgba(138, 131, 117, 0.2)' }}>|</span>
          <span style={{ color: 'var(--graphite)' }}>© 2026</span>
        </div>
      </div>
    </footer>
  );
}
