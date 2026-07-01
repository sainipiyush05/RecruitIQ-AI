import React from 'react';

export default function StepTabs({ activeStep, onStepChange, analyzedJd, candidatesCount }) {
  const steps = [
    { id: 'jd', label: '01. Job Description Fit' },
    { id: 'candidates', label: '02. Candidate Pool' },
    { id: 'results', label: '03. Ranked Pipeline' }
  ];

  return (
    <div className="folder-tabs">
      {steps.map((step) => {
        const isActive = activeStep === step.id;
        const isDisabled = 
          (step.id === 'candidates' && !analyzedJd) || 
          (step.id === 'results' && candidatesCount === 0);

        return (
          <button
            key={step.id}
            onClick={() => !isDisabled && onStepChange(step.id)}
            disabled={isDisabled}
            className={`folder-tab ${isActive ? 'active' : ''}`}
            style={{ 
              opacity: isDisabled ? 0.35 : 1,
              cursor: isDisabled ? 'not-allowed' : 'pointer'
            }}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
}
