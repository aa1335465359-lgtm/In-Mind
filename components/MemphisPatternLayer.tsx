
import React, { useEffect, useRef } from 'react';

const MemphisPatternLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Memphis Palette
    const colors = ['#FF0055', '#00E5FF', '#FFD500', '#000000', '#8A2BE2'];
    
    interface Shape {
      x: number;
      y: number;
      type: 'circle' | 'triangle' | 'squiggle' | 'rect';
      color: string;
      size: number;
      rotation: number;
      rotSpeed: number;
      speedY: number;
    }

    const shapes: Shape[] = [];
    const SHAPE_COUNT = 25;

    for (let i = 0; i < SHAPE_COUNT; i++) {
        shapes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            type: ['circle', 'triangle', 'squiggle', 'rect'][Math.floor(Math.random() * 4)] as any,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 30 + 10,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02,
            speedY: (Math.random() - 0.5) * 0.5
        });
    }

    const drawSquiggle = (ctx: CanvasRenderingContext2D, width: number, amplitude: number) => {
        ctx.beginPath();
        ctx.moveTo(-width/2, 0);
        for(let i = -width/2; i < width/2; i+=5) {
            ctx.lineTo(i, Math.sin(i * 0.2) * amplitude);
        }
        ctx.stroke();
    };

    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        
        // Draw static grid dots for texture
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        for(let x=0; x<width; x+=40) {
            for(let y=0; y<height; y+=40) {
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI*2);
                ctx.fill();
            }
        }

        shapes.forEach(s => {
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);
            
            ctx.fillStyle = s.color;
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';

            if (s.type === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, s.size/2, 0, Math.PI*2);
                // Randomly fill or outline
                if (s.size > 25) ctx.stroke(); else ctx.fill();
            } else if (s.type === 'triangle') {
                ctx.beginPath();
                ctx.moveTo(0, -s.size/2);
                ctx.lineTo(s.size/2, s.size/2);
                ctx.lineTo(-s.size/2, s.size/2);
                ctx.closePath();
                ctx.fill();
            } else if (s.type === 'rect') {
                ctx.strokeRect(-s.size/2, -s.size/2, s.size, s.size);
                // Offset fill effect
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(-s.size/2 + 5, -s.size/2 + 5, s.size, s.size);
            } else if (s.type === 'squiggle') {
                drawSquiggle(ctx, s.size * 2, 8);
            }

            ctx.restore();

            s.y += s.speedY;
            s.rotation += s.rotSpeed;

            if (s.y > height + 50) s.y = -50;
            if (s.y < -50) s.y = height + 50;
        });

        requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);
    
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#FFFDF5] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* Paper Texture Overlay */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-multiply" />
    </div>
  );
};

export default MemphisPatternLayer;
