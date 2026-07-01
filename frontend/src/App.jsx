import React, { useState, useEffect, useCallback } from 'react';
import Landing from './pages/Landing';
import Wizard from './pages/Wizard';
import SplashScreen from './components/landing/SplashScreen';
import './styles/tokens.css';
import './styles/app.css';

function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'wizard'
  const [showSplash, setShowSplash] = useState(true);

  // Navigate to wizard and push a history entry
  const goToWizard = useCallback(() => {
    window.history.pushState({ view: 'wizard' }, '', '#wizard');
    setView('wizard');
  }, []);

  // Navigate back to landing
  const goToLanding = useCallback(() => {
    setView('landing');
    // Replace current state so we're cleanly on landing
    window.history.replaceState({ view: 'landing' }, '', window.location.pathname);
  }, []);

  // Listen for browser back/forward button
  useEffect(() => {
    const handlePopState = () => {
      setView('landing');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <div className="app-container-root">
      <div className="scanlines" />
      
      {/* Cinematic splash screen on first visit */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      
      {view === 'landing' ? (
        <Landing onStart={goToWizard} />
      ) : (
        <Wizard onBackToLanding={goToLanding} />
      )}
    </div>
  );
}

export default App;
