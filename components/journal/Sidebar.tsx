import React, { useState, useRef } from 'react';
import { JournalEntry, ViewMode } from '../../types';

interface SidebarProps {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onLock: () => void;
  onUpdateMeta: (id: string, meta: Partial<JournalEntry>) => void;
  viewMode: ViewMode;
  onChangeView: (mode: ViewMode) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onDevTrigger?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  entries,
  currentEntry,
  isOpen,
  onToggle,
  onSelect,
  onCreate,
  onDelete,
  onLock,
  onUpdateMeta,
  viewMode,
  onChangeView,
  onContextMenu,
  searchTerm,
  onSearchChange,
  onDevTrigger
}) => {
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoClick = () => {
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 7) {
      if (onDevTrigger) onDevTrigger();
      setClickCount(0);
    }
    clickTimeoutRef.current = setTimeout(() => setClickCount(0), 500);
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };
  const getWeekDay = (timestamp: number) => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[new Date(timestamp).getDay()];
  };

  // Limit default view to recent days (e.g., 10 entries) unless searching
  const filteredEntries = entries
    .filter(e => {
      if (!searchTerm) return true;
      const textContent = e.content.replace(/<[^>]*>/g, '').toLowerCase(); 
      return textContent.includes(searchTerm.toLowerCase()) || 
             e.tags.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    })
    .sort((a, b) => {
       if (a.isPinned && !b.isPinned) return -1;
       if (!a.isPinned && b.isPinned) return 1;
       return b.createdAt - a.createdAt;
    });

  const displayEntries = searchTerm ? filteredEntries : filteredEntries.slice(0, 10);

  const handleSelect = (id: string) => {
    onSelect(id);
    onChangeView('journal');
    if (window.innerWidth < 768) onToggle(false);
  };

  const handleViewChange = (mode: ViewMode) => {
    onChangeView(mode);
    if (window.innerWidth < 768) onToggle(false);
  }

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/5 backdrop-blur-sm z-20 md:hidden" 
          onClick={() => onToggle(false)}
        ></div>
      )}

      <div className={`
        flex-shrink-0 flex flex-col bg-white/40 border-r border-[#4A443F]/5 backdrop-blur-md h-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-30
        ${isOpen ? 'w-[85%] md:w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 md:opacity-100'} 
        absolute md:relative
        overflow-hidden
      `}>
        <div className="p-6 pt-12 pb-4">
          <div className="flex justify-between items-center mb-8 pl-2">
             <div 
               className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity cursor-pointer select-none"
               onClick={handleLogoClick}
             >
                <div className={`w-2 h-2 rounded-full border border-[#FAAE9D] bg-transparent`}></div>
                <h1 className="text-xs font-bold tracking-[0.3em] text-[#4A443F]/80 uppercase">悄悄 Quietly</h1>
             </div>
             <button onClick={() => onToggle(false)} className="md:hidden text-[#958D85] p-2 hover:bg-black/5 rounded-full">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>

          <div className="flex gap-4 mb-8 pl-2">
            <button 
              onClick={() => handleViewChange('journal')} 
              className={`text-xs transition-all tracking-widest ${viewMode === 'journal' ? 'text-[#4A443F] font-bold border-b border-[#4A443F]' : 'text-[#958D85] hover:text-[#4A443F]'}`}
            >
              笔记
            </button>
            <button 
              onClick={() => handleViewChange('chat')} 
              className={`text-xs transition-all tracking-widest ${viewMode === 'chat' ? 'text-[#FAAE9D] font-bold border-b border-[#FAAE9D]' : 'text-[#958D85] hover:text-[#FAAE9D]'}`}
            >
              信箱
            </button>
          </div>
          
          <div className="relative group mb-4">
             <input 
               type="text" 
               placeholder="翻阅..."
               value={searchTerm}
               onChange={(e) => onSearchChange(e.target.value)}
               className="w-full bg-transparent border-b border-[#4A443F]/10 py-1 pl-6 pr-2 text-xs font-sans outline-none focus:border-[#4A443F]/30 transition-all placeholder:text-[#958D85]/50 text-[#4A443F]"
             />
             <svg className="absolute left-1 top-1.5 text-[#958D85]/50" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
          <div className="flex items-center justify-between px-2 py-2 mb-2 group">
             <span className="text-[10px] font-bold text-[#958D85]/60 tracking-[0.2em] uppercase">那些天</span>
             <button onClick={onCreate} className="w-5 h-5 flex items-center justify-center text-[#958D85]/60 hover:text-[#FAAE9D] opacity-0 group-hover:opacity-100 transition-all" title="写新的一页">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             </button>
          </div>

          <div className="space-y-[2px]">
            {displayEntries.map(entry => (
              <div 
                key={entry.id}
                onClick={() => handleSelect(entry.id)}
                onContextMenu={(e) => onContextMenu(e, entry.id)}
                className={`
                  sidebar-item p-3 pl-4 rounded-xl cursor-pointer transition-all duration-300 select-none flex flex-col gap-1
                  ${currentEntry?.id === entry.id && viewMode === 'journal'
                    ? 'bg-gradient-to-r from-white to-transparent shadow-sm border-l-2 border-[#4A443F]/30'
                    : 'hover:bg-white/30 border-l-2 border-transparent'}
                `}
              >
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      {entry.isPinned && <span className="w-1.5 h-1.5 rounded-full bg-[#FAAE9D]"></span>}
                      <span className={`font-serif tracking-widest ${currentEntry?.id === entry.id && viewMode === 'journal' ? 'text-[#4A443F] font-bold text-xs' : 'text-[#8C8681] text-xs'}`}>{formatDate(entry.createdAt)}</span>
                   </div>
                   <span className="text-[9px] text-[#958D85]/50">{getWeekDay(entry.createdAt)}</span>
                </div>
                {/* 隐藏正文预览，或者极端的弱化 */}
                <p className={`text-[10px] truncate font-sans leading-relaxed ${currentEntry?.id === entry.id && viewMode === 'journal' ? 'text-[#8C8681]' : 'text-[#958D85]/50'}`}>
                  {entry.content.replace(/<[^>]*>/g, '').trim().slice(0, 15) || "空白..."}
                </p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6">
           <button onClick={onLock} className="flex items-center gap-2 text-[10px] text-[#958D85]/60 hover:text-[#4A443F] hover:bg-black/5 rounded-full transition-all w-full justify-center py-2 uppercase tracking-[0.2em] font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>合上</span>
           </button>
        </div>
      </div>
    </>
  );
};
