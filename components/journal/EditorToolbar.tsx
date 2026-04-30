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
      h-9 w-9 flex items-center justify-center rounded-full transition-all duration-300 transform hover:scale-110
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
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onToggleSidebar,
  execCmd,
  onImageUpload,
  onAIAction,
  onDelete,
  saveStatus
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white/80 backdrop-blur-xl border border-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.06)] px-4 py-2 flex items-center gap-2">
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={(e) => onImageUpload(e.target.files)} 
          className="hidden" 
        />

        <ToolbarButton onClick={onToggleSidebar} title="目录">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
        </ToolbarButton>
        
        <div className="w-[1px] h-4 bg-black/10 mx-1"></div>
        
        <ToolbarButton onClick={() => execCmd('formatBlock', 'H1')} title="标题 1"><span className="font-serif font-bold text-sm">H1</span></ToolbarButton>
        <ToolbarButton onClick={() => execCmd('formatBlock', 'H2')} title="标题 2"><span className="font-serif font-bold text-xs">H2</span></ToolbarButton>
        <ToolbarButton onClick={() => execCmd('bold')} title="加粗"><span className="font-bold text-sm font-serif">B</span></ToolbarButton>
        
        <div className="w-[1px] h-4 bg-black/10 mx-1"></div>
        
        <button 
          onClick={() => fileInputRef.current?.click()} 
          title="插入图片"
          className="h-9 w-9 flex items-center justify-center rounded-full transition-all duration-300 transform hover:scale-110 text-[#8C8681] hover:text-[#4A443F] hover:bg-black/5"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        </button>
        
        <div className="w-[1px] h-4 bg-black/10 mx-1"></div>
        
        <ToolbarButton onClick={() => onAIAction(AIAction.REFLECT)} title="生成今日印记">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line><line x1="12" y1="8" x2="12" y2="16"></line></svg>
        </ToolbarButton>

        <div className="flex items-center gap-3 ml-2">
          <ToolbarButton onClick={onDelete} className="hover:text-red-400 hover:bg-red-50" title="删除此页">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </ToolbarButton>
          {saveStatus === 'saving' && <span className="text-[10px] text-[#A3D2C3] font-sans tracking-widest uppercase ml-2 animate-pulse">Saving</span>}
          {saveStatus === 'saved' && <span className="text-[10px] text-[#958D85]/50 font-sans tracking-widest uppercase ml-2">Saved</span>}
          {saveStatus === 'error' && <span className="text-[10px] text-[#FAAE9D] font-sans tracking-widest uppercase ml-2">Error</span>}
        </div>
      </div>
    </div>
  );
};
