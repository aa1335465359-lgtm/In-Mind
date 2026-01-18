
import React, { useEffect, useRef } from 'react';

const OilSlickLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Simulation Config
    const ORB_COUNT = 5;
    const COLORS = [
        ['#FF9ED8', '#B04CFF'], // Pink/Purple
        ['#00F6FF', '#4DA6FF'], // Cyan/Blue
        ['#FFD700', '#FF7B89'], // Gold/Red
        ['#FFFFFF', '#E0E0E0'], // White Highlight
        ['#8A2BE2', '#4B0082']  // Deep Purple
    ];

    interface Orb {
        x: number;
        y: number;
        vx: number;
        vy: number;
        radius: number;
        colorStart: string;
        colorEnd: string;
    }

    const orbs: Orb[] = [];

    // Init
    for(let i=0; i<ORB_COUNT; i++) {
        orbs.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            radius: Math.min(width, height) * (0.3 + Math.random() * 0.3),
            colorStart: COLORS[i % COLORS.length][0],
            colorEnd: COLORS[i % COLORS.length][1]
        });
    }

    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        
        // White Base
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0,0,width,height);

        // Draw Orbs
        orbs.forEach(orb => {
            orb.x += orb.vx;
            orb.y += orb.vy;

            // Bounce
            if(orb.x < -orb.radius/2 || orb.x > width + orb.radius/2) orb.vx *= -1;
            if(orb.y < -orb.radius/2 || orb.y > height + orb.radius/2) orb.vy *= -1;

            const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
            grad.addColorStop(0, orb.colorStart);
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Fade to transparent

            ctx.globalCompositeOperation = 'multiply'; // Blend mode for paint mixing effect
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.globalCompositeOperation = 'source-over'; // Reset

        requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#E0E0E0] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      
      {/* Iridescent Overlay Texture (CSS) - Lighter now */}
      <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-color-burn" 
           style={{
             background: 'linear-gradient(115deg, transparent 30%, rgba(0,255,255,0.2) 45%, rgba(255,0,255,0.2) 55%, transparent 70%)',
             backgroundSize: '200% 200%',
             animation: 'sheen 10s linear infinite'
           }}
      />
      
      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-multiply bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <style>{`
        @keyframes sheen { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
      `}</style>
    </div>
  );
};

export default OilSlickLayer;
