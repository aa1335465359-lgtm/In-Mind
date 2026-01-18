import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry, AIAction, ViewMode } from '../types';
import { callAI } from '../services/ai';
import { uploadImage } from '../services/storage';
import { ChatRoom } from './ChatRoom';

interface JournalUIProps {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  onContentChange: (text: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onUpdateAiField: (id: string, field: 'aiSummary' | 'aiMood', value: string) => void;
  onUpdateMeta: (id: string, meta: Partial<JournalEntry>) => void;
  onLock: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  viewMode: ViewMode;
  onChangeView: (mode: ViewMode) => void;
}

// Desaturated "Morandi" Colors
const COLORS = [
  { hex: '#44403c', label: 'Ink' },       // Stone 700
  { hex: '#78716c', label: 'Stone' },     // Stone 500
  { hex: '#a8a29e', label: 'Mist' },      // Stone 400
  { hex: '#b38676', label: 'Clay' },      // Morandi Red
  { hex: '#8a9a8a', label: 'Sage' },      // Morandi Green
  { hex: '#6f7c85', label: 'Slate' },     // Morandi Blue
  { hex: '#c9a66b', label: 'Mustard' },   // Morandi Yellow
];

const MOODS = ['☁️', '🌞', '🌧️', '☕', '🍷', '🌲', '🌙', '🌊', '😶'];

// --- Sub-components ---

const ToolbarButton = ({ onClick, children, active = false, className = '', title = '' }: any) => (
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

// --- Context Menus ---

interface EditorMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
  onCommand: (cmd: string, val?: string) => void;
  onAI: (action: AIAction) => void;
  onImageTrigger: () => void;
}

const EditorContextMenu: React.FC<EditorMenuProps> = ({ x, y, visible, onClose, onCommand, onAI, onImageTrigger }) => {
  if (!visible) return null;
  return (
    <div 
      className="fixed z-50 bg-white/95 backdrop-blur-md border border-stone-200 shadow-xl rounded-lg py-1.5 w-48 flex flex-col animate-in fade-in zoom-in-95 duration-100 origin-top-left ring-1 ring-black/5"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()} 
    >
      <div className="px-3 py-1 text-[10px] font-sans text-stone-400 uppercase tracking-widest mb-1 border-b border-stone-100">格式</div>
      
      <button onClick={() => { onCommand('formatBlock', 'H1'); onClose(); }} className="text-left px-4 py-1.5 hover:bg-stone-50 text-stone-700 text-sm flex items-center gap-2 transition-colors">
        <span className="font-bold font-serif text-base opacity-80">H1</span> 大标题
      </button>
      <button onClick={() => { onCommand('formatBlock', 'H2'); onClose(); }} className="text-left px-4 py-1.5 hover:bg-stone-50 text-stone-700 text-sm flex items-center gap-2 transition-colors">
        <span className="font-bold font-serif text-sm opacity-80">H2</span> 副标题
      </button>
      
      <div className="flex justify-between px-4 py-1.5">
         <button onClick={() => onCommand('bold')} className="w-8 h-8 hover:bg-stone-100 rounded font-bold text-stone-600 text-sm">B</button>
         <button onClick={() => onCommand('italic')} className="w-8 h-8 hover:bg-stone-100 rounded italic text-stone-600 text-sm">I</button>
         <button onClick={() => onCommand('strikeThrough')} className="w-8 h-8 hover:bg-stone-100 rounded line-through text-stone-600 text-sm">S</button>
      </div>

      <div className="h-[1px] bg-stone-100 my-1 mx-3"></div>
      
      <div className="grid grid-cols-4 gap-2 px-4 py-1.5">
          {COLORS.map(c => (
            <button 
              key={c.hex} 
              onClick={() => { onCommand('foreColor', c.hex); onClose(); }} 
              className="w-5 h-5 rounded-full hover:scale-110 transition-transform ring-1 ring-stone-200"
              style={{ backgroundColor: c.hex }}
              title={c.label}
            ></button>
          ))}
      </div>

      <div className="h-[1px] bg-stone-100 my-1 mx-3"></div>
      
      <button onClick={() => { onImageTrigger(); onClose(); }} className="text-left px-4 py-1.5 hover:bg-stone-50 text-stone-600 text-xs flex items-center gap-2 transition-colors">
        🖼️ 插入图片
      </button>

      <div className="px-3 py-1 mt-1 text-[10px] font-sans text-stone-400 uppercase tracking-widest border-t border-stone-100">AI 灵感</div>
      <button onClick={() => { onAI(AIAction.PREDICT); onClose(); }} className="text-left px-4 py-1.5 hover:bg-stone-50 text-stone-600 text-xs flex items-center gap-2">
        ✍️ 智能续写
      </button>
      <button onClick={() => { onAI(AIAction.REFLECT); onClose(); }} className="text-left px-4 py-1.5 hover:bg-stone-50 text-stone-600 text-xs flex items-center gap-2">
        🔮 情绪洞察
      </button>
    </div>
  );
};

