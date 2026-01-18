
import React, { useEffect, useRef } from 'react';

const BlackGoldLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas: Gold Dust Sparkles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles: {x: number, y: number, alpha: number, phase: number}[] = [];
    for(let i=0; i<50; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            alpha: Math.random(),
            phase: Math.random() * Math.PI * 2
        });
    }

    let time = 0;
    const animate = () => {
        time += 0.05;
        ctx.clearRect(0, 0, width, height);
        
        particles.forEach(p => {
            // Twinkle logic
            const currentAlpha = (Math.sin(time + p.phase) * 0.5 + 0.5) * p.alpha;
            
            ctx.fillStyle = `rgba(240, 198, 116, ${currentAlpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Add cross flare for brightness
            if (currentAlpha > 0.6) {
                ctx.strokeStyle = `rgba(240, 198, 116, ${currentAlpha * 0.5})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x + 4, p.y);
                ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x, p.y + 4);
                ctx.stroke();
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
    <div className="absolute inset-0 bg-[#080808] overflow-hidden">
      
      {/* 1. Background: Matte Noise Texture */}
      <div className="absolute inset-0 opacity-100 bg-[radial-gradient(circle_at_50%_0%,#252525_0%,#080808_80%)]" />
      <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

      {/* 2. Sweeping Light Shafts (CSS) */}
      <div className="absolute top-[-50%] left-[-20%] w-[50%] h-[200%] bg-gradient-to-r from-transparent via-[#C99A3D]/10 to-transparent rotate-[25deg] blur-[10px] animate-[sweep 15s linear infinite]" />
      <div className="absolute top-[-50%] left-[20%] w-[30%] h-[200%] bg-gradient-to-r from-transparent via-[#F0C674]/5 to-transparent rotate-[25deg] blur-[20px] animate-[sweep 20s linear infinite]" />

      {/* 3. Foreground: Gold Sparkle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none mix-blend-screen" />

      <style>{`
        @keyframes sweep { 
            0% { transform: translateX(-50%) rotate(25deg); opacity: 0; } 
            50% { opacity: 1; }
            100% { transform: translateX(150%) rotate(25deg); opacity: 0; } 
        }
      `}</style>
    </div>
  );
};

export default BlackGoldLayer;
