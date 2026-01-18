
import React, { useState } from 'react';
import { JournalEntry, AIAction, ViewMode } from '../types';
import { ChatRoom } from './ChatRoom';
import { Sidebar } from './journal/Sidebar';
import { Editor } from './journal/Editor';
import { callAI } from '../services/ai';
import { DevConsole } from './DevConsole';

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
  initialRoomId?: string; // Passed from App if URL has room param
}

const COLORS = [
  { hex: '#44403c', label: 'Ink' },
  { hex: '#78716c', label: 'Stone' },
  { hex: '#a8a29e', label: 'Mist' },
  { hex: '#b38676', label: 'Clay' },
  { hex: '#8a9a8a', label: 'Sage' },
  { hex: '#6f7c85', label: 'Slate' },
  { hex: '#c9a66b', label: 'Mustard' },
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
      className="fixed z-50 bg-white/95 backdrop-blur-md border border-stone-200 shadow-xl rounded-lg py-1.5 w-48 flex flex-col animate-in fade-in zoom-in-95 duration-100 origin-top-left ring-1 ring-black/5"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()} 
    >
      <div className="px-3 py-1 text-[10px] font-sans text-stone-400 uppercase tracking-widest mb-1 border-b border-stone-100">格式</div>
      <button onClick={() => { onCommand('formatBlock', 'H1'); onClose(); }} className="text-left px-4 py-1.5 hover:bg-stone-50 text-stone-700 text-sm flex items-center gap-2"><span className="font-bold font-serif text-base opacity-80">H1</span> 大标题</button>
      <button onClick={() => { onCommand('formatBlock', 'H2'); onClose(); }} className="text-left px-4 py-1.5 hover:bg-stone-50 text-stone-700 text-sm flex items-center gap-2"><span className="font-bold font-serif text-sm opacity-80">H2</span> 副标题</button>
      <div className="flex justify-between px-4 py-1.5">
         <button onClick={() => onCommand('bold')} className="w-8 h-8 hover:bg-stone-100 rounded font-bold text-stone-600 text-sm">B</button>
         <button onClick={() => onCommand('italic')} className="w-8 h-8 hover:bg-stone-100 rounded italic text-stone-600 text-sm">I</button>
         <button onClick={() => onCommand('strikeThrough')} className="w-8 h-8 hover:bg-stone-100 rounded line-through text-stone-600 text-sm">S</button>
      </div>
      <div className="h-[1px] bg-stone-100 my-1 mx-3"></div>
      <div className="grid grid-cols-4 gap-2 px-4 py-1.5">
          {COLORS.map(c => (
            <button key={c.hex} onClick={() => { onCommand('foreColor', c.hex); onClose(); }} className="w-5 h-5 rounded-full hover:scale-110 transition-transform ring-1 ring-stone-200" style={{ backgroundColor: c.hex }}></button>
          ))}
      </div>
      <div className="px-3 py-1 mt-1 text-[10px] font-sans text-stone-400 uppercase tracking-widest border-t border-stone-100">AI 灵感</div>
      <button onClick={() => { onAI(AIAction.PREDICT); onClose(); }} className="text-left px-4 py-1.5 hover:bg-stone-50 text-stone-600 text-xs flex items-center gap-2">✍️ 智能续写</button>
      <button onClick={() => { onAI(AIAction.REFLECT); onClose(); }} className="text-left px-4 py-1.5 hover:bg-stone-50 text-stone-600 text-xs flex items-center gap-2">🔮 情绪洞察</button>
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
      <button onClick={() => { onPin(); onClose(); }} className="text-left px-4 py-2 hover:bg-stone-50 text-stone-600 text-xs flex items-center gap-2"><span className="opacity-70">{isPinned ? '❌' : '📌'}</span> {isPinned ? '取消置顶' : '置顶'}</button>
      <button onClick={() => { onDelete(); onClose(); }} className="text-left px-4 py-2 hover:bg-red-50 text-stone-500 hover:text-red-500 text-xs flex items-center gap-2"><span className="opacity-70">🗑️</span> 删除</button>
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
    <div className="w-full h-screen bg-[#Fdfbf7] text-[#44403c] font-serif flex overflow-hidden selection:bg-stone-200 relative">
      
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

      {viewMode === 'chat' ? (
        <ChatRoom 
          entries={entries}
          currentEntry={currentEntry} 
          onClose={() => onChangeView('journal')}
          initialRoomId={initialRoomId} 
        />
      ) : (
        currentEntry ? (
          <Editor 
            currentEntry={currentEntry}
            onContentChange={onContentChange}
            onUpdateAiField={onUpdateAiField}
            onUpdateMeta={onUpdateMeta}
            onContextMenu={handleEditorContextMenu}
            onDelete={onDelete}
            onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
            saveStatus={saveStatus}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-300 select-none animate-in fade-in zoom-in-95 duration-700 bg-[#Fdfbf7]">
             <button onClick={onCreate} className="group flex flex-col items-center gap-4 opacity-40 hover:opacity-80 transition-all">
                <div className="w-12 h-12 border-[0.5px] border-stone-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="font-serif italic text-lg">+</span>
                </div>
                <span className="text-[10px] font-sans tracking-[0.3em] uppercase">Create New</span>
             </button>
             <button onClick={() => setSidebarOpen(true)} className="md:hidden mt-8 text-xs text-stone-400">Open Menu</button>
          </div>
        )
      )}
    </div>
  );
};
