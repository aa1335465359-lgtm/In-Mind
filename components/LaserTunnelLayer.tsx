
import React, { useMemo } from 'react';

const LaserTunnelLayer: React.FC = () => {
  // 24 Segments for extreme depth
  const segments = useMemo(() => Array.from({ length: 24 }), []);

  return (
    <div className="absolute inset-0 bg-[#000205] overflow-hidden flex items-center justify-center perspective-[500px] z-0">
      
      {/* 1. Background: Star Streak Center */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#001020_0%,#000000_100%)]" />
      <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(34,242,255,0.1)_2deg,transparent_4deg)] animate-[spin_0.5s_linear_infinite] opacity-50 mix-blend-screen scale-[2]" />

      {/* 2. The Infinite Tunnel */}
      <div className="relative w-full h-full transform-style-3d">
        {segments.map((_, i) => {
          // Stagger animation delays for continuous flow
          // Duration 4s, 24 items => ~0.16s stagger
          const delay = -(i * 0.2) + 's'; 
          const isPurple = i % 2 !== 0;
          
          return (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] border-[4px] rounded-lg opacity-0"
              style={{
                borderColor: isPurple ? '#B04CFF' : '#22F2FF',
                // Double box shadow for neon glow
                boxShadow: isPurple 
                  ? '0 0 20px #B04CFF, inset 0 0 20px #B04CFF' 
                  : '0 0 20px #22F2FF, inset 0 0 20px #22F2FF',
                animation: `warp-speed 4.8s linear infinite`,
                animationDelay: delay,
              }}
            />
          );
        })}
      </div>
      
      {/* 3. Foreground: HUD Vignette & Scanlines */}
      <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] opacity-20" />
      <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(circle_at_center,transparent_40%,black_120%)]" />

      <style>{`
        @keyframes warp-speed {
          0% { transform: translateZ(-800px) rotate(0deg); opacity: 0; }
          10% { opacity: 0; }
          20% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateZ(300px) rotate(0deg); opacity: 0; }
        }
        .transform-style-3d { transform-style: preserve-3d; }
      `}</style>
    </div>
  );
};

export default LaserTunnelLayer;
