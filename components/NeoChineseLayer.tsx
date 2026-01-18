
import React, { useEffect, useRef } from 'react';

const NeoChineseLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Ink Particle System
    interface InkParticle {
      x: number;
      y: number;
      size: number;
      alpha: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
    }

    const particles: InkParticle[] = [];
    
    // Spawn ink drops randomly
    const spawnInk = (x: number, y: number, size: number) => {
        const count = 10;
        for(let i=0; i<count; i++) {
            particles.push({
                x: x + (Math.random() - 0.5) * size,
                y: y + (Math.random() - 0.5) * size,
                size: Math.random() * size * 0.5,
                alpha: Math.random() * 0.15 + 0.05, // Slightly stronger for visibility
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                life: 0,
                maxLife: 500 + Math.random() * 500
            });
        }
    };

    // Initial drops
    spawnInk(width * 0.2, height * 0.3, 100);
    spawnInk(width * 0.8, height * 0.7, 150);

    let frame = 0;

    const animate = () => {
        frame++;
        
        // Randomly spawn new ink slowly
        if(frame % 300 === 0) {
            spawnInk(Math.random() * width, Math.random() * height, 80);
        }

        // We do NOT clearRect fully to create trails (Paper absorption effect)
        // Instead we draw a very faint paper color over it to fade old ink very slowly
        ctx.fillStyle = 'rgba(240, 238, 226, 0.005)'; // Rice paper color, extremely low opacity
        ctx.fillRect(0, 0, width, height);

        particles.forEach((p, i) => {
            p.life++;
            if (p.life > p.maxLife) {
                particles.splice(i, 1);
                return;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.size += 0.05; // Ink expands
            p.alpha *= 0.999; // Fades out slowly

            // Draw organic blot
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            grad.addColorStop(0, `rgba(30, 30, 30, ${p.alpha})`); // Ink center (Dark Grey)
            grad.addColorStop(1, `rgba(30, 30, 30, 0)`); // Fade edge
            ctx.fillStyle = grad;
            ctx.fill();
        });

        requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#F0EEE2] overflow-hidden">
      
      {/* 1. Base Rice Paper Texture (SVG Filter) */}
      <div 
        className="absolute inset-0 z-0 opacity-40 mix-blend-multiply pointer-events-none"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E")`
        }}
      />

      {/* 2. Static Landscape Outline (Mountain Wash) */}
      {/* CSS mask image or gradient to simulate distant mountains */}
      <div className="absolute bottom-0 left-0 w-full h-[60%] opacity-20 pointer-events-none"
           style={{
               background: 'linear-gradient(to top, #2b2b2b, transparent)',
               maskImage: 'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
               clipPath: 'polygon(0% 100%, 10% 80%, 25% 90%, 40% 60%, 60% 85%, 80% 50%, 100% 100%)',
               filter: 'blur(40px)'
           }}
      />

      {/* 3. Ink Animation Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10 mix-blend-multiply opacity-80" />

      {/* 4. Vignette (Aged Paper Edges) */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_60%,#D1C7A8_100%)] mix-blend-multiply" />
    </div>
  );
};

export default NeoChineseLayer;
