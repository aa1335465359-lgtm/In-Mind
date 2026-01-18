
import React, { useEffect, useRef } from 'react';

const RainyCarLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // --- CONFIG ---
    // Rain
    const DROP_COUNT = 800; // Dense
    const DROP_SPEED_BASE = 5; // Slower
    const DROP_LENGTH_BASE = 15;
    
    // Stars
    const STAR_COUNT = 100;
    
    interface Drop {
      x: number;
      y: number;
      z: number; // Depth (0.1 to 1)
      length: number;
      speed: number;
    }
    const drops: Drop[] = [];
    
    // Init Drops
    for(let i=0; i<DROP_COUNT; i++) {
        const z = Math.random() * 0.8 + 0.2;
        drops.push({
            x: Math.random() * width,
            y: Math.random() * height,
            z: z,
            length: DROP_LENGTH_BASE * z,
            speed: DROP_SPEED_BASE * z * (Math.random() * 0.5 + 0.8)
        });
    }

    interface Star {
        x: number;
        y: number;
        size: number;
        alpha: number;
    }
    const stars: Star[] = [];
    for(let i=0; i<STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * (height * 0.6), // Upper sky
            size: Math.random() * 1.5,
            alpha: Math.random() * 0.8 + 0.2
        });
    }

    const animate = () => {
        ctx.clearRect(0, 0, width, height);

        // --- 1. Background Sky (Dark Blue Gradient) ---
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#020408');
        skyGrad.addColorStop(1, '#0a101a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        // --- 2. Stars ---
        ctx.fillStyle = '#FFFFFF';
        stars.forEach(s => {
            if (Math.random() > 0.95) s.alpha = Math.random() * 0.8 + 0.2; // Twinkle
            ctx.globalAlpha = s.alpha;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // --- 3. Moon (Crescent, Top Left) ---
        ctx.save();
        ctx.translate(width * 0.15, height * 0.15);
        ctx.scale(0.8, 0.8);
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(255, 255, 200, 0.5)';
        ctx.fillStyle = '#FFFDD0';
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2); // Full circle
        ctx.fill();
        
        // Shadow circle to make crescent
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(15, -10, 35, 0, Math.PI * 2); 
        ctx.fill();
        ctx.restore();

        // --- 4. Streetlight (Top Right, Orange Glow) ---
        // Simulating passing streetlights or a fixed one in distance
        ctx.save();
        const lightX = width * 0.85;
        const lightY = height * 0.1;
        const lightGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, 300);
        lightGrad.addColorStop(0, 'rgba(255, 160, 50, 0.4)');
        lightGrad.addColorStop(0.5, 'rgba(255, 140, 0, 0.1)');
        lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = lightGrad;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillRect(lightX - 300, lightY - 300, 600, 600);
        // The bulb source
        ctx.fillStyle = 'rgba(255, 220, 150, 0.8)';
        ctx.beginPath();
        ctx.arc(lightX, lightY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- 5. Heavy Rain ---
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(170, 200, 255, 0.4)';
        ctx.lineCap = 'round';
        
        drops.forEach(d => {
            ctx.lineWidth = 1 + d.z; 
            ctx.globalAlpha = 0.3 + d.z * 0.3; // Closer drops brighter
            
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            // Slight diagonal for "driving"
            ctx.lineTo(d.x - 2, d.y - d.length);
            ctx.stroke();

            d.y += d.speed;
            d.x -= 0.5 * d.z; // Slight wind

            if (d.y > height) {
                d.y = -d.length;
                d.x = Math.random() * width;
            }
            if (d.x < 0) d.x = width;
        });

        // --- 6. Foreground Window Reflection / Glare ---
        // Subtle noise/dirt on glass
        // Handled by CSS overlay in parent, here we handle active raindrops running down? 
        // For performance, simple static noise overlay in CSS is better.

        requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#020408] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      {/* Texture for window glass dirt */}
      <div className="absolute inset-0 z-10 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,#000000_120%)] z-20 pointer-events-none" />
    </div>
  );
};

export default RainyCarLayer;
