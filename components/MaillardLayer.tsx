
import React from 'react';

const MaillardLayer: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#2C1E16]">
      
      {/* 1. Procedural Leather Texture (SVG Filter) */}
      <svg className="absolute inset-0 w-full h-full opacity-40 mix-blend-overlay">
        <filter id="leather-grain">
          {/* Fractal Noise for organic pores */}
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" result="noise"/>
          {/* Lighting to give the grain depth */}
          <feDiffuseLighting in="noise" lightingColor="#D6B8A0" surfaceScale="1">
            <feDistantLight azimuth="45" elevation="60" />
          </feDiffuseLighting>
        </filter>
        <rect width="100%" height="100%" filter="url(#leather-grain)" />
      </svg>

      {/* 2. Patina/Sheen (Central Wear & Tear) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(198,166,100,0.15)_0%,rgba(44,30,22,0.8)_80%)] mix-blend-soft-light" />

      {/* 3. Deep Vignette (Burnished Edges of the Screen) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,#1a100c_100%)] opacity-80" />

      {/* 4. Fine Scratches / Distressed Overlay */}
      <div 
        className="absolute inset-0 opacity-10 mix-blend-overlay"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />
    </div>
  );
};

export default MaillardLayer;
