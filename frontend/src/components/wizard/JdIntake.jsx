import React, { useState, useRef } from 'react';
import { Upload, Sparkles } from 'lucide-react';
import { analyzeJd } from '../../lib/api';

export default function JdIntake({ analyzedJd, setAnalyzedJd, onProceed }) {
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleAnalyze = async (textToAnalyze) => {
    const text = textToAnalyze || jdText;
    if (!text.trim()) {
      alert("Please paste the Job Description or upload a file first.");
      return;
    }
    setLoading(true);
    try {
      const data = await analyzeJd(text);
      setAnalyzedJd({
        mandatory_skills: data.mandatory_skills?.join(', ') || '',
        preferred_skills: data.preferred_skills?.join(', ') || '',
        ideal_profile_text: data.ideal_profile_text || '',
        location_preference: {
          ideal: data.location_preference?.ideal?.join(', ') || '',
          acceptable: data.location_preference?.acceptable?.join(', ') || '',
          outside_india: data.location_preference?.outside_india || 'case_by_case_no_visa'
        },
        notice_period_preference: {
          ideal_max_days: data.notice_period_preference?.ideal_max_days || 30,
          buyout_max_days: data.notice_period_preference?.buyout_max_days || 30
        }
      });
    } catch (err) {
      console.error(err);
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setJdText(text);
      handleAnalyze(text);
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Upload/Paste box */}
      <div className="dossier-card" style={{ background: 'var(--paper-dim)' }}>
        <h2 className="serif-title" style={{ fontSize: '22px', color: 'white', marginBottom: '8px' }}>
          Job Description Indexing
        </h2>
        <p style={{ color: 'var(--graphite)', fontSize: '13px', marginBottom: '24px', lineHeight: '1.5' }}>
          Provide the raw Job Description text. RecruitIQ AI will parse the profile requirements, target locations, and notice period constraints locally.
        </p>

        {/* Drag & Drop Area */}
        <div 
          onClick={() => fileInputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); }}
          style={{
            border: dragOver ? '1px dashed var(--brass)' : '1px dashed var(--border-color)',
            background: dragOver ? 'rgba(220, 174, 90, 0.03)' : 'rgba(0,0,0,0.1)',
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            marginBottom: '20px',
            borderRadius: '4px'
          }}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }}
            accept=".txt,.md"
            onChange={(e) => handleFileUpload(e.target.files[0])}
          />
          <Upload size={32} style={{ color: 'var(--brass)', marginBottom: '12px' }} />
          <p className="mono-data" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--paper)', margin: '0 0 4px' }}>
            DRAG & DROP JOB FILE (.TXT / .MD)
          </p>
          <p style={{ color: 'var(--graphite)', fontSize: '12px', margin: 0 }}>
            or click to browse local files
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--graphite)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          <span style={{ padding: '0 12px' }}>OR PASTE DOSSIER SPECIFICATION</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>

        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste raw job description details here..."
          style={{
            width: '100%',
            height: '180px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'var(--paper)',
            padding: '16px',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            lineHeight: '1.6',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button 
            onClick={() => handleAnalyze()}
            disabled={loading}
            className="btn-dossier"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Sparkles size={14} />
            {loading ? 'PARSING PROFILE...' : 'ANALYSE JOB DESCRIPTION'}
          </button>
        </div>
      </div>

      {/* Editor Form */}
      {analyzedJd && (
        <div className="dossier-card" style={{ border: '1px solid var(--border-color-active)', background: 'var(--paper-dim)' }}>
          <h3 className="mono-data" style={{ fontSize: '13px', color: 'var(--brass)', marginBottom: '18px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Verify Declassified Profile Specs
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="mono-data" style={{ fontSize: '10px', color: 'var(--graphite)', textTransform: 'uppercase' }}>Mandatory Skills (comma-separated)</label>
              <input 
                type="text" 
                value={analyzedJd.mandatory_skills} 
                onChange={(e) => setAnalyzedJd({ ...analyzedJd, mandatory_skills: e.target.value })}
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--paper)', padding: '10px', fontSize: '13px', outline: 'none', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="mono-data" style={{ fontSize: '10px', color: 'var(--graphite)', textTransform: 'uppercase' }}>Preferred Skills (comma-separated)</label>
              <input 
                type="text" 
                value={analyzedJd.preferred_skills} 
                onChange={(e) => setAnalyzedJd({ ...analyzedJd, preferred_skills: e.target.value })}
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--paper)', padding: '10px', fontSize: '13px', outline: 'none', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="mono-data" style={{ fontSize: '10px', color: 'var(--graphite)', textTransform: 'uppercase' }}>Ideal Cities</label>
                <input 
                  type="text" 
                  value={analyzedJd.location_preference.ideal} 
                  onChange={(e) => setAnalyzedJd({
                    ...analyzedJd,
                    location_preference: { ...analyzedJd.location_preference, ideal: e.target.value }
                  })}
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--paper)', padding: '10px', fontSize: '13px', outline: 'none', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="mono-data" style={{ fontSize: '10px', color: 'var(--graphite)', textTransform: 'uppercase' }}>Acceptable Cities</label>
                <input 
                  type="text" 
                  value={analyzedJd.location_preference.acceptable} 
                  onChange={(e) => setAnalyzedJd({
                    ...analyzedJd,
                    location_preference: { ...analyzedJd.location_preference, acceptable: e.target.value }
                  })}
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--paper)', padding: '10px', fontSize: '13px', outline: 'none', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="mono-data" style={{ fontSize: '10px', color: 'var(--graphite)', textTransform: 'uppercase' }}>Notice Period Max (Days)</label>
                <input 
                  type="number" 
                  value={analyzedJd.notice_period_preference.ideal_max_days} 
                  onChange={(e) => setAnalyzedJd({
                    ...analyzedJd,
                    notice_period_preference: {
                      ideal_max_days: parseInt(e.target.value) || 30,
                      buyout_max_days: parseInt(e.target.value) || 30
                    }
                  })}
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--paper)', padding: '10px', fontSize: '13px', outline: 'none', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="mono-data" style={{ fontSize: '10px', color: 'var(--graphite)', textTransform: 'uppercase' }}>Out-Of-Region Candidates</label>
                <select 
                  value={analyzedJd.location_preference.outside_india}
                  onChange={(e) => setAnalyzedJd({
                    ...analyzedJd,
                    location_preference: { ...analyzedJd.location_preference, outside_india: e.target.value }
                  })}
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--paper)', padding: '10px', fontSize: '13px', outline: 'none', height: '39px', borderRadius: '4px' }}
                >
                  <option value="case_by_case_no_visa">Case-by-case (No Visa Support)</option>
                  <option value="allow_all">Allow International</option>
                  <option value="reject_outside">Strictly Remote/Domestic Only</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="mono-data" style={{ fontSize: '10px', color: 'var(--graphite)', textTransform: 'uppercase' }}>Ideal Profile Spec Statement</label>
              <textarea 
                value={analyzedJd.ideal_profile_text} 
                onChange={(e) => setAnalyzedJd({ ...analyzedJd, ideal_profile_text: e.target.value })}
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--paper)', padding: '10px', fontSize: '13px', outline: 'none', height: '60px', resize: 'vertical', fontFamily: 'var(--font-body)', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button 
                onClick={() => setAnalyzedJd(null)}
                className="btn-dossier"
              >
                RESET/RE-UPLOAD 
              </button>
              <button 
                onClick={onProceed}
                className="btn-dossier primary"
              >
                SAVE JD AND PROCEED
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
