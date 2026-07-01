import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock } from 'lucide-react';
import { CHART_COLORS } from '../../lib/format';

export default function NoticeChart({ data }) {
  const filteredData = data.filter(d => d.value > 0);

  return (
    <div className="dossier-card" style={{ padding: '20px', height: '220px', display: 'flex', flexDirection: 'column' }}>
      <h3 className="mono-data" style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', letterSpacing: '0.05em' }}>
        <Clock size={15} style={{ color: 'var(--brass)' }} />
        Notice Period Breakdown
      </h3>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
        {filteredData.length > 0 ? (
          <>
            <div style={{ width: '45%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={filteredData}
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {filteredData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', width: '55%', fontFamily: 'var(--font-mono)' }}>
              {filteredData.map((d, index) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                  <span style={{ color: 'var(--graphite)', textTransform: 'uppercase' }}>{d.name.split(' ')[0]}:</span>
                  <span style={{ color: 'var(--paper)', fontWeight: 700 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, textAlign: 'center', color: 'var(--graphite)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            NO DATA RECORDED
          </div>
        )}
      </div>
    </div>
  );
}
