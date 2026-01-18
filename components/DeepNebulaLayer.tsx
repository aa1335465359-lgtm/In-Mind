
import React, { useEffect, useRef } from 'react';

const DeepNebulaLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas: Starfield Parallax
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const stars: {x: number, y: number, z: number, alpha: number}[] = [];
    // More stars
    for(let i=0; i<400; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            z: Math.random() * 3 + 0.5, // Depth
            alpha: Math.random() * 0.8 + 0.2
        });
    }

    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        
        stars.forEach(s => {
            // Brightness based on depth
            ctx.globalAlpha = s.alpha * (1 / s.z);
            ctx.beginPath();
            const size = (1 / s.z) * 1.5;
            ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Movement: Ship flying right -> Stars move left
            // Closer stars move faster
            s.x -= 0.5 / s.z;
            
            if(s.x < 0) s.x = width;
        });
        requestAnimationFrame(animate);
    };
    const animId = requestAnimationFrame(animate);
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#050714] overflow-hidden">
      
      {/* 1. Background: Deep Space */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,#0B1026_0%,#020205_100%)] z-0" />

      {/* 2. Giant Nebula Clouds (Slow Moving CSS) */}
      <div className="absolute top-[-20%] left-[-10%] w-[100vw] h-[100vw] rounded-full bg-[#4DA6FF] blur-[180px] opacity-20 mix-blend-screen animate-[drift 120s ease-in-out infinite alternate]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-[#8E9DFF] blur-[150px] opacity-15 mix-blend-screen animate-[drift 100s ease-in-out infinite alternate-reverse]" />
      
      {/* 3. Starfield Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 mix-blend-plus-lighter" />

      {/* 4. Foreground: Viewport Glass Dirt/Reflection */}
      <div className="absolute inset-0 z-20 pointer-events-none opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
      <div className="absolute inset-0 z-20 pointer-events-none opacity-30 bg-[linear-gradient(120deg,transparent_40%,rgba(255,255,255,0.05)_45%,transparent_50%)]" />

      <style>{`
        @keyframes drift { 0% { transform: translate(0, 0) rotate(0deg); } 100% { transform: translate(50px, -20px) rotate(5deg); } }
      `}</style>
    </div>
  );
};

export default DeepNebulaLayer;
