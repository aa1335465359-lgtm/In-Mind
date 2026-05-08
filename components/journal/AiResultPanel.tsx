import React from 'react';

const THEMES = {
  summary: {
    bg: 'bg-gradient-to-br from-[#f8f6f4] to-[#f0ece6]',
    border: 'border-[#e8e0d8]/60',
    accent: 'text-[#8a7a70]',
    iconColor: '#c4b8ac'
  },
  poem: {
    bg: 'bg-gradient-to-br from-[#f6f4f8] to-[#ece8f0]',
    border: 'border-[#e0d8e8]/60',
    accent: 'text-[#7a7090]',
    iconColor: '#b4a8c8'
  }
};

interface AiResultPanelProps {
  aiSummary?: string;
  aiMood?: string;
}

export const AiResultPanel: React.FC<AiResultPanelProps> = ({ aiSummary, aiMood }) => {
  const isLoadingSummary = aiSummary === ' ';
  const isLoadingPoem = aiMood === ' ';
  const hasSummary = aiSummary && aiSummary !== ' ';
  const hasPoem = aiMood && aiMood !== ' ';

  if (!hasSummary && !hasPoem && !isLoadingSummary && !isLoadingPoem) return null;

  const theme = THEMES.summary;

  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="flex flex-col gap-4">
        {/* 一句话总结 */}
        {(hasSummary || isLoadingSummary) && (
          <div className={`
            ${THEMES.summary.bg}
            rounded-2xl p-6
            border ${THEMES.summary.border}
            backdrop-blur-sm
            relative overflow-hidden
            transition-all duration-500
          `}>
            {/* Subtle glow */}
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#c4b8ac]/10 blur-[30px] opacity-40 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col items-center gap-3">
              <span className={`text-[9px] font-bold tracking-[0.3em] ${THEMES.summary.accent} uppercase`}>
                一句话总结
              </span>
              {isLoadingSummary ? (
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#c4b8ac]/30 animate-pulse"></span>
                  <span className="w-2 h-2 rounded-full bg-[#c4b8ac]/20 animate-pulse" style={{animationDelay: '0.2s'}}></span>
                  <span className="w-2 h-2 rounded-full bg-[#c4b8ac]/20 animate-pulse" style={{animationDelay: '0.4s'}}></span>
                </div>
              ) : (
                <p className="text-sm font-serif text-[#4A443F] leading-relaxed text-center tracking-wider">
                  {aiSummary}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 变成诗 */}
        {(hasPoem || isLoadingPoem) && (
          <div className={`
            ${THEMES.poem.bg}
            rounded-2xl p-6
            border ${THEMES.poem.border}
            backdrop-blur-sm
            relative overflow-hidden
            transition-all duration-500
          `}>
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#b4a8c8]/10 blur-[30px] opacity-40 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col items-center gap-3">
              <span className={`text-[9px] font-bold tracking-[0.3em] ${THEMES.poem.accent} uppercase`}>
                变成诗
              </span>
              {isLoadingPoem ? (
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#b4a8c8]/30 animate-pulse"></span>
                  <span className="w-2 h-2 rounded-full bg-[#b4a8c8]/20 animate-pulse" style={{animationDelay: '0.2s'}}></span>
                  <span className="w-2 h-2 rounded-full bg-[#b4a8c8]/20 animate-pulse" style={{animationDelay: '0.4s'}}></span>
                </div>
              ) : (
                <p className="text-sm font-serif text-[#4A443F] leading-relaxed text-center italic tracking-wider whitespace-pre-wrap">
                  {aiMood}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
