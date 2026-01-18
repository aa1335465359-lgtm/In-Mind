
import React, { useEffect, useRef } from 'react';

const ChristmasSnowLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Snow Layers Config
    // Layer 0: Background (Deep depth, tiny, slow, dense)
    // Layer 1: Midground (Bridge)
    // Layer 2: Foreground (Window glass level, huge bokeh, faster parallax)
    const layers = [
        // Background: Tiny dots, very subtle
        { count: 300, speedMin: 0.3, speedMax: 0.7, radiusMin: 1, radiusMax: 2.5, alpha: 0.5 },
        // Midground
        { count: 60, speedMin: 0.8, speedMax: 1.5, radiusMin: 3, radiusMax: 6, alpha: 0.4 },
        // Foreground: Massive "Out of Focus" flakes closer to camera
        { count: 15, speedMin: 1.8, speedMax: 2.5, radiusMin: 15, radiusMax: 35, alpha: 0.2 }
    ];

    interface Flake {
        x: number;
        y: number;
        r: number;
        speed: number;
        sway: number;
        swaySpeed: number;
        layerIdx: number;
        alpha: number;
    }

    const flakes: Flake[] = [];

    // Initialize flakes
    layers.forEach((layer, layerIdx) => {
        for(let i=0; i<layer.count; i++) {
            flakes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * (layer.radiusMax - layer.radiusMin) + layer.radiusMin,
                speed: Math.random() * (layer.speedMax - layer.speedMin) + layer.speedMin,
                sway: Math.random() * Math.PI * 2,
                // Ultra slow sway frequency
                swaySpeed: (Math.random() - 0.5) * 0.002, 
                layerIdx: layerIdx,
                alpha: layer.alpha
            });
        }
    });

    const drawSoftFlake = (x: number, y: number, r: number, alpha: number) => {
        // Create a radial gradient for "fluffy/blurry" look
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        // Core is more transparent for bokeh effect on large flakes
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(0.3, `rgba(255, 255, 255, ${alpha * 0.8})`); 
        grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    };

    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        
        ctx.globalCompositeOperation = 'source-over'; // Standard blending

        flakes.forEach(f => {
            f.y += f.speed;
            
            // Reduced Lateral Sway:
            // Multiplier reduced from 0.15 to 0.05 to effectively stop "zig-zag" look.
            // Small flakes (layer 0) barely move X. Large flakes (layer 2) move slightly more but gentle.
            const swayAmplitude = (f.layerIdx + 1) * 0.05; 
            f.x += Math.sin(f.sway) * swayAmplitude;
            f.sway += f.swaySpeed;

            // Loop
            if (f.y > height + f.r) {
                f.y = -f.r;
                f.x = Math.random() * width;
            }
            if (f.x > width + f.r) f.x = -f.r;
            if (f.x < -f.r) f.x = width + f.r;

            drawSoftFlake(f.x, f.y, f.r, f.alpha);
        });
        
        requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
};

export default ChristmasSnowLayer;
