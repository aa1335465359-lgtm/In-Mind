
import React, { useState } from 'react';
import { JournalEntry, AIAction, ViewMode, MemoryResult } from '../types';
import { ChatRoom } from './ChatRoom';
import { Sidebar } from './journal/Sidebar';
import { Editor } from './journal/Editor';
import { callAI } from '../services/ai';
import { DevConsole } from './DevConsole';

import { MemoryCard } from './journal/MemoryCard';

interface JournalUIProps {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  onContentChange: (text: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onUpdateAiField: (id: string, field: 'aiSummary' | 'aiMood', value: string) => void;
  onUpdateMemory: (id: string, memory: MemoryResult) => void;
  onUpdateMeta: (id: string, meta: Partial<JournalEntry>) => void;
  onLock: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  viewMode: ViewMode;
  onChangeView: (mode: ViewMode) => void;
  initialRoomId?: string; // Passed from App if URL has room param
}

const COLORS = [
  { hex: '#4A443F', label: 'Ink' },
  { hex: '#958D85', label: 'Stone' },
  { hex: '#FAAE9D', label: 'Peach' },
  { hex: '#A3D2C3', label: 'Mint' },
  { hex: '#A7CDE7', label: 'Sky' },
  { hex: '#E2D8F0', label: 'Lavender' },
];

// --- Context Menus ---
interface EditorMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
  onCommand: (cmd: string, val?: string) => void;
  onAI: (action: AIAction) => void;
}

const EditorContextMenu: React.FC<EditorMenuProps> = ({ x, y, visible, onClose, onCommand, onAI }) => {
  if (!visible) return null;
  return (
    <div 
      className="fixed z-50 bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-2xl py-2 w-48 flex flex-col animate-in fade-in zoom-in-95 duration-100 origin-top-left"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()} 
    >
      <div className="px-4 py-1 text-[9px] font-sans text-[#958D85] uppercase tracking-widest mb-1">Type</div>
      <button onClick={() => { onCommand('formatBlock', 'H1'); onClose(); }} className="text-left px-4 py-1.5 hover:bg-black/5 text-[#4A443F] text-sm flex items-center gap-2"><span className="font-semibold font-serif text-base opacity-80">H1</span> 篇章</button>
      <button onClick={() => { onCommand('formatBlock', 'H2'); onClose(); }} className="text-left px-4 py-1.5 hover:bg-black/5 text-[#4A443F] text-sm flex items-center gap-2"><span className="font-semibold font-serif text-sm opacity-80">H2</span> 小节</button>
      <div className="flex justify-between px-4 py-1.5 mt-1">
         <button onClick={() => onCommand('bold')} className="w-8 h-8 hover:bg-black/5 rounded-lg font-bold text-[#4A443F] text-sm">B</button>
         <button onClick={() => onCommand('italic')} className="w-8 h-8 hover:bg-black/5 rounded-lg italic text-[#4A443F] text-sm">I</button>
         <button onClick={() => onCommand('strikeThrough')} className="w-8 h-8 hover:bg-black/5 rounded-lg line-through text-[#4A443F] text-sm">S</button>
      </div>
      <div className="h-[1px] bg-black/5 my-1.5 mx-3"></div>
      <div className="grid grid-cols-4 gap-2 px-4 py-1.5">
          {COLORS.map(c => (
            <button key={c.hex} onClick={() => { onCommand('foreColor', c.hex); onClose(); }} className="w-5 h-5 rounded-full hover:scale-125 transition-transform shadow-inner" style={{ backgroundColor: c.hex }}></button>
          ))}
      </div>
      <div className="h-[1px] bg-black/5 my-1.5 mx-3"></div>
      <div className="px-4 py-1 text-[9px] font-sans text-[#958D85] uppercase tracking-widest">Spark</div>
      <button onClick={() => { onAI(AIAction.PREDICT); onClose(); }} className="text-left px-4 py-1.5 hover:bg-black/5 text-[#4A443F] text-xs flex items-center gap-2">✨ 顺着思绪往下写</button>
      <button onClick={() => { onAI(AIAction.REFLECT); onClose(); }} className="text-left px-4 py-1.5 hover:bg-black/5 text-[#4A443F] text-xs flex items-center gap-2">🪞 照见此刻的心情</button>
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
      className="fixed z-50 bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-2xl py-2 w-32 flex flex-col animate-in fade-in zoom-in-95 duration-100 origin-top-left"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()} 
      onContextMenu={(e) => e.preventDefault()}
    >
      <button onClick={() => { onPin(); onClose(); }} className="text-left px-4 py-2 hover:bg-black/5 text-[#4A443F] text-xs flex items-center gap-2">{isPinned ? '取消置顶' : '归置顶部'}</button>
      <div className="h-[1px] bg-black/5 my-1 mx-3"></div>
      <button onClick={() => { onDelete(); onClose(); }} className="text-left px-4 py-2 hover:bg-red-50 text-[#958D85] hover:text-red-400 text-xs flex items-center gap-2">抹去此页</button>
    </div>
  );
};

