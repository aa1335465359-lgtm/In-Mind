
import React, { useEffect, useRef } from 'react';

const DigitalTerrariumLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // --- FLUID SIMULATION PARAMETERS ---
    const PARTICLE_COUNT = 180;
    const CONNECT_DISTANCE = 100;
    const MOUSE_RADIUS = 250;
    
    // Bioluminescent Palette
    const COLORS = ['#00F0FF', '#00FF94', '#9D00FF', '#FFFFFF'];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      baseX: number;
      baseY: number;
      density: number;
      angle: number;
    }

    const particles: Particle[] = [];
    let mouse = { x: -1000, y: -1000 };

    // Initialize Particles (Plankton)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        particles.push({
            x: x,
            y: y,
            baseX: x,
            baseY: y,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 3 + 1,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            density: (Math.random() * 30) + 1,
            angle: Math.random() * 360
        });
    }

    const animate = () => {
        // Create trails by fading instead of clearing
        ctx.fillStyle = 'rgba(10, 20, 30, 0.2)'; // Dark water
        ctx.fillRect(0, 0, width, height);
        
        // Additive blending for glow effect
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // 1. Fluid/Brownian Motion
            // Use sin/cos to simulate drifting in currents
            p.angle += 0.02;
            const driftX = Math.cos(p.angle) * 0.5;
            const driftY = Math.sin(p.angle) * 0.5;

            // 2. Mouse Interaction (Fluid Displacement)
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate repulsion (Swirl effect)
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            const maxDistance = MOUSE_RADIUS;
            let force = (maxDistance - distance) / maxDistance;
            
            // Invert force if close (Repel) -> visualizes moving water
            const directionX = forceDirectionX * force * p.density;
            const directionY = forceDirectionY * force * p.density;

            if (distance < MOUSE_RADIUS) {
                p.vx -= directionX * 0.5;
                p.vy -= directionY * 0.5;
            } else {
                // Return to natural flow
                if (p.vx > 0) p.vx -= 0.1;
                if (p.vx < 0) p.vx += 0.1;
                if (p.vy > 0) p.vy -= 0.1;
                if (p.vy < 0) p.vy += 0.1;
            }

            p.x += p.vx + driftX;
            p.y += p.vy + driftY;

            // Boundary Wrap (Toroidal world)
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            // Draw Organism
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }

        // Connect nearby particles (Simulate mucus/strands)
        ctx.lineWidth = 0.5;
        for (let a = 0; a < particles.length; a++) {
            for (let b = a; b < particles.length; b++) {
                const dx = particles[a].x - particles[b].x;
                const dy = particles[a].y - particles[b].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < CONNECT_DISTANCE) {
                    const opacity = 1 - (distance / CONNECT_DISTANCE);
                    ctx.strokeStyle = `rgba(0, 255, 148, ${opacity * 0.5})`;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
        
        ctx.globalCompositeOperation = 'source-over';
        requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);

    const handleMouseMove = (e: MouseEvent) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    };
    
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    
    return () => { 
        cancelAnimationFrame(animId); 
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#05111a] overflow-hidden">
      {/* 1. Deep Ocean Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#0b2a3b_0%,#02080c_100%)] z-0" />
      
      {/* 2. Caustics Overlay (Simulating light through water surface) */}
      <div className="absolute inset-0 opacity-20 mix-blend-overlay z-10 pointer-events-none" 
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.05' numOctaves='2' result='turbulence'/%3E%3CfeDisplacementMap in2='turbulence' in='SourceGraphic' scale='20' xChannelSelector='R' yChannelSelector='G'/%3E%3C/filter%3E%3Ccircle cx='100' cy='100' r='100' fill='%23fff' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
             backgroundSize: '400px 400px',
             animation: 'caustics 20s linear infinite'
           }}
      />

      {/* 3. Fluid Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      
      <style>{`
        @keyframes caustics { 
            0% { background-position: 0 0; } 
            100% { background-position: 100% 100%; } 
        }
      `}</style>
    </div>
  );
};

export default DigitalTerrariumLayer;
