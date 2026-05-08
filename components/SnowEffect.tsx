
import React, { useEffect, useRef } from 'react';

const SnowEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match parent container
    let width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    let height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

    interface Flake {
        x: number;
        y: number;
        r: number;
        d: number;
        alpha: number;
        speed: number;
    }

    const snowflakes: Flake[] = [];
    const MAX_FLAKES = 40; // Fewer particles but larger for that "Big Snow" feel

    for (let i = 0; i < MAX_FLAKES; i++) {
      snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        // Radius: 5px to 12px (Diameter: 10px to 24px) - Much bigger
        r: Math.random() * 7 + 5, 
        d: Math.random() * MAX_FLAKES, // density factor for sway
        alpha: Math.random() * 0.5 + 0.3, // Brighter
        speed: Math.random() * 1.5 + 0.5
      });
    }

    let angle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      for (let i = 0; i < MAX_FLAKES; i++) {
        const p = snowflakes[i];
        
        ctx.beginPath();
        // Soft Radial Gradient for "Fluffy" look
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
        grad.addColorStop(0.4, `rgba(255, 255, 255, ${p.alpha * 0.6})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);
        ctx.fill();
      }
      
      update();
      requestAnimationFrame(draw);
    };

    const update = () => {
      angle += 0.005;
      for (let i = 0; i < MAX_FLAKES; i++) {
        const p = snowflakes[i];
        
        // Downward movement
        p.y += p.speed;
        // Gentle sway based on angle and density
        p.x += Math.sin(angle + p.d) * 0.3;

        // Sending flakes back from the top/sides when it exits
        if (p.x > width + 20 || p.x < -20 || p.y > height + 20) {
          if (i % 3 > 0) { // Most flakes respawn at top
            snowflakes[i].x = Math.random() * width;
            snowflakes[i].y = -20;
          } else {
            // Some enter from sides for realism
            if (Math.sin(angle) > 0) {
              snowflakes[i].x = -20;
              snowflakes[i].y = Math.random() * height;
            } else {
              snowflakes[i].x = width + 20;
              snowflakes[i].y = Math.random() * height;
            }
          }
        }
      }
    };

    const animationId = requestAnimationFrame(draw);

    const handleResize = () => {
       width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
       height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-[1] pointer-events-none mix-blend-screen"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default SnowEffect;
