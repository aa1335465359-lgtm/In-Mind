
import React from 'react';

const LandetianSkyLayer: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 transform-gpu">
      
      {/* 1. Sky Gradient (Vivid Anime Blue) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1E5EFF] via-[#4DA3FF] to-[#B3E5FC] z-0" />

      {/* 2. The Sun */}
      <div className="absolute top-[10%] right-[10%] pointer-events-none z-10 will-change-transform">
          {/* Core */}
          <div className="w-24 h-24 bg-[#FFF9C4] rounded-full shadow-[0_0_60px_rgba(255,235,59,0.8)] animate-pulse relative z-10" />
          {/* Ray Ring 1 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,transparent_70%)] animate-[spin_20s_linear_infinite] will-change-transform" />
          {/* Ray Ring 2 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(255,215,0,0.15)_0%,transparent_60%)] animate-[spin_15s_linear_infinite_reverse] will-change-transform" />
      </div>

      {/* 3. Drifting Clouds Container */}
      <div className="absolute inset-0 z-0 opacity-90">
         {/* Cloud 1 (Big, Soft) */}
         <div className="cloud-entity absolute top-[18%] left-[-20%] w-[300px] h-[120px] opacity-90 animate-[drift_80s_linear_infinite] will-change-transform transform-gpu">
            <div className="absolute bottom-0 left-0 w-full h-[60%] bg-white rounded-full opacity-80" />
            <div className="absolute bottom-[20%] left-[15%] w-[40%] h-[70%] bg-white rounded-full opacity-80" />
            <div className="absolute bottom-[10%] right-[20%] w-[45%] h-[80%] bg-white rounded-full opacity-80" />
         </div>

         {/* Cloud 2 (Mid, Fluffy) */}
         <div className="cloud-entity absolute top-[40%] left-[-15%] w-[220px] h-[90px] opacity-80 animate-[drift_60s_linear_infinite] will-change-transform transform-gpu" style={{ animationDelay: '-20s' }}>
            <div className="absolute bottom-0 left-0 w-full h-[50%] bg-white/90 rounded-full opacity-90" />
            <div className="absolute bottom-[15%] left-[20%] w-[50%] h-[70%] bg-white/90 rounded-full opacity-90" />
         </div>

         {/* Cloud 3 (Fast, Wispy) */}
         <div className="cloud-entity absolute top-[65%] left-[-10%] w-[180px] h-[60px] opacity-70 animate-[drift_45s_linear_infinite] will-change-transform transform-gpu" style={{ animationDelay: '-5s' }}>
            <div className="absolute bottom-0 left-0 w-full h-[40%] bg-white/80 rounded-full opacity-60" />
            <div className="absolute bottom-[10%] right-[30%] w-[40%] h-[60%] bg-white/80 rounded-full opacity-60" />
         </div>
         
         {/* Cloud 4 (Background, Huge) */}
         <div className="cloud-entity absolute top-[5%] left-[-30%] w-[500px] h-[200px] opacity-30 animate-[drift_120s_linear_infinite] will-change-transform transform-gpu" style={{ animationDelay: '-50s' }}>
            <div className="absolute bottom-0 left-0 w-full h-[60%] bg-white rounded-full opacity-40" />
            <div className="absolute bottom-[30%] left-[20%] w-[60%] h-[60%] bg-white rounded-full opacity-40" />
         </div>
      </div>

      <style>{`
        @keyframes drift {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(130vw, 0, 0); }
        }
        @keyframes spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LandetianSkyLayer;
