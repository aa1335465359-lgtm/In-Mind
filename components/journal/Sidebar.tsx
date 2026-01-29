
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
  // --- Developer Mode Trigger Logic ---
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoClick = () => {
    // Clear existing timeout to keep the chain alive
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount >= 7) {
      // Trigger!
      if (onDevTrigger) onDevTrigger();
      setClickCount(0);
    } else if (newCount > 3) {
      // Optional: Visual hint could go here, but kept silent for now
      // console.log(`Step ${newCount}/7`);
    }

    // Reset count if no click within 500ms
    clickTimeoutRef.current = setTimeout(() => {
      setClickCount(0);
    }, 500);
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };
  const getWeekDay = (timestamp: number) => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[new Date(timestamp).getDay()];
  };

  const filteredEntries = entries
    .filter(e => {
      const textContent = e.content.replace(/<[^>]*>/g, '').toLowerCase(); 
      return textContent.includes(searchTerm.toLowerCase()) || 
             e.tags.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    })
    .sort((a, b) => {
       if (a.isPinned && !b.isPinned) return -1;
       if (!a.isPinned && b.isPinned) return 1;
       return b.createdAt - a.createdAt;
    });

  // Mobile selection helper
  const handleSelect = (id: string) => {
    onSelect(id);
    onChangeView('journal');
    if (window.innerWidth < 768) {
      onToggle(false);
    }
  };

  const handleViewChange = (mode: ViewMode) => {
    onChangeView(mode);
    if (window.innerWidth < 768) {
      onToggle(false);
    }
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-20 md:hidden" 
          onClick={() => onToggle(false)}
        ></div>
      )}

      <div className={`
        flex-shrink-0 flex flex-col border-r border-[#efece5] bg-[#f8f6f1] h-full transition-all duration-300 ease-in-out z-30 shadow-2xl md:shadow-none
        ${isOpen ? 'w-[85%] md:w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 md:opacity-100'} 
        absolute md:relative
        overflow-hidden
      `}>
        <div className="p-6 pt-8 pb-2">
          {/* Header with Secret Trigger */}
          <div className="flex justify-between items-center mb-6 pl-1">
             <div 
               className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity cursor-pointer select-none"
               onClick={handleLogoClick}
               title={clickCount > 0 ? `Step ${clickCount}...` : "Quietly"}
             >
                <div className={`w-2 h-2 rounded-full transition-colors ${clickCount > 4 ? 'bg-red-400 animate-pulse' : 'bg-stone-400'}`}></div>
                <h1 className="text-sm font-bold tracking-[0.3em] text-stone-600 font-serif whitespace-nowrap">悄悄</h1>
             </div>
             <button onClick={() => onToggle(false)} className="md:hidden text-stone-400 p-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex flex-col gap-3 mb-6">
            <button 
              onClick={() => handleViewChange('journal')} 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 text-xs font-bold tracking-wider uppercase
                ${viewMode === 'journal' 
                  ? 'bg-white border-stone-200 text-stone-700 shadow-sm' 
                  : 'bg-transparent border-transparent text-stone-400 hover:bg-stone-200/50'}
              `}
            >
              <span>📔</span> 我的日记
            </button>
            <button 
              onClick={() => handleViewChange('chat')} 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 text-xs font-bold tracking-wider uppercase
                ${viewMode === 'chat' 
                  ? 'bg-[#2d2d2d] border-[#2d2d2d] text-white shadow-md' 
                  : 'bg-transparent border-stone-200 text-stone-500 hover:bg-[#2d2d2d] hover:text-white'}
              `}
            >
              <span>💬</span> 匿名潜行
              <span className="ml-auto bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-sans">New</span>
            </button>
          </div>
          
          {/* Search */}
          <div className="relative group mx-1 mb-2">
             <input 
               type="text" 
               placeholder="Search" 
               value={searchTerm}
               onChange={(e) => onSearchChange(e.target.value)}
               className="w-full bg-transparent border-b border-[#e7e5e4] py-1.5 px-0 pl-5 text-[11px] font-sans outline-none focus:border-stone-300 transition-colors placeholder:text-stone-300 text-stone-500 tracking-wider"
             />
             <svg className="absolute left-0 top-2 text-stone-300 group-focus-within:text-stone-400 transition-colors" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>
        
        {/* Entry List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 custom-scrollbar">
          <div className="flex items-center justify-between px-2 py-2 mb-2">
             <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">Recent Entries</span>
             <button onClick={onCreate} className="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded transition-colors" title="New Entry">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             </button>
          </div>

          {filteredEntries.map(entry => (
            <div 
              key={entry.id}
              onClick={() => handleSelect(entry.id)}
              onContextMenu={(e) => onContextMenu(e, entry.id)}
              className={`
                sidebar-item group p-3 rounded cursor-pointer transition-all duration-300 relative select-none
                ${currentEntry?.id === entry.id && viewMode === 'journal'
                  ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]' 
                  : 'hover:bg-stone-200/30'}
              `}
            >
              <div className="flex justify-between items-baseline mb-1.5">
                 <div className="flex items-center gap-2 overflow-hidden">
                    {entry.isPinned && <span className="text-[9px] text-stone-400">📌</span>}
                    <span className={`font-sans text-xs tracking-wide truncate ${currentEntry?.id === entry.id && viewMode === 'journal' ? 'text-stone-600 font-medium' : 'text-stone-500'}`}>{formatDate(entry.createdAt)}</span>
                 </div>
                 <span className="text-[9px] text-stone-300 font-sans flex-shrink-0">{getWeekDay(entry.createdAt)}</span>
              </div>
              <p className={`text-[10px] truncate font-sans leading-relaxed ${currentEntry?.id === entry.id && viewMode === 'journal' ? 'text-stone-400' : 'text-stone-300'}`}>
                {entry.content.replace(/<[^>]*>/g, '').slice(0, 30) || "Nothing written..."}
              </p>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-[#efece5]">
           <button onClick={onLock} className="flex items-center gap-2 text-[10px] text-stone-300 hover:text-stone-500 transition-colors w-full justify-center py-2 tracking-widest uppercase">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>Lock System</span>
           </button>
        </div>
      </div>
    </>
  );
};