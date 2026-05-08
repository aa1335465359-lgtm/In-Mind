
import React from 'react';

const SynthwaveGridLayer: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-[#10051A] overflow-hidden flex flex-col perspective-[600px]">
      
      {/* 1. Background: Sunset Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#10051A] via-[#2D1B4E] to-[#5D275D] z-0" />

      {/* 2. The Sun (With Blinds Mask) */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[40vh] h-[40vh] rounded-full bg-gradient-to-t from-[#FF4FAE] to-[#FFCF5A] shadow-[0_0_80px_#FF4FAE] z-0">
          <div className="absolute inset-0 w-full h-full bg-[repeating-linear-gradient(transparent,transparent_80%,rgba(16,5,26,0.8)_80%,rgba(16,5,26,0.8)_100%)] bg-[length:100%_20px]" />
      </div>

      {/* 3. The Grid Floor (3D Transform) */}
      <div className="absolute bottom-[-50%] left-[-50%] w-[200%] h-[100%] bg-transparent z-10 origin-top transform-style-3d rotate-x-[60deg]">
          {/* Vertical Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(70,240,255,0.4)_1px,transparent_1px)] bg-[size:40px_100%]" />
          {/* Horizontal Lines (Moving) */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,79,174,0.4)_1px,transparent_1px)] bg-[size:100%_40px] animate-[grid-scroll_1s_linear_infinite]" />
          
          {/* Horizon Glow */}
          <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-[#FF4FAE]/50 to-transparent blur-[20px]" />
      </div>

      {/* 4. Foreground: Scanlines & Vignette */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] opacity-30" />
      <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.5)_120%)]" />

      <style>{`
        @keyframes grid-scroll { 0% { background-position: 0 0; } 100% { background-position: 0 40px; } }
      `}</style>
    </div>
  );
};

export default SynthwaveGridLayer;
