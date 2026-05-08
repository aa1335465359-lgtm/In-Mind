import React, { useRef } from 'react';
import { MemoryResult } from '../../types';
import * as htmlToImage from 'html-to-image';
import * as Icons from 'lucide-react';

interface MemoryCardProps {
  memory: MemoryResult | null;
  isGenerating?: boolean;
}

const COLOR_THEMES: Record<string, {
  gradient: string; accent: string; accentHex: string;
  panelBg: string; glow: string; border: string;
  textMuted: string; moodBg: string; moodText: string;
  quoteColor: string; stampColorClass: string; iconBg: string;
}> = {
  slate: {
    gradient: 'bg-gradient-to-br from-[#2c3e50] to-[#4a6274]',
    accent: 'text-[#78909c]', accentHex: '#78909c',
    panelBg: 'bg-gradient-to-br from-[#f5f7fa] to-[#e8ecf0]',
    glow: 'shadow-[0_0_60px_rgba(44,62,80,0.10)]',
    border: 'border-[#c8d0d8]',
    textMuted: 'text-[#8a98a4]',
    moodBg: 'bg-[#78909c]/10', moodText: 'text-[#78909c]',
    quoteColor: '#4A443F', stampColorClass: 'text-[#8a98a4]', iconBg: 'bg-white/60'
  },
  burgundy: {
    gradient: 'bg-gradient-to-br from-[#4a1a2e] to-[#6b2f4a]',
    accent: 'text-[#c9a96e]', accentHex: '#c9a96e',
    panelBg: 'bg-gradient-to-br from-[#faf6f2] to-[#f0e8dc]',
    glow: 'shadow-[0_0_60px_rgba(74,26,46,0.12)]',
    border: 'border-[#e0d0c0]',
    textMuted: 'text-[#b09878]',
    moodBg: 'bg-[#c9a96e]/15', moodText: 'text-[#b08a50]',
    quoteColor: '#4A443F', stampColorClass: 'text-[#b09878]', iconBg: 'bg-white/60'
  },
  forest: {
    gradient: 'bg-gradient-to-br from-[#1b3a2d] to-[#2d5a3e]',
    accent: 'text-[#a8c5a0]', accentHex: '#8ab890',
    panelBg: 'bg-gradient-to-br from-[#f4f8f2] to-[#e8f0e4]',
    glow: 'shadow-[0_0_60px_rgba(27,58,45,0.12)]',
    border: 'border-[#c8dcc0]',
    textMuted: 'text-[#80a888]',
    moodBg: 'bg-[#8ab890]/10', moodText: 'text-[#6a9870]',
    quoteColor: '#4A443F', stampColorClass: 'text-[#80a888]', iconBg: 'bg-white/60'
  },
  midnight: {
    gradient: 'bg-gradient-to-br from-[#1a1a3e] to-[#2d2d6b]',
    accent: 'text-[#7c8bc4]', accentHex: '#7c8bc4',
    panelBg: 'bg-gradient-to-br from-[#f4f4fa] to-[#e8e8f4]',
    glow: 'shadow-[0_0_60px_rgba(26,26,62,0.12)]',
    border: 'border-[#c8c8e0]',
    textMuted: 'text-[#8a94b8]',
    moodBg: 'bg-[#7c8bc4]/10', moodText: 'text-[#7c8bc4]',
    quoteColor: '#4A443F', stampColorClass: 'text-[#8a94b8]', iconBg: 'bg-white/60'
  },
  clay: {
    gradient: 'bg-gradient-to-br from-[#6b4c3a] to-[#8b6f50]',
    accent: 'text-[#d4b8a0]', accentHex: '#c4a890',
    panelBg: 'bg-gradient-to-br from-[#faf6f0] to-[#f0ece4]',
    glow: 'shadow-[0_0_60px_rgba(107,76,58,0.12)]',
    border: 'border-[#dcd0c4]',
    textMuted: 'text-[#b09880]',
    moodBg: 'bg-[#c4a890]/15', moodText: 'text-[#a08870]',
    quoteColor: '#4A443F', stampColorClass: 'text-[#b09880]', iconBg: 'bg-white/60'
  },
  obsidian: {
    gradient: 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d35]',
    accent: 'text-[#a08ab8]', accentHex: '#a08ab8',
    panelBg: 'bg-gradient-to-br from-[#f8f6fa] to-[#ece8f0]',
    glow: 'shadow-[0_0_60px_rgba(26,26,26,0.10)]',
    border: 'border-[#d4d0d8]',
    textMuted: 'text-[#948ca0]',
    moodBg: 'bg-[#a08ab8]/10', moodText: 'text-[#a08ab8]',
    quoteColor: '#4A443F', stampColorClass: 'text-[#948ca0]', iconBg: 'bg-white/60'
  },
};

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, isGenerating }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const theme = memory ? (COLOR_THEMES[memory.colorTheme] || COLOR_THEMES.slate) : COLOR_THEMES.slate;
  const iconName = memory?.shapeStyle || 'Star';
  const IconComponent = (Icons as any)[iconName] || Icons.Star;

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `quietly-mark-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image', err);
    }
  };

  if (!memory && !isGenerating) {
    return (
      <div className="flex flex-col p-2 w-full">
        <div className="flex justify-between items-center mb-6 px-1">
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#958D85] uppercase">Today's Mark</h3>
        </div>
        
        <div className="bg-gradient-to-br from-[#faf8f5] to-[#f0ebe3] rounded-[2.5rem] p-8 shrink-0 flex flex-col items-center justify-center min-h-[450px] border border-[#e8e0d8]/80 relative overflow-hidden">
          {/* Glass layer for blur */}
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] pointer-events-none z-[1]"></div>
          
          {/* Atmospheric blur orbs */}
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[50%] rounded-full bg-[#8a7a70]/15 blur-[60px] opacity-60"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[40%] rounded-full bg-[#4a6274]/15 blur-[50px] opacity-50"></div>
          <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-[#a08ab8]/20 blur-[40px] opacity-40"></div>

          {/* Refined empty state SVG */}
          <svg className="w-56 h-56 mb-6 relative z-[2]" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="e1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8a7a70" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#4a6274" stopOpacity="0.15"/>
              </linearGradient>
              <linearGradient id="e2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4a6274" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="#a08ab8" stopOpacity="0.15"/>
              </linearGradient>
              <linearGradient id="e3" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#a08ab8" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="#8a7a70" stopOpacity="0.12"/>
              </linearGradient>
              <filter id="softS">
                <feDropShadow dx="0" dy="2" stdDeviation="6" floodOpacity="0.12"/>
              </filter>
              <filter id="softS2">
                <feDropShadow dx="0" dy="1" stdDeviation="3" floodOpacity="0.08"/>
              </filter>
            </defs>
            
            {/* Decorative rings */}
            <circle cx="120" cy="120" r="108" fill="none" stroke="#8a7a70" strokeWidth="0.3" opacity="0.15"/>
            <circle cx="120" cy="120" r="92" fill="none" stroke="#4a6274" strokeWidth="0.4" opacity="0.12" strokeDasharray="3 7"/>
            <circle cx="120" cy="120" r="76" fill="none" stroke="#a08ab8" strokeWidth="0.3" opacity="0.15"/>
            
            {/* Floating ellipse */}
            <ellipse cx="80" cy="70" rx="36" ry="30" fill="url(#e1)" filter="url(#softS)" opacity="0.7"/>
            <ellipse cx="80" cy="70" rx="24" ry="18" fill="none" stroke="white" strokeWidth="1" opacity="0.2"/>
            
            {/* Floating organic shape */}
            <path d="M160,100 A50,50 0 0,1 115,155 A45,45 0 0,1 60,102 Q90,132 115,118 Q140,104 160,100 Z" fill="url(#e2)" filter="url(#softS)" opacity="0.65"/>
            
            {/* Floating rect */}
            <rect x="150" y="52" width="34" height="34" rx="10" fill="url(#e3)" filter="url(#softS2)" opacity="0.7" transform="rotate(12,167,69)"/>
            
            {/* Accent dots */}
            <circle cx="178" cy="38" r="4" fill="#8a7a70" opacity="0.4"/>
            <circle cx="52" cy="142" r="3.5" fill="#4a6274" opacity="0.35"/>
            <circle cx="138" cy="182" r="5" fill="#a08ab8" opacity="0.35"/>
            <circle cx="198" cy="128" r="2.5" fill="#8a7a70" opacity="0.3"/>
            <circle cx="42" cy="58" r="3" fill="#4a6274" opacity="0.25"/>
            
            {/* Deco lines */}
            <line x1="176" y1="182" x2="206" y2="202" stroke="#a08ab8" strokeWidth="1.2" opacity="0.2" strokeLinecap="round"/>
            <line x1="32" y1="202" x2="58" y2="188" stroke="#8a7a70" strokeWidth="0.8" opacity="0.2" strokeLinecap="round"/>
            
            {/* Central glyph */}
            <path d="M112,132 Q117,118 122,132 Q127,146 118,144 Q109,146 112,132" fill="url(#e3)" opacity="0.35"/>
          </svg>

          <p className="text-[#8c8681] text-sm font-serif tracking-[0.15em] relative z-[2]">还在酝酿中</p>
          <p className="text-[#958D85]/50 text-xs mt-3 leading-loose text-center font-sans relative z-[2]">
            留下哪怕只言片语<br/>这里将凝结出你的专属印记
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-2 w-full">
      <div className="flex justify-between items-center mb-6 px-1">
        <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#958D85] uppercase">Today's Mark</h3>
        {memory && !isGenerating && (
          <button 
            onClick={handleSaveImage}
            className="text-[10px] uppercase tracking-widest text-[#8c8681] hover:text-[#4A443F] flex items-center gap-1.5 transition-colors font-bold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            保存
          </button>
        )}
      </div>

      <div 
        ref={cardRef} 
        className={`${theme.panelBg} rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden transition-all duration-700 min-h-[450px] shrink-0 border ${theme.border} ${theme.glow}`}
      >
        {/* Glass overlay for blur effect */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none z-[1]"></div>
        
        {/* Atmospheric blur orbs */}
        <div className={`absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-40 blur-[60px]`} style={{backgroundColor: theme.accentHex}}></div>
        <div className={`absolute bottom-0 left-0 w-36 h-36 rounded-full opacity-30 blur-[50px]`} style={{backgroundColor: theme.accentHex}}></div>
        
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay z-0" 
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}></div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-[320px]">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-[#4A443F]/10"></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{borderTopColor: theme.accentHex}}></div>
              </div>
              <p className="text-sm font-serif text-[#4A443F]/60 tracking-widest">正在凝结印记</p>
            </div>
          ) : memory && (
            <>
              {/* Large background icon */}
              <div className="absolute top-2 right-2 opacity-[0.05]">
                 <IconComponent size={140} strokeWidth={1.5} style={{color: theme.accentHex}} />
              </div>
              
              <div className="mb-auto flex w-full flex-col items-center text-center mt-8">
                <span className={`inline-block px-5 py-2 rounded-full ${theme.moodBg} backdrop-blur-md text-xs font-bold tracking-widest ${theme.moodText} mb-8 shadow-sm border border-white/40`}>
                  {memory.mood}
                </span>
                <h4 className="font-serif text-2xl leading-[1.9] whitespace-pre-wrap font-medium relative z-10 px-2" style={{color: theme.quoteColor}}>
                  {memory.quote}
                </h4>
                <div className="flex flex-wrap justify-center gap-3 relative z-10">
                  {memory.keywords.map((kw, i) => (
                    <span key={i} className={`text-xs tracking-wider ${theme.textMuted}`}>#{kw}</span>
                  ))}
                </div>
              </div>
              
              <div className="mt-auto w-full pt-6 border-t border-[#4A443F]/8 flex justify-between items-end relative z-10">
                 <div>
                    <p className="text-[9px] font-bold tracking-[0.3em] text-[#4A443F]/30 uppercase mb-1.5">Quietly</p>
                    <p className={`text-[11px] font-serif tracking-widest ${theme.stampColorClass}`}>{memory.stampText}</p>
                 </div>
                 <div className={`w-11 h-11 rounded-full ${theme.iconBg} backdrop-blur-sm flex items-center justify-center shadow-sm border border-white/50`}>
                    <IconComponent size={18} strokeWidth={2} style={{color: theme.accentHex, opacity: 0.8}} />
                 </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