interface SidebarMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
  onPin: () => void;
  onDelete: () => void;
  isPinned: boolean;
}

const SidebarContextMenu: React.FC<SidebarMenuProps> = ({ x, y, visible, onClose, onPin, onDelete, isPinned }) => {
  if (!visible) return null;
  return (
    <div 
      className="fixed z-50 bg-white/95 backdrop-blur-md border border-stone-100 shadow-xl rounded-lg py-1 w-32 flex flex-col animate-in fade-in zoom-in-95 duration-100 origin-top-left ring-1 ring-black/5"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()} 
      onContextMenu={(e) => e.preventDefault()}
    >
      <button onClick={() => { onPin(); onClose(); }} className="text-left px-4 py-2 hover:bg-stone-50 text-stone-600 text-xs flex items-center gap-2 transition-colors">
        <span className="opacity-70">{isPinned ? '❌' : '📌'}</span> {isPinned ? '取消置顶' : '置顶'}
      </button>
      <button onClick={() => { onDelete(); onClose(); }} className="text-left px-4 py-2 hover:bg-red-50 text-stone-500 hover:text-red-500 text-xs flex items-center gap-2 transition-colors">
        <span className="opacity-70">🗑️</span> 删除
      </button>
    </div>
  );
};

// --- Main UI ---

