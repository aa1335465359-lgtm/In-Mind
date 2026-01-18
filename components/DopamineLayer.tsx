
import React from 'react';

const DopamineLayer: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-[#FFD1DC] overflow-hidden">
      {/* 1. Mesh Gradient Base - Melted Candy */}
      <div className="absolute inset-0 opacity-100 mix-blend-normal">
          {/* Fluorescent Pink Blob */}
          <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] rounded-full bg-[#FF00CC] opacity-60 blur-[100px] animate-[float_15s_ease-in-out_infinite]" />
          
          {/* Bright Yellow Blob */}
          <div className="absolute top-[30%] right-[-20%] w-[70vw] h-[70vw] rounded-full bg-[#FFED00] opacity-70 blur-[120px] animate-[float_18s_ease-in-out_infinite_reverse]" />
          
          {/* Cyan/Green Blob */}
          <div className="absolute bottom-[-10%] left-[10%] w-[60vw] h-[60vw] rounded-full bg-[#00FFCC] opacity-60 blur-[90px] animate-[float_20s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
          
          {/* Bright Purple Blob */}
          <div className="absolute top-[20%] left-[30%] w-[50vw] h-[50vw] rounded-full bg-[#9900FF] opacity-50 blur-[100px] animate-[float_12s_ease-in-out_infinite_reverse]" style={{ animationDelay: '5s' }} />
      </div>
      
      {/* 2. Frosted Grain Texture */}
      <div className="absolute inset-0 opacity-25 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />
      
      {/* 3. Subtle Highlight Sheen */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,transparent_60%)] mix-blend-screen pointer-events-none" />

      <style>{`
        @keyframes float {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(40px, -40px) scale(1.1) rotate(10deg); }
          66% { transform: translate(-30px, 30px) scale(0.9) rotate(-5deg); }
          100% { transform: translate(0, 0) scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default DopamineLayer;
