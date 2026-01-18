
import React, { useEffect, useRef } from 'react';

const DragonScaleLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas: Rising Gold Embers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const embers: {x: number, y: number, size: number, speed: number, alpha: number}[] = [];
    for(let i=0; i<60; i++) {
        embers.push({
            x: Math.random() * width,
            y: height + Math.random() * 200,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 2 + 0.5,
            alpha: Math.random()
        });
    }

    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        
        embers.forEach(e => {
            ctx.fillStyle = `rgba(246, 193, 90, ${e.alpha})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
            
            e.y -= e.speed;
            e.x += Math.sin(e.y * 0.02) * 0.5; // Meandering path
            
            // Fade out near top
            if(e.y < height * 0.3) e.alpha -= 0.01;

            if (e.y < -10 || e.alpha <= 0) {
                e.y = height + 10;
                e.x = Math.random() * width;
                e.alpha = Math.random();
            }
        });
        requestAnimationFrame(animate);
    };
    const animId = requestAnimationFrame(animate);
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#1A0505] overflow-hidden">
      
      {/* 1. Background: Vignette Red */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#3A0A0A_0%,#0F0202_100%)] z-0" />

      {/* 2. Scale Pattern (CSS) - Breathing */}
      <div className="absolute inset-0 z-0 opacity-15" 
           style={{
             backgroundImage: `
               radial-gradient(circle at 100% 50%, transparent 20%, #F6C15A 21%, #F6C15A 22%, transparent 23%, transparent),
               radial-gradient(circle at 0% 50%, transparent 20%, #F6C15A 21%, #F6C15A 22%, transparent 23%, transparent)
             `,
             backgroundSize: '60px 60px',
             backgroundPosition: '0 0, 30px 30px',
             animation: 'breathe 6s ease-in-out infinite'
           }}
      />

      {/* 3. Central Holy Light (Volume) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-[radial-gradient(circle,#F6C15A_0%,transparent_60%)] opacity-10 blur-[100px] animate-pulse mix-blend-screen" />

      {/* 4. Foreground: Canvas Embers */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none mix-blend-screen" />

      <style>{`
        @keyframes breathe { 0%, 100% { transform: scale(1); opacity: 0.15; } 50% { transform: scale(1.05); opacity: 0.25; } }
      `}</style>
    </div>
  );
};

export default DragonScaleLayer;