export const JournalUI: React.FC<JournalUIProps> = ({
  entries,
  currentEntry,
  onContentChange,
  onSelect,
  onCreate,
  onDelete,
  onUpdateAiField,
  onUpdateMemory,
  onUpdateMeta,
  onLock,
  saveStatus = 'idle',
  viewMode,
  onChangeView,
  initialRoomId
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDevConsole, setShowDevConsole] = useState(false);
  
  // Context Menus
  const [editorMenu, setEditorMenu] = useState({ visible: false, x: 0, y: 0 });
  const [sidebarMenu, setSidebarMenu] = useState({ visible: false, x: 0, y: 0, targetId: '' });

  // Close menus on click
  React.useEffect(() => {
    const handleClick = () => {
      setSidebarMenu(prev => ({ ...prev, visible: false }));
      setEditorMenu(prev => ({ ...prev, visible: false }));
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleSidebarContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSidebarMenu({ visible: true, x: e.pageX, y: e.pageY, targetId: id });
    setEditorMenu({ visible: false, x: 0, y: 0 }); 
  };

  const handleEditorContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentEntry) return;
    setEditorMenu({ visible: true, x: e.pageX, y: e.pageY });
    setSidebarMenu({ visible: false, x: 0, y: 0, targetId: '' }); 
  };

  const handleAICommand = async (action: AIAction) => {
      if (!currentEntry) return;
      if (action === AIAction.PREDICT) {
          alert("请在编辑器中继续输入以触发智能续写");
      } else {
          // Summarize / Reflect
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

  return (
    <div className="w-full h-screen bg-noise text-main font-serif flex overflow-hidden selection:bg-[#FDF3F1] selection:text-[#FAAE9D] relative">
      
      {showDevConsole && (
        <DevConsole 
           entries={entries} 
           onClose={() => setShowDevConsole(false)} 
        />
      )}

      <EditorContextMenu 
        {...editorMenu} 
        onClose={() => setEditorMenu(prev => ({ ...prev, visible: false }))}
        onCommand={(cmd, val) => document.execCommand(cmd, false, val)}
        onAI={handleAICommand}
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

      <Sidebar 
        entries={entries}
        currentEntry={currentEntry}
        isOpen={isSidebarOpen}
        onToggle={setSidebarOpen}
        onSelect={onSelect}
        onCreate={onCreate}
        onDelete={onDelete}
        onLock={onLock}
        onUpdateMeta={onUpdateMeta}
        viewMode={viewMode}
        onChangeView={onChangeView}
        onContextMenu={handleSidebarContextMenu}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onDevTrigger={() => setShowDevConsole(true)}
      />

      {/* 
        PERSISTENT CHAT RENDER:
        We render BOTH ChatRoom and Editor but toggle visibility with CSS.
        This keeps the WebSocket connection alive in ChatRoom even when user is writing in Journal.
      */}

      {/* Chat Room Layer */}
      <div className="flex-1 min-w-0 h-full" style={{ display: viewMode === 'chat' ? 'block' : 'none' }}>
         <ChatRoom 
            entries={entries}
            currentEntry={currentEntry} 
            onClose={() => onChangeView('journal')}
            initialRoomId={initialRoomId} 
         />
      </div>

      {/* Editor / Journal Layer */}
      <div className="flex-1 min-w-0 h-full flex" style={{ display: viewMode === 'journal' ? 'flex' : 'none' }}>
        {currentEntry ? (
          <>
            <div className="flex-[2] flex flex-col min-w-0">
              <Editor 
                currentEntry={currentEntry}
                onContentChange={onContentChange}
                onUpdateAiField={onUpdateAiField}
                onUpdateMemory={onUpdateMemory}
                onUpdateMeta={onUpdateMeta}
                onContextMenu={handleEditorContextMenu}
                onDelete={onDelete}
                onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
                saveStatus={saveStatus}
              />
            </div>
            <div className="hidden xl:block flex-1 min-w-[320px] max-w-[400px]">
              <MemoryCard 
                memory={currentEntry.memoryResult || null}
                isGenerating={currentEntry.aiMood === '正在凝结印记...'} 
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#958D85] select-none animate-in fade-in duration-700">
             <button onClick={onCreate} className="group flex flex-col items-center gap-4 opacity-50 hover:opacity-100 transition-all">
                <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center group-hover:shadow-md group-hover:-translate-y-1 transition-all">
                  <span className="font-serif italic text-2xl text-[#FAAE9D]">+</span>
                </div>
                <span className="text-[10px] font-sans tracking-[0.3em] uppercase">翻开新的一页</span>
             </button>
             <button onClick={() => setSidebarOpen(true)} className="md:hidden mt-8 text-xs text-[#958D85] hover:text-[#FAAE9D]">打开目录</button>
          </div>
        )}
      </div>

    </div>
  );
};
