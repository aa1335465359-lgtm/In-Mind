
import React, { useEffect, useRef } from 'react';

const RgbClubLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas: High Density Dust Particles responding to "Bass"
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles: {x: number, y: number, size: number, speedX: number, speedY: number, alpha: number}[] = [];
    const PARTICLE_COUNT = 300; // High density

    for(let i=0; i<PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2 + 0.5,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            alpha: Math.random() * 0.8 + 0.2
        });
    }

    let frame = 0;
    const animate = () => {
        frame++;
        ctx.clearRect(0, 0, width, height);
        
        // Strobe effect on background canvas
        if (frame % 40 === 0) {
            ctx.fillStyle = `rgba(255, 255, 255, 0.05)`;
            ctx.fillRect(0,0,width,height);
        }

        particles.forEach(p => {
            // "Bass" Shake
            const shake = (frame % 60 < 5) ? (Math.random() - 0.5) * 5 : 0;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x + shake, p.y + shake, p.size, 0, Math.PI * 2);
            ctx.fill();

            p.x += p.speedX;
            p.y += p.speedY;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;
        });
        requestAnimationFrame(animate);
    };
    const animId = requestAnimationFrame(animate);
    
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#050010] overflow-hidden perspective-[1000px]">
      {/* 1. Background: The Void */}
      <div className="absolute inset-0 bg-black z-0" />

      {/* 2. Volumetric Spotlights (CSS 3D Conic Gradients) */}
      <div className="absolute inset-0 pointer-events-none mix-blend-screen z-0">
          {/* Beam 1: Cyan, Fast Spin */}
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-[spin_8s_linear_infinite] opacity-40">
               <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0deg,#00F6FF_15deg,transparent_30deg,transparent_180deg,#00F6FF_195deg,transparent_210deg)] blur-[60px]" />
          </div>
          {/* Beam 2: Magenta, Reverse Slow Spin */}
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-[spin_12s_linear_infinite_reverse] opacity-30">
               <div className="w-full h-full bg-[conic-gradient(from_90deg,transparent_0deg,#FF0055_20deg,transparent_40deg)] blur-[80px]" />
          </div>
          {/* Beam 3: Vertical Scanner */}
          <div className="absolute top-0 left-0 w-full h-full animate-[scan_5s_ease-in-out_infinite_alternate] opacity-20">
              <div className="w-full h-[20px] bg-white blur-[20px]" />
          </div>
      </div>

      {/* 3. Foreground: Dust Particles */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10 mix-blend-overlay" />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scan { from { transform: translateY(0); } to { transform: translateY(100vh); } }
      `}</style>
    </div>
  );
};

export default RgbClubLayer;
