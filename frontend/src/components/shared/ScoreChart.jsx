import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { BarChart2 } from 'lucide-react';

export default function ScoreChart({ data }) {
  return (
    <div className="dossier-card" style={{ padding: '20px', height: '220px', display: 'flex', flexDirection: 'column' }}>
      <h3 className="mono-data" style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', letterSpacing: '0.05em' }}>
        <BarChart2 size={15} style={{ color: 'var(--brass)' }} />
        Score Distribution (Count)
      </h3>
      <div style={{ flex: 1, width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              stroke="var(--graphite)" 
              fontSize={10} 
              tickLine={false} 
              fontFamily="var(--font-mono)"
            />
            <YAxis 
              stroke="var(--graphite)" 
              fontSize={10} 
              tickLine={false} 
              fontFamily="var(--font-mono)"
            />
            <Tooltip 
              contentStyle={{ 
                background: 'var(--ink)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '0px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--paper)'
              }}
              labelStyle={{ color: 'var(--brass)', fontWeight: 700 }}
              itemStyle={{ color: 'var(--paper)' }}
            />
            <Bar dataKey="count" fill="var(--brass)" radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
