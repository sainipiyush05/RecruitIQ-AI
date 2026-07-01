import React, { useEffect, useRef } from 'react';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Footer from '../components/landing/Footer';

// Subtle, highly visible 3D Parallax Ambient Dust
function Subtle3DBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Keep particles balanced but visible
    const particleCount = 35;
    const particles = [];
    
    // Mouse coords for 3D parallax shift
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    class SubtleParticle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        // Depth determines parallax speed and size
        this.depth = Math.random() * 0.8 + 0.2; 
        
        // Mid-range particle sizes (1.7px to 4.5px) for balanced visibility
        this.radius = this.depth * 3.5 + 1.0;
        
        // Active drift speed
        this.speedX = (Math.random() - 0.5) * 0.6;
        this.speedY = (Math.random() - 0.5) * 0.6;
        
        // Opacity mapping
        this.alpha = this.depth * 0.35 + 0.12;
      }

      update() {
        // Drift
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around edges
        if (this.x < -20) this.x = width + 20;
        if (this.x > width + 20) this.x = -20;
        if (this.y < -20) this.y = height + 20;
        if (this.y > height + 20) this.y = -20;
      }

      draw() {
        // Parallax movement reaction multiplier (up to 80px shift)
        const shiftX = mouse.x * this.depth * 80;
        const shiftY = mouse.y * this.depth * 80;

        ctx.beginPath();
        ctx.arc(this.x + shiftX, this.y + shiftY, this.radius, 0, Math.PI * 2);
        
        // Neon cyan drop glow
        ctx.fillStyle = `rgba(0, 242, 254, ${this.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0, 242, 254, 0.4)';
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new SubtleParticle());
    }

    const handleMouseMove = (e) => {
      // Normalize mouse coordinates (-1 to 1)
      mouse.targetX = (e.clientX - width / 2) / (width / 2);
      mouse.targetY = (e.clientY - height / 2) / (height / 2);
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse easing
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Draw subtle parallax points
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
}

export default function Landing({ onStart }) {
  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        backgroundColor: '#0D1117', // Solid, static background color
        position: 'relative',
        zIndex: 1
      }}
    >
      <Subtle3DBackground />
      
      {/* Subtle overlay grid lines */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 242, 254, 0.04) 0%, transparent 80%)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* Header */}
      <header 
        style={{ 
          padding: '24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          maxWidth: '960px', 
          width: '100%', 
          margin: '0 auto', 
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="serif-title" style={{ fontWeight: 800, fontSize: '18px', color: 'white', letterSpacing: '-0.02em' }}>RecruitIQ AI</span>
        </div>
        <button 
          onClick={onStart}
          className="btn-dossier"
          style={{ padding: '6px 14px', fontSize: '11px' }}
        >
          Initialize Vault
        </button>
      </header>

      {/* Main Content */}
      <main style={{ flexGrow: 1, position: 'relative', zIndex: 10 }}>
        <Hero onStart={onStart} />
        <Features />
      </main>

      <Footer />
    </div>
  );
}
