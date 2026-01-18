
import React, { useEffect, useRef } from 'react';

const StarryNightLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // --- Configuration ---
    const PARTICLE_COUNT = 800;
    const TRAIL_LENGTH = 0.15; // How fast trails fade (lower = longer)
    const COLORS = ['#1a1a1a', '#203562', '#3e5f8a', '#73a4c2', '#f4c430', '#e3b448'];
    
    // Simplex Noise Approximation (Simple 2D Noise for flow field)
    const noise2D = (x: number, y: number) => {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        return (Math.sin(x * 0.01) + Math.cos(y * 0.01)) * Math.PI; 
    };

    interface Particle {
      x: number;
      y: number;
      color: string;
      speed: number;
      size: number;
    }

    const particles: Particle[] = [];

    // Init Particles
    for(let i=0; i<PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            speed: Math.random() * 1 + 0.5,
            size: Math.random() * 2 + 0.5
        });
    }

    let time = 0;

    const animate = () => {
        // Trail effect: fade existing canvas slightly instead of clearing
        ctx.fillStyle = 'rgba(20, 30, 50, 0.05)'; // Deep blue base fade
        ctx.fillRect(0, 0, width, height);

        time += 0.002;

        particles.forEach(p => {
            const angle = noise2D(p.x * 0.005, p.y * 0.005 + time) * 2; // Swirl factor
            
            p.x += Math.cos(angle) * p.speed;
            p.y += Math.sin(angle) * p.speed;

            // Wrap edges
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw static "Stars" (Blobs)
        const starTime = Date.now() * 0.001;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        // Star 1 (Big Yellow)
        const alpha1 = (Math.sin(starTime) * 0.2 + 0.8) * 0.1;
        const grad1 = ctx.createRadialGradient(width*0.8, height*0.2, 0, width*0.8, height*0.2, 60);
        grad1.addColorStop(0, `rgba(244, 196, 48, ${alpha1 + 0.2})`);
        grad1.addColorStop(1, 'rgba(244, 196, 48, 0)');
        ctx.fillStyle = grad1;
        ctx.fillRect(width*0.8-60, height*0.2-60, 120, 120);

        // Star 2 (Moon-ish)
        const alpha2 = (Math.cos(starTime) * 0.2 + 0.8) * 0.1;
        const grad2 = ctx.createRadialGradient(width*0.1, height*0.15, 0, width*0.1, height*0.15, 80);
        grad2.addColorStop(0, `rgba(255, 255, 200, ${alpha2 + 0.1})`);
        grad2.addColorStop(1, 'rgba(255, 255, 200, 0)');
        ctx.fillStyle = grad2;
        ctx.fillRect(width*0.1-80, height*0.15-80, 160, 160);

        ctx.restore();

        requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#141E32] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      {/* Texture overlay for canvas feeling */}
      <div className="absolute inset-0 z-10 opacity-20 pointer-events-none mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} 
      />
    </div>
  );
};

export default StarryNightLayer;
