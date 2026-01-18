
import React, { useEffect, useRef } from 'react';

const CyberStormEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match parent container exactly
    let width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    let height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

    // --- CONFIGURATION ---
    const RAIN_COLOR = '#39ff14'; // Neon Green
    const RAIN_COUNT = 120;       // Number of drops
    const ANGLE_X = 2;            // Horizontal wind force (Positive = Left to Right)
    const SPEED_MIN = 15;         // Minimum drop speed
    const SPEED_MAX = 25;         // Maximum drop speed
    const LENGTH_MIN = 10;        // Minimum trail length
    const LENGTH_MAX = 30;        // Maximum trail length

    interface Drop {
      x: number;
      y: number;
      z: number; // Depth for parallax speed
      length: number;
      speed: number;
    }

    interface Splash {
      x: number;
      y: number;
      age: number;
      maxAge: number;
    }

    const drops: Drop[] = [];
    const splashes: Splash[] = [];

    // Initialize drops (start them randomly off-screen/on-screen)
    for (let i = 0; i < RAIN_COUNT; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
        length: Math.random() * (LENGTH_MAX - LENGTH_MIN) + LENGTH_MIN,
        speed: Math.random() * (SPEED_MAX - SPEED_MIN) + SPEED_MIN
      });
    }

    const animate = () => {
      // Clear canvas but keep it transparent to see the dark panel background
      ctx.clearRect(0, 0, width, height);

      // --- DRAW DROPS ---
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];

        // Draw the drop
        ctx.beginPath();
        // Color alpha based on depth to simulate distance/fog
        ctx.strokeStyle = `rgba(57, 255, 20, ${d.z * 0.6})`; 
        
        ctx.moveTo(d.x, d.y);
        // Draw line backwards (opposite to movement vector) to create trail
        ctx.lineTo(d.x - ANGLE_X * d.z, d.y - d.length * d.z);
        ctx.stroke();

        // Update position
        d.x += ANGLE_X * d.speed * d.z * 0.2; // Move X based on wind
        d.y += d.speed * d.z;                 // Move Y based on speed

        // Reset if out of bounds
        // Reset slightly above top or far left/right depending on wind
        if (d.y > height + 50 || d.x > width + 50 || d.x < -50) {
           d.y = -50 - Math.random() * 50;
           d.x = Math.random() * width + (Math.random() * 100 - 50); // Random X spread
           
           // Chance to create a "glass impact" splash when a drop "hits" the bottom/reset point?
           // No, let's make random impacts on the "screen glass" as they fall
        }

        // Random Impact Logic (Rain hitting the window glass)
        // Higher probability for faster drops
        if (Math.random() < 0.005 * d.z) {
            splashes.push({
                x: d.x,
                y: d.y,
                age: 0,
                maxAge: 5 + Math.random() * 5
            });
        }
      }

      // --- DRAW SPLASHES (Impacts) ---
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.age++;

        if (s.age > s.maxAge) {
            splashes.splice(i, 1);
            continue;
        }

        const life = 1 - (s.age / s.maxAge);
        
        // Inner white core (spark)
        ctx.fillStyle = `rgba(255, 255, 255, ${life * 0.8})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1, 0, Math.PI * 2);
        ctx.fill();

        // Outer neon glow
        ctx.strokeStyle = `rgba(57, 255, 20, ${life * 0.5})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2 + s.age, 0, Math.PI * 2); // Expanding ring
        ctx.stroke();
      }

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

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

export default CyberStormEffect;