export const JournalUI: React.FC<JournalUIProps> = ({
  entries,
  currentEntry,
  onContentChange,
  onSelect,
  onCreate,
  onDelete,
  onUpdateAiField,
  onUpdateMeta,
  onLock,
  saveStatus = 'idle',
  viewMode,
  onChangeView
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  
  // Context Menus State
  const [editorMenu, setEditorMenu] = useState({ visible: false, x: 0, y: 0 });
  const [sidebarMenu, setSidebarMenu] = useState({ visible: false, x: 0, y: 0, targetId: '' });

  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // AI Auto-Complete Refs
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAiThinkingRef = useRef<boolean>(false);

  // Handle Mobile Resize Logic
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    // Initialize
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (viewMode === 'journal' && editorRef.current && currentEntry) {
      // Clean any ghost tags before rendering
      const cleanContent = currentEntry.content.replace(/<span id="ai-ghost".*?>.*?<\/span>/g, '');
      if (editorRef.current.innerHTML !== cleanContent) {
        editorRef.current.innerHTML = cleanContent;
      }
    }
  }, [currentEntry?.id, viewMode]); 

  // Global click/context to close menus
  useEffect(() => {
    const handleClick = () => {
      setSidebarMenu(prev => ({ ...prev, visible: false }));
      setEditorMenu(prev => ({ ...prev, visible: false }));
      setShowMoodPicker(false);
    };
    
    const handleContextMenu = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.rich-editor') && !target.closest('.sidebar-item') && target.tagName !== 'INPUT') {
            e.preventDefault();
        }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput(); 
  };

  const clearGhostText = () => {
    if (!editorRef.current) return;
    const ghost = editorRef.current.querySelector('#ai-ghost');
    if (ghost) {
      ghost.remove();
    }
  };

  const handleInput = () => {
    // 1. Clear any existing timers
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // 2. Clear Ghost text if user is typing (but not if confirming via Tab, which is handled in onKeyDown)
    // Note: We handle the visual removal here to be safe
    const ghost = editorRef.current?.querySelector('#ai-ghost');
    if (ghost) ghost.remove();

    // 3. Update State (Clean content first)
    if (editorRef.current && currentEntry) {
      const html = editorRef.current.innerHTML;
      // Strip ghost tag if somehow it got into the string
      const cleanHtml = html.replace(/<span id="ai-ghost".*?>.*?<\/span>/g, '');
      
      if (cleanHtml !== currentEntry.content) {
        onContentChange(cleanHtml);
      }
      
      // 4. Set Timer for AI Auto-Complete (4 seconds)
      if (cleanHtml.trim().length > 10) { // Only if meaningful content exists
         typingTimerRef.current = setTimeout(() => {
            triggerAiAutoComplete();
         }, 4000); // 4 seconds idle
      }
    }
  };

  const triggerAiAutoComplete = async () => {
    if (isAiThinkingRef.current || !editorRef.current) return;
    
    // Get plain text for context
    const textContext = editorRef.current.innerText;
    if (!textContext || textContext.length < 5) return;

    isAiThinkingRef.current = true;
    
    // Call AI
    const suggestion = await callAI(textContext.slice(-500), AIAction.PREDICT);
    
    isAiThinkingRef.current = false;
    
    if (suggestion && editorRef.current) {
       // Insert visual ghost text
       const sel = window.getSelection();
       if (sel && sel.rangeCount > 0 && sel.anchorNode && editorRef.current.contains(sel.anchorNode)) {
           const range = sel.getRangeAt(0);
           const span = document.createElement('span');
           span.id = 'ai-ghost';
           span.contentEditable = 'false';
           span.innerText = suggestion;
           span.style.color = '#a8a29e'; // stone-400
           span.style.opacity = '0.7';
           span.style.pointerEvents = 'none';
           
           range.insertNode(span);
           range.collapse(false);
       }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const ghost = editorRef.current?.querySelector('#ai-ghost') as HTMLElement;

    if (e.key === 'Tab') {
       e.preventDefault();
       if (ghost) {
         const text = ghost.innerText;
         ghost.remove();
         document.execCommand('insertText', false, text);
         handleInput();
       } else {
         execCmd('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;'); 
       }
    } else if (e.key === 'Enter') {
        if (ghost) ghost.remove();
    } else {
        if (ghost && !e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
             ghost.remove();
        }
    }

    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); execCmd('bold'); }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    clearGhostText();
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      processFiles(e.clipboardData.files);
      return;
    }
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (text) document.execCommand('insertText', false, text);
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    const localUrl = URL.createObjectURL(file);
    const uniqueId = `img-${Date.now()}`;

    const imgHtml = `<img id="${uniqueId}" src="${localUrl}" class="journal-image opacity-80" /><br>`;
    document.execCommand('insertHTML', false, imgHtml);
    handleInput(); 

    const publicUrl = await uploadImage(file);
    const imgElement = document.getElementById(uniqueId) as HTMLImageElement;
    if (imgElement && publicUrl) {
      imgElement.src = publicUrl;
      imgElement.classList.remove('opacity-80');
      if (currentEntry) {
        const currentImages = currentEntry.images || [];
        onUpdateMeta(currentEntry.id, { images: [...currentImages, publicUrl] });
      }
      handleInput(); 
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // --- Menu Handlers ---

  const handleSidebarContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSidebarMenu({ visible: true, x: e.pageX, y: e.pageY, targetId: id });
    setEditorMenu({ visible: false, x: 0, y: 0 }); // Close other
  };

  const handleEditorContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentEntry) return;
    setEditorMenu({ visible: true, x: e.pageX, y: e.pageY });
    setSidebarMenu({ visible: false, x: 0, y: 0, targetId: '' }); // Close other
  };

  // --- AI Manual Trigger ---
  const handleAIAction = async (action: AIAction) => {
    if (!currentEntry) return;
    
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    clearGhostText();

    if (action === AIAction.PREDICT) {
       const tempDiv = document.createElement("div");
       tempDiv.innerHTML = currentEntry.content;
       const plainText = tempDiv.innerText || "";
       
       onUpdateAiField(currentEntry.id, 'aiSummary', '✨ 正在构思...');
       
       const result = await callAI(plainText.slice(-500), action);
       
       onUpdateAiField(currentEntry.id, 'aiSummary', '');
       
       if (result) {
          document.execCommand('insertText', false, result);
          handleInput();
       }
    } else {
        if (action === AIAction.SUMMARIZE) onUpdateAiField(currentEntry.id, 'aiSummary', '✨ 正在思考...');
        if (action === AIAction.REFLECT) onUpdateAiField(currentEntry.id, 'aiMood', '🔮 正在感应...');

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = currentEntry.content;
        const plainText = tempDiv.textContent || "";
        
        const result = await callAI(plainText, action);
        
        if (action === AIAction.SUMMARIZE) onUpdateAiField(currentEntry.id, 'aiSummary', result);
        else if (action === AIAction.REFLECT) onUpdateAiField(currentEntry.id, 'aiMood', result);
    }
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
             e.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    })
    .sort((a, b) => {
       if (a.isPinned && !b.isPinned) return -1;
       if (!a.isPinned && b.isPinned) return 1;
       return b.createdAt - a.createdAt;
    });

  // Mobile Auto-Close Helper
  const handleMobileSelect = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="w-full h-screen bg-[#Fdfbf7] text-[#44403c] font-serif flex overflow-hidden selection:bg-stone-200">
      
      {/* Menus */}
      <EditorContextMenu 
        {...editorMenu} 
        onClose={() => setEditorMenu(prev => ({ ...prev, visible: false }))}
        onCommand={execCmd}
        onAI={handleAIAction}
        onImageTrigger={() => fileInputRef.current?.click()}
      />
      
      <SidebarContextMenu
         {...sidebarMenu}
         onClose={() => setSidebarMenu(prev => ({ ...prev, visible: false }))}
         isPinned={entries.find(e => e.id === sidebarMenu.targetId)?.isPinned || false}
         onPin={() => {
            const entry = entries.find(e => e.id === sidebarMenu.targetId);
            if (entry) onUpdateMeta(entry.id, { isPinned: !entry.isPinned });
         }}
         onDelete={() => onDelete(sidebarMenu.targetId)}
      />

      <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} className="hidden" />

      {/* Mobile Backdrop Overlay - Closes sidebar on click */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-20 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`
        flex-shrink-0 flex flex-col border-r border-[#efece5] bg-[#f8f6f1] h-full transition-all duration-300 ease-in-out z-30 shadow-2xl md:shadow-none
        ${isSidebarOpen ? 'w-[85%] md:w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 md:opacity-100'} 
        absolute md:relative
        overflow-hidden
      `}>
        <div className="p-6 pt-8 pb-2">
          {/* Logo & Close Button (Mobile) */}
          <div className="flex justify-between items-center mb-6 pl-1">
             <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 bg-stone-400 rounded-full"></div>
                <h1 className="text-sm font-bold tracking-[0.3em] text-stone-600 font-serif whitespace-nowrap">隐念</h1>
             </div>
             
             {/* Mobile Close Button */}
             <button onClick={() => setSidebarOpen(false)} className="md:hidden text-stone-400 p-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>

          {/* New Prominent Mode Switcher */}
          <div className="flex flex-col gap-3 mb-6">
            <button 
              onClick={() => { onChangeView('journal'); handleMobileSelect(); }} 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 text-xs font-bold tracking-wider uppercase
                ${viewMode === 'journal' 
                  ? 'bg-white border-stone-200 text-stone-700 shadow-sm' 
                  : 'bg-transparent border-transparent text-stone-400 hover:bg-stone-200/50'}
              `}
            >
              <span>📔</span> 我的日记
            </button>
            <button 
              onClick={() => { onChangeView('chat'); handleMobileSelect(); }} 
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
          
          <div className="relative group mx-1 mb-2">
             <input 
               type="text" 
               placeholder="Search" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-transparent border-b border-[#e7e5e4] py-1.5 px-0 pl-5 text-[11px] font-sans outline-none focus:border-stone-300 transition-colors placeholder:text-stone-300 text-stone-500 tracking-wider"
             />
             <svg className="absolute left-0 top-2 text-stone-300 group-focus-within:text-stone-400 transition-colors" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>
        
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
              onClick={() => {
                onSelect(entry.id);
                onChangeView('journal'); // Switch back to journal on select
                handleMobileSelect(); // Close sidebar on mobile
              }}
              onContextMenu={(e) => handleSidebarContextMenu(e, entry.id)}
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
        
        <div className="p-4 border-t border-[#efece5]">
           <button onClick={onLock} className="flex items-center gap-2 text-[10px] text-stone-300 hover:text-stone-500 transition-colors w-full justify-center py-2 tracking-widest uppercase">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>Lock System</span>
           </button>
        </div>
      </div>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col h-full relative bg-[#Fdfbf7] min-w-0">
        
        {viewMode === 'chat' ? (
          <ChatRoom 
            entries={entries} // PASS ENTRIES HERE
            currentEntry={currentEntry} 
            onClose={() => onChangeView('journal')} 
          />
        ) : (
          <>
            {/* TOP TOOLBAR */}
            <div className="h-12 border-b border-stone-100 flex items-center justify-between px-2 md:px-4 bg-[#fcfaf5] z-20 shrink-0">
              
              <div className="flex items-center gap-1 md:gap-2">
                  <ToolbarButton onClick={() => setSidebarOpen(!isSidebarOpen)} title="Toggle Sidebar">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                  </ToolbarButton>

                  <div className="w-[1px] h-4 bg-stone-200 mx-1 md:mx-2"></div>

                  <ToolbarButton onClick={() => execCmd('formatBlock', 'H1')} title="Heading 1">
                    <span className="font-serif font-bold text-xs">H1</span>
                  </ToolbarButton>
                  <ToolbarButton onClick={() => execCmd('formatBlock', 'H2')} title="Heading 2">
                    <span className="font-serif font-bold text-[10px]">H2</span>
                  </ToolbarButton>
                  <ToolbarButton onClick={() => execCmd('bold')} title="Bold">
                    <span className="font-bold text-xs font-serif">B</span>
                  </ToolbarButton>
                  <ToolbarButton onClick={() => execCmd('italic')} title="Italic">
                    <span className="italic text-xs font-serif">I</span>
                  </ToolbarButton>
                  
                  <div className="w-[1px] h-4 bg-stone-200 mx-1"></div>

                  <ToolbarButton onClick={() => execCmd('foreColor', '#b38676')} className="text-[#b38676]/80 hover:text-[#b38676]" title="Highlight Color">
                    <span className="font-serif font-bold text-sm">A</span>
                  </ToolbarButton>

                  <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Insert Image">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  </ToolbarButton>
                  
                  <ToolbarButton onClick={() => handleAIAction(AIAction.REFLECT)} title="AI Insight">
                    <span className="text-xs">🔮</span>
                  </ToolbarButton>
              </div>

              <div className="flex items-center gap-2">
                  {/* SAVE STATUS INDICATOR */}
                  {saveStatus === 'saving' && (
                    <span className="text-[10px] text-stone-400 font-sans tracking-wider animate-pulse">☁️ 同步中...</span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-[10px] text-stone-300 font-sans tracking-wider">☁️ 已同步</span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-[10px] text-red-400 font-sans tracking-wider flex items-center gap-1 cursor-help" title="请检查网络设置或稍后重试">
                      <span>☁️</span> 
                      <span>同步失败</span>
                    </span>
                  )}

                  {currentEntry && (
                    <ToolbarButton onClick={() => onDelete(currentEntry.id)} className="hover:text-red-400 hover:bg-red-50" title="Delete Entry">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </ToolbarButton>
                  )}
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative" onClick={() => editorRef.current?.focus()}>
              {currentEntry ? (
                <div className="max-w-[700px] mx-auto min-h-[90vh] p-8 md:p-12 animate-in fade-in duration-500">
                    
                    {/* Header */}
                    <div className="flex items-end justify-between mb-10 select-none group">
                        <div className="flex items-end gap-3">
                            <h2 className="text-4xl font-bold text-stone-700 font-serif tracking-tight leading-none">{formatDate(currentEntry.createdAt)}</h2>
                            <span className="text-stone-300 font-sans tracking-[0.2em] text-[10px] uppercase pb-1.5">{getWeekDay(currentEntry.createdAt)}</span>
                        </div>
                        
                        {/* MOOD PICKER */}
                        <div className="relative pb-0.5">
                          <button 
                              onClick={(e) => { e.stopPropagation(); setShowMoodPicker(!showMoodPicker); }}
                              className="w-12 h-12 flex items-center justify-center text-4xl hover:scale-110 transition-transform cursor-pointer"
                              title="选择今日心情"
                          >
                              {currentEntry.userMood || '😶'}
                          </button>
                          {showMoodPicker && (
                            <div className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur border border-stone-100 shadow-xl rounded-xl p-3 flex gap-2 animate-in fade-in zoom-in-95 duration-200 w-max z-50 ring-1 ring-black/5">
                              {MOODS.map(m => (
                                <button 
                                  key={m}
                                  onClick={() => { onUpdateMeta(currentEntry.id, { userMood: m }); setShowMoodPicker(false); }}
                                  className="w-10 h-10 flex items-center justify-center hover:bg-stone-50 rounded-lg text-2xl hover:scale-125 transition-transform"
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                    </div>

                    {/* AI Insight */}
                    {(currentEntry.aiSummary || currentEntry.aiMood) && (
                      <div className="mb-10 pl-3 border-l-2 border-stone-200/60 text-stone-400 text-xs font-serif leading-relaxed select-none hover:text-stone-500 transition-colors cursor-default">
                          {currentEntry.aiMood && <p className="mb-1">{currentEntry.aiMood}</p>}
                      </div>
                    )}

                    {/* RICH EDITOR */}
                    <div 
                      ref={editorRef}
                      contentEditable
                      onInput={handleInput}
                      onPaste={handlePaste}
                      onDrop={handleDrop}
                      onContextMenu={handleEditorContextMenu} 
                      onKeyDown={handleKeyDown}
                      className="rich-editor text-[17px] text-[#44403c] leading-loose font-serif min-h-[60vh] focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-300/50 empty:before:text-sm empty:before:font-sans selection:bg-[#e7e5e4] selection:text-stone-800"
                      data-placeholder="Start writing... (停顿3秒自动续写，Tab键确认)"
                    />

                    {/* Tags */}
                    <div className="mt-16 flex flex-wrap gap-2 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-500">
                        {currentEntry.tags.map(tag => (
                          <span key={tag} className="text-[9px] text-stone-400 border border-stone-200/80 px-2 py-0.5 rounded-[2px] tracking-wide">#{tag}</span>
                        ))}
                        <input 
                          type="text" 
                          placeholder="+ tag"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = e.currentTarget.value.trim();
                              if (val && !currentEntry.tags.includes(val)) {
                                onUpdateMeta(currentEntry.id, { tags: [...currentEntry.tags, val] });
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                          className="bg-transparent border-none outline-none text-[9px] text-stone-400 placeholder:text-stone-200 font-sans w-16"
                        />
                    </div>

                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-stone-300 select-none animate-in fade-in zoom-in-95 duration-700">
                    <button onClick={onCreate} className="group flex flex-col items-center gap-4 opacity-40 hover:opacity-80 transition-all">
                        <div className="w-12 h-12 border-[0.5px] border-stone-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="font-serif italic text-lg">+</span>
                        </div>
                        <span className="text-[10px] font-sans tracking-[0.3em] uppercase">Create New</span>
                    </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};