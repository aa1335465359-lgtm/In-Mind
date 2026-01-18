
import React, { useEffect, useRef } from 'react';

const WindowRainOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    interface Drop {
      x: number;
      y: number;
      vy: number; // Vertical speed
      len: number; // Length of the trail
      alpha: number;
    }

    const drops: Drop[] = [];
    const DROP_COUNT = 60;

    // Init drops
    for(let i=0; i<DROP_COUNT; i++) {
        drops.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vy: Math.random() * 0.4 + 0.1, // Very slow slide (0.1 - 0.5)
            len: Math.random() * 20 + 5,
            alpha: Math.random() * 0.2 + 0.05 // Very faint (0.05 - 0.25)
        });
    }

    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineCap = 'round';

        drops.forEach(d => {
            ctx.beginPath();
            ctx.globalAlpha = d.alpha;
            ctx.lineWidth = 1;
            
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x, d.y - d.len);
            ctx.stroke();
            
            // Move
            d.y += d.vy;

            // Reset
            if (d.y - d.len > height) {
                d.y = -d.len;
                d.x = Math.random() * width;
                d.vy = Math.random() * 0.4 + 0.1;
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
    <div className="fixed inset-0 z-[50] pointer-events-none overflow-hidden mix-blend-overlay">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

export default WindowRainOverlay;
