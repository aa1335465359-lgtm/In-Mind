
import React, { useEffect, useRef } from 'react';

const NeonBillboardLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas: Heavy Digital Rain
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const drops: {x: number, y: number, length: number, speed: number, alpha: number}[] = [];
    const DROP_COUNT = 200;

    for(let i=0; i<DROP_COUNT; i++) {
        drops.push({
            x: Math.random() * width,
            y: Math.random() * height,
            length: Math.random() * 30 + 10,
            speed: Math.random() * 15 + 10,
            alpha: Math.random() * 0.5 + 0.1
        });
    }

    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.lineCap = 'round';

        drops.forEach(d => {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(77, 173, 255, ${d.alpha})`;
            ctx.lineWidth = 1.5;
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x, d.y + d.length);
            ctx.stroke();
            
            d.y += d.speed;
            if (d.y > height) {
                d.y = -d.length;
                d.x = Math.random() * width;
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
    <div className="absolute inset-0 bg-[#0D0510] overflow-hidden">
      
      {/* 1. Background: Foggy City Sky */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0520] to-[#0D0510]" />

      {/* 2. City Silhouette (CSS Grid Construction) */}
      <div className="absolute bottom-[-10%] left-0 w-full h-[80%] z-0 flex items-end justify-center gap-1 opacity-90 scale-110">
          {/* Building 1 */}
          <div className="w-[12%] h-[50%] bg-[#0f0515] border-r border-[#FF3EA6]/50 relative overflow-hidden group">
             <div className="absolute top-10 left-2 w-8 h-8 border border-[#FF3EA6] shadow-[0_0_10px_#FF3EA6] animate-pulse bg-[#FF3EA6]/10 flex items-center justify-center text-[8px] text-[#FF3EA6]">BAR</div>
          </div>
          {/* Building 2 (Tall) */}
          <div className="w-[18%] h-[90%] bg-[#0a020d] border-t border-[#4DADFF] shadow-[0_0_30px_#4DADFF] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(transparent_95%,rgba(77,173,255,0.1)_95%)] bg-[size:100%_20px]" />
              <div className="absolute top-10 right-2 w-2 h-20 bg-[#4DADFF] shadow-[0_0_15px_#4DADFF] animate-pulse" />
          </div>
          {/* Building 3 */}
          <div className="w-[20%] h-[70%] bg-[#120518] border-t border-[#FFDF4A] shadow-[0_0_20px_#FFDF4A]" />
          {/* Building 4 */}
          <div className="w-[15%] h-[40%] bg-[#0d0410] border-t border-[#FF3EA6]" />
      </div>

      {/* 3. Mid-ground: Giant Holographic Ads */}
      <div className="absolute top-[20%] right-[15%] w-[160px] h-[80px] border-2 border-[#FF3EA6] bg-[#FF3EA6]/5 shadow-[0_0_20px_#FF3EA6] animate-[flicker_3s_infinite] flex items-center justify-center rotate-[-5deg]">
          <span className="text-[#FF3EA6] text-xl font-mono font-bold tracking-widest drop-shadow-[0_0_5px_#FF3EA6]">OPEN</span>
      </div>
      
      {/* 4. Foreground: Rain Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none mix-blend-screen" />

      {/* 5. Floor Reflection (Wet Street) */}
      <div className="absolute bottom-0 w-full h-[30%] bg-gradient-to-t from-[#FF3EA6]/30 via-[#4DADFF]/10 to-transparent blur-[40px] mix-blend-screen" />

      <style>{`
        @keyframes flicker { 0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; } 20%, 24%, 55% { opacity: 0.3; } }
      `}</style>
    </div>
  );
};

export default NeonBillboardLayer;
