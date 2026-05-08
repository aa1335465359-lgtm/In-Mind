import React, { useRef } from 'react';
import { AIAction } from '../../types';

interface ToolbarButtonProps {
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  title?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, children, active = false, className = '', title = '' }) => (
  <button 
    onMouseDown={(e) => { e.preventDefault(); onClick(e); }} 
    className={`
      h-8 w-8 md:h-9 md:w-9 flex items-center justify-center rounded-full transition-all duration-300 active:scale-110 md:hover:scale-110
      ${active ? 'bg-black/5 text-[#4A443F]' : 'text-[#8C8681] hover:text-[#4A443F] hover:bg-black/5'}
      ${className}
    `}
    title={title}
  >
    {children}
  </button>
);

interface EditorToolbarProps {
  onToggleSidebar: () => void;
  execCmd: (cmd: string, val?: string) => void;
  onImageUpload: (files: FileList | null) => void;
  onAIAction: (action: AIAction) => void;
  onDelete: () => void;
  saveStatus: string;
  aiEnabled: boolean;
  onToggleAi: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onToggleSidebar,
  execCmd,
  onImageUpload,
  onAIAction,
  onDelete,
  saveStatus,
  aiEnabled,
  onToggleAi
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 duration-500 flex flex-col items-center gap-3 max-w-[95vw] md:max-w-none">
      {/* AI Quick Actions — desktop: row, mobile: grid 2x2 */}
      <div className="hidden md:flex items-center gap-2">
        <button onClick={() => onAIAction(AIAction.SUMMARIZE)} className="px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/40 shadow-sm text-xs font-sans text-[#4A443F]/70 hover:text-[#4A443F] hover:bg-white transition-all tracking-wider whitespace-nowrap">
          一句话总结
        </button>
        <button onClick={() => onAIAction(AIAction.POETRY)} className="px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/40 shadow-sm text-xs font-sans text-[#4A443F]/70 hover:text-[#4A443F] hover:bg-white transition-all tracking-wider whitespace-nowrap">
          变成诗
        </button>
        <button onClick={() => onAIAction(AIAction.PREDICT)} className="px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/40 shadow-sm text-xs font-sans text-[#4A443F]/70 hover:text-[#4A443F] hover:bg-white transition-all tracking-wider whitespace-nowrap">
          续写
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }} className="px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/40 shadow-sm text-xs font-sans text-[#4A443F]/70 hover:text-[#4A443F] hover:bg-white transition-all tracking-wider flex items-center gap-1 whitespace-nowrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          配张图
        </button>
      </div>

      {/* Main Toolbar */}
      <div className="bg-white/90 backdrop-blur-xl border border-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] px-2 md:px-4 py-2 flex items-center gap-1 md:gap-2 overflow-x-auto max-w-full scrollbar-none">
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={(e) => {
            onImageUpload(e.target.files);
            e.target.value = '';
          }} 
          className="hidden" 
        />

        <ToolbarButton onClick={onToggleSidebar} title="目录">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
        </ToolbarButton>
        
        <div className="w-[1px] h-4 bg-black/10 mx-1"></div>
        
        <ToolbarButton onClick={() => execCmd('formatBlock', 'P')} title="正文"><span className="font-serif text-sm">正文</span></ToolbarButton>
        <ToolbarButton onClick={() => execCmd('formatBlock', 'H1')} title="标题 1"><span className="font-serif font-bold text-sm">H1</span></ToolbarButton>
        <ToolbarButton onClick={() => execCmd('formatBlock', 'H2')} title="标题 2"><span className="font-serif font-bold text-xs">H2</span></ToolbarButton>
        <ToolbarButton onClick={() => execCmd('bold')} title="加粗"><span className="font-bold text-sm font-serif">B</span></ToolbarButton>
        
        <div className="w-[1px] h-4 bg-black/10 mx-1"></div>
        
        <button 
          onClick={onToggleAi}
          title={aiEnabled ? "关闭AI智能续写" : "开启AI智能续写"}
          className={`h-9 w-9 flex items-center justify-center rounded-full transition-all duration-300 transform hover:scale-110 ${aiEnabled ? 'text-[#A3D2C3] bg-[#A3D2C3]/10' : 'text-[#8C8681] hover:text-[#4A443F] hover:bg-black/5'}`}
        >
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M4.93 4.93l2.83 2.83"></path><path d="M16.24 16.24l2.83 2.83"></path><path d="M2 12h4"></path><path d="M18 12h4"></path><path d="M4.93 19.07l2.83-2.83"></path><path d="M16.24 7.76l2.83-2.83"></path></svg>
        </button>
        
        <ToolbarButton onClick={() => onAIAction(AIAction.REFLECT)} title="生成今日印记">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line><line x1="12" y1="8" x2="12" y2="16"></line></svg>
        </ToolbarButton>

        <div className="flex items-center gap-3 ml-2 border-l border-black/10 pl-3">
          <ToolbarButton onClick={onDelete} className="hover:text-red-400 hover:bg-red-50" title="删除此页">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </ToolbarButton>
          {saveStatus === 'saving' && <span className="text-[10px] text-[#A3D2C3] font-sans tracking-widest uppercase ml-1 animate-pulse min-w-[40px]">Saving</span>}
          {saveStatus === 'saved' && <span className="text-[10px] text-[#958D85]/50 font-sans tracking-widest uppercase ml-1 min-w-[40px]">Saved</span>}
          {saveStatus === 'error' && <span className="text-[10px] text-[#FAAE9D] font-sans tracking-widest uppercase ml-1 min-w-[40px]">Error</span>}
        </div>
      </div>
    </div>
  );
};
