
import React, { useState, useEffect, useCallback, useMemo } from 'react';

const ThunderstormLayer: React.FC = () => {
  const [flashIntensity, setFlashIntensity] = useState(0);
  const [showBolt, setShowBolt] = useState(false);
  const [boltStyle, setBoltStyle] = useState({ left: '50%', transform: 'rotate(0deg)' });
  const [boltPath, setBoltPath] = useState('');

  // Generate a realistic jagged lightning path
  const generateLightningPath = () => {
    let d = "M50,0 ";
    let currentX = 50;
    let currentY = 0;
    const steps = 15;
    const stepHeight = 100 / steps;

    for (let i = 0; i < steps; i++) {
        currentY += stepHeight;
        // Jitter x
        const jitter = (Math.random() - 0.5) * 15; 
        currentX += jitter;
        d += `L${currentX},${currentY} `;
    }

    // Add branches (simple lines branching off main nodes)
    // We'll approximate by adding separate M commands if we were doing multi-path, 
    // but for single path element, we can jump back. 
    // Actually, easier to return just the main bolt and have CSS filter handle the glow.
    // Let's add 2 simple branches manually by jumping back.
    const branchY = Math.random() * 40 + 20; // Start branch 20-60% down
    d += `M${currentX},${currentY} `; // End of main
    
    // Fake a branch
    d += `M50,30 L70,50 L60,60 `;
    
    return d;
  };

  const triggerLightning = useCallback(() => {
    // 1. Setup Visuals
    const left = Math.floor(Math.random() * 80) + 10 + '%';
    const rotate = Math.floor(Math.random() * 30) - 15;
    setBoltStyle({ left, transform: `rotate(${rotate}deg) scaleX(${Math.random() > 0.5 ? 1 : -1})` });
    setBoltPath(generateLightningPath());

    // 2. Flash Sequence (Burst -> Flicker -> Decay)
    const sequence = async () => {
      // Strike 1 (Full Brightness)
      setShowBolt(true);
      setFlashIntensity(1.0);
      await new Promise(r => setTimeout(r, 60)); // 60ms

      // Flicker 1
      setFlashIntensity(0.5);
      await new Promise(r => setTimeout(r, 60));

      // Strike 2 (Medium)
      setFlashIntensity(0.8);
      await new Promise(r => setTimeout(r, 80));

      // Flicker 2
      setFlashIntensity(0.3);
      setShowBolt(false); // Bolt disappears, but glow remains
      await new Promise(r => setTimeout(r, 50));

      // Decay (Long environment glow)
      // We will let CSS transition handle the decay from 0.3 to 0
      setFlashIntensity(0); 
    };

    sequence();

    // 3. Schedule Next (3-9 seconds)
    const nextTime = Math.random() * 6000 + 3000; 
    return setTimeout(triggerLightning, nextTime);
  }, []);

  useEffect(() => {
    const timer = triggerLightning();
    return () => clearTimeout(timer);
  }, [triggerLightning]);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      
      {/* 1. Cyber Structures (Server Towers in the dark) */}
      {/* These only become visible when flashIntensity > 0 */}
      <div 
        className="absolute inset-0 transition-opacity duration-300"
        style={{ opacity: 0.1 + (flashIntensity * 0.4) }}
      >
          {/* Left Tower */}
          <div className="absolute bottom-[-10%] left-[5%] w-[15%] h-[60%] bg-[var(--storm-structure-dark)] transform skew-y-6 border-r border-[#00FF66]/10" />
          {/* Right Tower */}
          <div className="absolute bottom-[-20%] right-[10%] w-[20%] h-[70%] bg-[var(--storm-structure-dark)] transform -skew-y-3 border-l border-[#00FF66]/10" />
          {/* Background Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,102,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,102,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [transform:perspective(500px)_rotateX(60deg)] origin-bottom" />
      </div>

      {/* 2. Global Flash Overlay (The Sky Illuminator) */}
      <div 
        className="absolute inset-0 bg-[var(--storm-flash)] mix-blend-screen transition-opacity ease-out"
        style={{ 
            opacity: flashIntensity,
            transitionDuration: flashIntensity === 1 ? '0ms' : '1200ms' // Snap on, fade slow
        }}
      />

      {/* 3. The Lightning Bolt */}
      <div 
        className={`absolute top-[-50px] w-[300px] h-[100vh] origin-top transition-opacity duration-0 ${showBolt ? 'opacity-100' : 'opacity-0'}`}
        style={boltStyle}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            {/* Inner Core */}
            <path 
                d={boltPath}
                stroke="var(--storm-lightning-core)" 
                strokeWidth="0.8"
                fill="none"
                style={{ filter: 'drop-shadow(0 0 2px var(--storm-lightning-core))' }}
            />
            {/* Outer Glow */}
            <path 
                d={boltPath}
                stroke="var(--storm-lightning-glow)" 
                strokeWidth="2"
                fill="none"
                className="opacity-60"
                style={{ filter: 'blur(1px) drop-shadow(0 0 10px var(--storm-lightning-glow))' }}
            />
             {/* Atmosphere Haze around bolt */}
            <path 
                d={boltPath}
                stroke="var(--storm-lightning-fog)" 
                strokeWidth="8"
                fill="none"
                className="opacity-40"
                style={{ filter: 'blur(8px)' }}
            />
        </svg>
      </div>
    </div>
  );
};

export default ThunderstormLayer;
