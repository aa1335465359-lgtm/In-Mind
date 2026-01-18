
import React, { useEffect, useRef } from 'react';

const AmethystLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // "Crystal Glint" particles - Sharper, brighter, rarer
    const glints: {x: number, y: number, size: number, life: number, maxLife: number, rotation: number}[] = [];

    const animate = () => {
        ctx.clearRect(0, 0, width, height);

        // Spawn Glints (Rarely, like light catching a facet)
        if(Math.random() < 0.03) {
            glints.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 3 + 1,
                life: 0,
                maxLife: 60 + Math.random() * 60,
                rotation: Math.random() * Math.PI
            });
        }

        // Draw Glints (Sharp 4-point stars)
        ctx.fillStyle = '#E6E1F0'; // White-ish Lavender
        
        for(let i = glints.length - 1; i >= 0; i--) {
            const g = glints[i];
            g.life++;
            if(g.life > g.maxLife) {
                glints.splice(i, 1);
                continue;
            }
            
            // Fade in/out sine wave
            const opacity = Math.sin((g.life / g.maxLife) * Math.PI);
            ctx.globalAlpha = opacity;
            
            ctx.save();
            ctx.translate(g.x, g.y);
            ctx.rotate(g.rotation);
            
            // Draw Star Shape
            ctx.beginPath();
            ctx.moveTo(0, -g.size * 3);
            ctx.quadraticCurveTo(0, 0, g.size * 3, 0);
            ctx.quadraticCurveTo(0, 0, 0, g.size * 3);
            ctx.quadraticCurveTo(0, 0, -g.size * 3, 0);
            ctx.quadraticCurveTo(0, 0, 0, -g.size * 3);
            ctx.fill();
            
            ctx.restore();
        }
        ctx.globalAlpha = 1.0;

        requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#0F0B1A] overflow-hidden">
      
      {/* 1. Deep Crystal Gradient (The "Geode" interior light) */}
      {/* Center is brighter (Amethyst core), Edges are almost black (Obsidian casing) */}
      <div 
        className="absolute inset-0 z-0 opacity-80"
        style={{
            background: `
                radial-gradient(circle at 50% 30%, #3A1C52 0%, transparent 50%),
                radial-gradient(circle at 10% 90%, #2A1035 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, #1A0F2E 0%, transparent 40%),
                linear-gradient(to bottom, #0F0B1A, #050308)
            `
        }}
      />

      {/* 2. Micro-Texture Noise Overlay (The "Stone" Feel) */}
      {/* Adds grain to remove the "digital gradient" look */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.07] mix-blend-overlay pointer-events-none"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* 3. Canvas Glints (Foreground sparkles) */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10 mix-blend-screen pointer-events-none" />
      
      {/* 4. Glass Reflection Sheen */}
      <div className="absolute inset-0 z-20 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.03)_45%,transparent_50%)] pointer-events-none" />
    </div>
  );
};

export default AmethystLayer;
