import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import StepTabs from '../components/shared/StepTabs';
import JdIntake from '../components/wizard/JdIntake';
import CandidatePool from '../components/wizard/CandidatePool';
import ResultsDashboard from '../components/wizard/ResultsDashboard';
import CandidateDrawer from '../components/candidate/CandidateDrawer';
import { AnimatePresence } from 'framer-motion';
import { fetchConfigs, updateConfigs, rankCandidates } from '../lib/api';
import { toNum, getTopSkills, getExperienceSummary } from '../lib/format';

export default function Wizard({ onBackToLanding }) {
  const [activeStep, setActiveStep] = useState('jd'); // 'jd' | 'candidates' | 'results'
  const [candidates, setCandidates] = useState([]);
  const [configs, setConfigs] = useState(null);
  const [analyzedJd, setAnalyzedJd] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [targetLimit, setTargetLimit] = useState(100);
  const [rawUploadedCandidates, setRawUploadedCandidates] = useState([]);

  // Load configs on startup
  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      const data = await fetchConfigs();
      setConfigs(data);
      if (data.jd_profile && !analyzedJd) {
        setAnalyzedJd({
          ...data.jd_profile,
          mandatory_skills: data.jd_profile.mandatory_skills?.join(', ') || '',
          preferred_skills: data.jd_profile.preferred_skills?.join(', ') || '',
          location_preference: {
            ...data.jd_profile.location_preference,
            ideal: data.jd_profile.location_preference?.ideal?.join(', ') || '',
            acceptable: data.jd_profile.location_preference?.acceptable?.join(', ') || ''
          }
        });
      }
    } catch (err) {
      console.error('Error fetching configurations:', err);
    }
  };

  const handleSaveJdAndProceed = async () => {
    if (!analyzedJd || !configs) return;
    
    const formattedProfile = {
      mandatory_skills: analyzedJd.mandatory_skills.split(',').map(s => s.trim()).filter(Boolean),
      preferred_skills: analyzedJd.preferred_skills.split(',').map(s => s.trim()).filter(Boolean),
      ideal_profile_text: analyzedJd.ideal_profile_text,
      location_preference: {
        ideal: analyzedJd.location_preference.ideal.split(',').map(s => s.trim()).filter(Boolean),
        acceptable: analyzedJd.location_preference.acceptable.split(',').map(s => s.trim()).filter(Boolean),
        outside_india: analyzedJd.location_preference.outside_india
      },
      notice_period_preference: {
        ideal_max_days: parseInt(analyzedJd.notice_period_preference.ideal_max_days) || 30,
        buyout_max_days: parseInt(analyzedJd.notice_period_preference.buyout_max_days) || 30
      }
    };

    try {
      const newConfigs = { 
        ...configs, 
        jd_profile: formattedProfile 
      };
      await updateConfigs(newConfigs);
      setConfigs(newConfigs);
      setActiveStep('candidates');
    } catch (err) {
      console.error(err);
      alert("Error saving JD configs: " + err.message);
    }
  };

  const handleCandidatesRanked = (results, sourceName) => {
    setCandidates(results);
    setRawUploadedCandidates(results.map(c => ({
      candidate_id: c.candidate_id,
      profile: c.profile,
      career_history: c.career_history,
      skills: c.skills,
      redrob_signals: c.redrob_signals
    })));
    setSelectedCandidate(null);
    setActiveStep('results');
  };

  const reRank = async (targetConfigs) => {
    if (rawUploadedCandidates.length === 0) return;
    try {
      const data = await rankCandidates(rawUploadedCandidates, targetLimit);
      setCandidates(data.results || []);
      
      if (selectedCandidate) {
        const updated = data.results.find(c => c.candidate_id === selectedCandidate.candidate_id);
        if (updated) {
          setSelectedCandidate(updated);
        }
      }
    } catch (err) {
      console.error('Re-ranking failed:', err);
    }
  };

  const handleWeightChange = async (key, val) => {
    if (!configs) return;
    
    const updatedWeights = {
      ...configs.weights,
      weights: {
        ...configs.weights.weights,
        [key]: parseFloat(val)
      }
    };

    const newConfigs = {
      ...configs,
      weights: updatedWeights
    };

    setConfigs(newConfigs);
    
    try {
      await updateConfigs(newConfigs);
      reRank(newConfigs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetWeights = async () => {
    const resetWeights = {
      weights: {
        behavioral_readiness: 0.1,
        career_quality: 0.2,
        location_fit: 0.1,
        semantic_lexical_fit: 0.15,
        technical_fit: 0.3,
        trust_score: 0.15
      },
      subweights: {
        semantic_lexical: {
          bm25_score: 0.4,
          embedding_similarity: 0.6
        }
      }
    };

    const newConfigs = {
      ...configs,
      weights: resetWeights
    };

    setConfigs(newConfigs);
    try {
      await updateConfigs(newConfigs);
      reRank(newConfigs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportXLSX = (listToExport) => {
    const headers = ["Rank", "Candidate ID", "Confidence Score", "Evidence Statement", "Top Skills", "Experience Summary"];
    
    const rows = listToExport.map(cand => ({
      "Rank": cand.rank,
      "Candidate ID": cand.candidate_id,
      "Confidence Score": `${toNum(cand.score * 100).toFixed(1)}%`,
      "Evidence Statement": cand.reasoning,
      "Top Skills": getTopSkills(cand, configs?.jd_profile),
      "Experience Summary": getExperienceSummary(cand)
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ranked Candidates");
    XLSX.writeFile(workbook, "ranked_evidence_pipeline.xlsx");
  };

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Wizard Page Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="serif-title" style={{ fontSize: '24px', color: 'white', margin: 0 }}>
            Evidence Vault Wizard
          </h1>
          <p className="mono-data" style={{ fontSize: '10px', color: 'var(--graphite)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            RecruitIQ AI • Timed Evaluation Sandboxing
          </p>
        </div>
        
        <button 
          onClick={onBackToLanding}
          className="btn-dossier"
          style={{ fontSize: '11px', padding: '6px 14px' }}
        >
          Exit Vault
        </button>
      </header>

      {/* Tabs */}
      <StepTabs 
        activeStep={activeStep} 
        onStepChange={setActiveStep} 
        analyzedJd={analyzedJd} 
        candidatesCount={candidates.length}
      />

      {/* Wizard Steps */}
      <div style={{ flexGrow: 1 }}>
        {activeStep === 'jd' && (
          <JdIntake 
            analyzedJd={analyzedJd} 
            setAnalyzedJd={setAnalyzedJd} 
            onProceed={handleSaveJdAndProceed} 
          />
        )}
        
        {activeStep === 'candidates' && (
          <CandidatePool 
            onBack={() => setActiveStep('jd')} 
            onRanked={handleCandidatesRanked} 
            targetLimit={targetLimit}
            setTargetLimit={setTargetLimit}
          />
        )}
        
        {activeStep === 'results' && (
          <ResultsDashboard 
            candidates={candidates}
            configs={configs}
            onWeightChange={handleWeightChange}
            onResetWeights={handleResetWeights}
            onExportXLSX={handleExportXLSX}
            onSelectCandidate={setSelectedCandidate}
            onBackToJd={() => setActiveStep('jd')}
            targetLimit={targetLimit}
            setTargetLimit={setTargetLimit}
          />
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selectedCandidate && (
          <CandidateDrawer 
            cand={selectedCandidate}
            configs={configs}
            onClose={() => setSelectedCandidate(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
