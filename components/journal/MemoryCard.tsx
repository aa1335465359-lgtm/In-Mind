import React, { useRef } from 'react';
import { MemoryResult } from '../../types';
import * as htmlToImage from 'html-to-image';

interface MemoryCardProps {
  memory: MemoryResult | null;
  isGenerating?: boolean;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, isGenerating }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const colors = {
    warm: { bg: 'from-[#FFF0E6] to-[#FFE4D6]', accent: 'text-[#E88C5D]', blob: 'bg-[#FFD1B3]' },
    cool: { bg: 'from-[#E6F0FF] to-[#D6E4FF]', accent: 'text-[#5D8CE8]', blob: 'bg-[#B3D1FF]' },
    green: { bg: 'from-[#E6FFF0] to-[#D6FFE4]', accent: 'text-[#5DE88C]', blob: 'bg-[#B3FFD1]' },
    pink: { bg: 'from-[#FFE6F0] to-[#FFD6E4]', accent: 'text-[#E85D8C]', blob: 'bg-[#FFB3D1]' },
    neutral: { bg: 'from-[#F5F5F5] to-[#EAEAEA]', accent: 'text-[#8C8C8C]', blob: 'bg-[#D9D9D9]' },
  };

  const theme = memory ? colors[memory.colorTheme as keyof typeof colors] || colors.neutral : colors.neutral;

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `memory-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image', err);
    }
  };

  if (!memory && !isGenerating) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-center px-8 flex-1 opacity-50 relative">
        <div className="w-24 h-24 mb-6 rounded-full border-2 border-dashed border-[#d1d0c5] flex items-center justify-center text-[#d1d0c5]">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
        </div>
        <p className="text-[#8c8681] text-sm font-medium tracking-wider">今日还未沉淀</p>
        <p className="text-[#a8a39d] text-xs mt-2 leading-relaxed">写下你的日记<br/>稍后这里将凝结出专属于今天的印记</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#958D85] uppercase">Today's Mark</h3>
        {memory && !isGenerating && (
          <button 
            onClick={handleSaveImage}
            className="text-xs text-[#8c8681] hover:text-[#4A443F] flex items-center gap-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            保存
          </button>
        )}
      </div>

      <div 
        ref={cardRef} 
        className={`bg-gradient-to-br ${theme.bg} rounded-[2rem] p-8 shadow-sm flex flex-col relative overflow-hidden transition-all duration-700 min-h-[400px] shrink-0`}
      >
        {/* Decorative dynamic shapes */}
        {memory?.shapeStyle === 'organic' && (
           <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full ${theme.blob} mix-blend-multiply opacity-50 blur-2xl`}></div>
        )}
        {memory?.shapeStyle === 'geometric' && (
           <div className={`absolute bottom-0 right-0 w-32 h-32 ${theme.blob} mix-blend-multiply opacity-40 rotate-45 translate-x-10 translate-y-10`}></div>
        )}
        {memory?.shapeStyle === 'minimal' && (
           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-[${theme.accent}] rounded-full opacity-10`}></div>
        )}

        <div className="relative z-10 flex flex-col h-full">
          {isGenerating ? (
            <div className="m-auto flex flex-col items-center">
               <div className="w-8 h-8 border-2 border-white/50 border-t-white rounded-full animate-spin mb-4"></div>
               <p className="text-sm font-serif text-[#4A443F]/70 tracking-widest">正在凝结印记...</p>
            </div>
          ) : memory && (
            <>
              <div className="mb-auto">
                <span className={`inline-block px-3 py-1 rounded-full bg-white/50 backdrop-blur-sm text-[10px] font-bold tracking-widest ${theme.accent} mb-4`}>
                  {memory.mood}
                </span>
                <h4 className="font-serif text-lg leading-relaxed text-[#4A443F] mb-6 whitespace-pre-wrap">{memory.quote}</h4>
                <div className="flex flex-wrap gap-2">
                  {memory.keywords.map((kw, i) => (
                    <span key={i} className="text-xs text-[#4A443F]/60">#{kw}</span>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-[#4A443F]/10 flex justify-between items-end">
                 <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-[#4A443F]/40 uppercase mb-1">Quietly</p>
                    <p className="text-xs font-serif text-[#4A443F]/60">{memory.stampText}</p>
                 </div>
                 <div className={`w-8 h-8 rounded-full ${theme.blob} mix-blend-multiply opacity-80 flex items-center justify-center`}>
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                 </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
