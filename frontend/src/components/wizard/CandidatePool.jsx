import React, { useState, useRef } from 'react';
import { Upload, Sparkles, ArrowLeft, RefreshCw, Layers } from 'lucide-react';
import { uploadAndRank, rankLocalCandidates } from '../../lib/api';

export default function CandidatePool({ onBack, onRanked, targetLimit, setTargetLimit }) {
  const [uploadMethod, setUploadMethod] = useState('upload'); // 'upload' | 'local'
  const [localFilePath, setLocalFilePath] = useState('data/sample_candidates.json');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    try {
      const data = await uploadAndRank(file, targetLimit);
      onRanked(data.results || [], file.name);
    } catch (err) {
      console.error(err);
      alert(`Upload ranking failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalLoad = async () => {
    if (!localFilePath.trim()) {
      alert("Please specify a local file path.");
      return;
    }
    setLoading(true);
    setFileName(localFilePath.split('/').pop());
    try {
      const data = await rankLocalCandidates(localFilePath, targetLimit);
      onRanked(data.results || [], localFilePath);
    } catch (err) {
      console.error(err);
      alert(`Local ranking failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dossier-card" style={{ background: 'var(--paper-dim)', padding: '40px', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        <Layers size={40} style={{ color: 'var(--brass)', marginBottom: '16px' }} />
        <h2 className="serif-title" style={{ fontSize: '24px', color: 'white', marginBottom: '8px' }}>
          Select Candidate Registry
        </h2>
        <p style={{ color: 'var(--graphite)', fontSize: '13px', marginBottom: '32px', lineHeight: '1.5' }}>
          Provide the candidate pool data. You can upload a JSON/JSONL file directly, or specify a cached registry path on the server for sub-second evaluations.
        </p>

        {/* Query Sizing Input */}
        <div style={{ maxWidth: '320px', margin: '0 auto 30px', textAlign: 'left', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '2px', background: 'rgba(0,0,0,0.1)' }}>
          <label className="mono-data" style={{ display: 'block', fontSize: '11px', color: 'var(--graphite)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Pipeline Retrieval Limit
          </label>
          <input 
            type="number" 
            value={targetLimit} 
            min="1"
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setTargetLimit(isNaN(val) ? 100 : val);
            }}
            style={{ 
              width: '100%', 
              padding: '8px 12px', 
              background: 'rgba(0,0,0,0.2)', 
              border: '1px solid var(--border-color)', 
              color: 'white', 
              fontSize: '13px', 
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <small style={{ display: 'block', color: 'var(--graphite)', fontSize: '11px', marginTop: '6px', lineHeight: '1.4' }}>
            The evaluation engine will retrieve the top N highest-scoring candidates matching your profile criteria.
          </small>
        </div>

        {/* Tab buttons */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', gap: '20px', justifyContent: 'center' }}>
          <button 
            onClick={() => setUploadMethod('upload')} 
            className="mono-data"
            style={{ 
              background: 'none', 
              border: 'none', 
              borderBottom: uploadMethod === 'upload' ? '2px solid var(--brass)' : '2px solid transparent', 
              color: uploadMethod === 'upload' ? 'white' : 'var(--graphite)', 
              paddingBottom: '10px', 
              fontWeight: 700, 
              fontSize: '11px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Direct File Upload
          </button>
          <button 
            onClick={() => setUploadMethod('local')} 
            className="mono-data"
            style={{ 
              background: 'none', 
              border: 'none', 
              borderBottom: uploadMethod === 'local' ? '2px solid var(--brass)' : '2px solid transparent', 
              color: uploadMethod === 'local' ? 'white' : 'var(--graphite)', 
              paddingBottom: '10px', 
              fontWeight: 700, 
              fontSize: '11px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Server Path Cache
          </button>
        </div>

        {uploadMethod === 'upload' ? (
          /* File Uploader */
          <div 
            onClick={() => !loading && fileInputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); }}
            style={{
              border: dragOver ? '1px dashed var(--brass)' : '1px dashed var(--border-color)',
              background: dragOver ? 'rgba(198, 150, 62, 0.03)' : 'rgba(0,0,0,0.1)',
              padding: '50px 24px',
              textAlign: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'var(--transition-smooth)',
              margin: '20px 0'
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }}
              accept=".json,.jsonl"
              onChange={(e) => handleFileUpload(e.target.files[0])}
              disabled={loading}
            />
            {loading ? (
              <>
                <RefreshCw size={36} className="spinning" style={{ color: 'var(--brass)', marginBottom: '16px' }} />
                <p className="mono-data" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--paper)' }}>Running Dynamic Re-Scoring...</p>
                <p style={{ color: 'var(--graphite)', fontSize: '12px', marginTop: '6px' }}>Cleaning profiles, computing lexical overlaps, and checking for honeypots...</p>
              </>
            ) : (
              <>
                <Upload size={36} style={{ color: 'var(--brass)', marginBottom: '16px' }} />
                <p className="mono-data" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--paper)', margin: '0 0 4px' }}>
                  DRAG & DROP DATABASE FILE (.JSON / .JSONL)
                </p>
                <p style={{ color: 'var(--graphite)', fontSize: '12px', margin: 0 }}>
                  or click to select candidates file
                </p>
                {fileName && (
                  <div style={{ marginTop: '16px', display: 'inline-block', padding: '4px 8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    {fileName}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Local Path Loader */
          <div style={{ textAlign: 'left', margin: '20px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              <label className="mono-data" style={{ fontSize: '10px', color: 'var(--graphite)', textTransform: 'uppercase' }}>Select Cached Database</label>
              <select
                value={localFilePath}
                onChange={(e) => setLocalFilePath(e.target.value)}
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--paper)', padding: '10px', fontSize: '13px', outline: 'none', height: '39px' }}
              >
                <option value="data/candidates.jsonl">data/candidates.jsonl (Full 100K Registry - Precomputed)</option>
                <option value="data/sample_candidates.json">data/sample_candidates.json (Small Sample Registry)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
              <label className="mono-data" style={{ fontSize: '10px', color: 'var(--graphite)', textTransform: 'uppercase' }}>Or Specify Custom File Path</label>
              <input 
                type="text" 
                value={localFilePath} 
                onChange={(e) => setLocalFilePath(e.target.value)}
                placeholder="e.g. data/candidates.jsonl"
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--paper)', padding: '10px', fontSize: '13px', outline: 'none' }}
              />
              <small style={{ color: 'var(--graphite)', fontSize: '11px', marginTop: '4px', lineHeight: '1.4' }}>
                Enter the absolute or workspace-relative path of the candidate file on the server.
              </small>
            </div>

            <button
              onClick={handleLocalLoad}
              disabled={loading}
              className="btn-dossier primary"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="spinning" />
                  PROCESSING DATABASE...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  LOAD & SCORE REGISTER
                </>
              )}
            </button>
          </div>
        )}

        {/* Back Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '24px' }}>
          <button 
            onClick={onBack} 
            className="btn-dossier" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            disabled={loading}
          >
            <ArrowLeft size={14} />
            BACK TO SPEC FORM
          </button>
        </div>

      </div>
    </div>
  );
}
