
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
      h-8 min-w-[32px] px-1.5 flex items-center justify-center rounded-md transition-all duration-200
      ${active ? 'bg-stone-100 text-stone-800' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100/50'}
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
    <div className="h-12 border-b border-stone-100 flex items-center justify-between px-2 md:px-4 bg-[#fcfaf5] z-20 shrink-0">
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={(e) => onImageUpload(e.target.files)} 
        className="hidden" 
      />

      <div className="flex items-center gap-1 md:gap-2">
          <ToolbarButton onClick={onToggleSidebar} title="Toggle Sidebar">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
          </ToolbarButton>
          <div className="w-[1px] h-4 bg-stone-200 mx-1 md:mx-2"></div>
          
          <ToolbarButton onClick={() => execCmd('formatBlock', 'H1')} title="Heading 1"><span className="font-serif font-bold text-xs">H1</span></ToolbarButton>
          <ToolbarButton onClick={() => execCmd('formatBlock', 'H2')} title="Heading 2"><span className="font-serif font-bold text-[10px]">H2</span></ToolbarButton>
          <ToolbarButton onClick={() => execCmd('bold')} title="Bold"><span className="font-bold text-xs font-serif">B</span></ToolbarButton>
          <ToolbarButton onClick={() => execCmd('italic')} title="Italic"><span className="italic text-xs font-serif">I</span></ToolbarButton>
          
          <div className="w-[1px] h-4 bg-stone-200 mx-1"></div>
          
          <ToolbarButton onClick={() => execCmd('foreColor', '#b38676')} className="text-[#b38676]/80 hover:text-[#b38676]" title="Highlight"><span className="font-serif font-bold text-sm">A</span></ToolbarButton>
          <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Image"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></ToolbarButton>
          <ToolbarButton onClick={() => onAIAction(AIAction.REFLECT)} title="Insight"><span className="text-xs">🔮</span></ToolbarButton>
      </div>

      <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <span className="text-[10px] text-stone-400 font-sans tracking-wider animate-pulse">☁️ 同步中...</span>}
          {saveStatus === 'saved' && <span className="text-[10px] text-stone-300 font-sans tracking-wider">☁️ 已同步</span>}
          {saveStatus === 'error' && <span className="text-[10px] text-red-400 font-sans tracking-wider" title="同步失败">☁️ 失败</span>}
          <ToolbarButton onClick={onDelete} className="hover:text-red-400 hover:bg-red-50" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg></ToolbarButton>
      </div>
    </div>
  );
};
