import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry, AIAction } from '../../types';
import { callAI } from '../../services/ai';
import { uploadImage } from '../../services/storage';

interface EditorProps {
  currentEntry: JournalEntry;
  onContentChange: (text: string) => void;
  onUpdateAiField: (id: string, field: 'aiSummary' | 'aiMood', value: string) => void;
  onUpdateMeta: (id: string, meta: Partial<JournalEntry>) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
  onToggleSidebar: () => void;
  saveStatus: string;
}

// Desaturated "Morandi" Colors
const MOODS = ['☁️', '🌞', '🌧️', '☕', '🍷', '🌲', '🌙', '🌊', '😶'];

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

export const Editor: React.FC<EditorProps> = ({
  currentEntry,
  onContentChange,
  onUpdateAiField,
  onUpdateMeta,
  onContextMenu,
  onDelete,
  onToggleSidebar,
  saveStatus
}) => {
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [showDisableHint, setShowDisableHint] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAiThinkingRef = useRef<boolean>(false);
  
  // AI State
  const rejectionCountRef = useRef<number>(0);
  const tapCloseCountRef = useRef<number>(0);

  // Sync Content
  useEffect(() => {
    if (editorRef.current) {
      const cleanContent = currentEntry.content.replace(/<span id="ai-ghost".*?>.*?<\/span>/g, '');
      if (editorRef.current.innerHTML !== cleanContent) {
        editorRef.current.innerHTML = cleanContent;
      }
    }
  }, [currentEntry.id]);

  // Click handler for interactions
  useEffect(() => {
    const handleClick = () => setShowMoodPicker(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput(); 
  };

  const clearGhostText = () => {
    if (!editorRef.current) return;
    const ghost = editorRef.current.querySelector('#ai-ghost');
    if (ghost) ghost.remove();
  };

  const handleInput = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    // Ghost text rejection logic
    const ghost = editorRef.current?.querySelector('#ai-ghost');
    if (ghost) {
       ghost.remove();
       rejectionCountRef.current += 1;
       
       // Threshold set to 2 as requested ("second time")
       if (rejectionCountRef.current >= 2) {
         setShowDisableHint(true);
       }
    }

    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const cleanHtml = html.replace(/<span id="ai-ghost".*?>.*?<\/span>/g, '');
      
      if (cleanHtml !== currentEntry.content) {
        onContentChange(cleanHtml);
      }
      
      const plainText = editorRef.current.innerText || "";
      
      // Strict 60 char limit for triggering
      if (aiEnabled && plainText.length >= 60) {
         typingTimerRef.current = setTimeout(() => {
            triggerAiAutoComplete();
         }, 2500);
      }
    }
  };

  const triggerAiAutoComplete = async () => {
    if (isAiThinkingRef.current || !editorRef.current || !aiEnabled) return;
    
    const textContext = editorRef.current.innerText;
    if (!textContext || textContext.length < 60) return;

    isAiThinkingRef.current = true;
    const suggestion = await callAI(textContext.slice(-500), AIAction.PREDICT);
    isAiThinkingRef.current = false;
    
    // Safety checks
    if (!editorRef.current) return;
    if (editorRef.current.innerText.length !== textContext.length) return; 

    if (suggestion) {
       const sel = window.getSelection();
       if (sel && sel.rangeCount > 0 && sel.anchorNode && editorRef.current.contains(sel.anchorNode)) {
           const range = sel.getRangeAt(0);
           const span = document.createElement('span');
           span.id = 'ai-ghost';
           span.contentEditable = 'false';
           span.innerText = suggestion;
           span.style.color = '#a8a29e';
           span.style.opacity = '0.7';
           span.style.pointerEvents = 'none';
           span.style.transition = 'opacity 0.3s';
           
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
         // Accept Suggestion
         const text = ghost.innerText;
         ghost.remove();
         document.execCommand('insertText', false, text);
         
         rejectionCountRef.current = 0;
         setShowDisableHint(false);
         tapCloseCountRef.current = 0; 
         handleInput();
       } else {
         // If disable hint is shown, Tab can count towards closing it
         if (showDisableHint) {
            handleDisableHintInteraction();
         } else {
            execCmd('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;'); 
         }
       }
    } else if (e.key === 'Enter') {
        if (ghost) {
          ghost.remove();
          rejectionCountRef.current += 1;
          if (rejectionCountRef.current >= 2) setShowDisableHint(true);
        }
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
      const currentImages = currentEntry.images || [];
      onUpdateMeta(currentEntry.id, { images: [...currentImages, publicUrl] });
      handleInput(); 
    }
  };

  const handleDisableHintInteraction = () => {
    tapCloseCountRef.current += 1;
    if (tapCloseCountRef.current >= 3) {
      setAiEnabled(false);
      setShowDisableHint(false);
    }
  };

  const handleAIAction = async (action: AIAction) => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    clearGhostText();

    if (action === AIAction.PREDICT) {
        // ... handled mostly by triggerAiAutoComplete but if triggered manually:
        triggerAiAutoComplete();
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

  return (
    <div className="flex-1 flex flex-col h-full relative bg-[#Fdfbf7] min-w-0">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} className="hidden" />
      
      {/* Disable Hint Toast */}
      {showDisableHint && aiEnabled && (
        <div 
           onClick={handleDisableHintInteraction}
           className="fixed bottom-10 right-10 z-50 bg-stone-800 text-white text-xs px-4 py-3 rounded-lg shadow-lg cursor-pointer animate-in slide-in-from-bottom-5 fade-in duration-500 hover:bg-red-900 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
             <span>🤖 觉得打扰？</span>
             <span className="opacity-70 bg-white/20 px-2 py-0.5 rounded">
                再按 {3 - tapCloseCountRef.current} 次 Tab 或点击此处关闭
             </span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="h-12 border-b border-stone-100 flex items-center justify-between px-2 md:px-4 bg-[#fcfaf5] z-20 shrink-0">
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
            <ToolbarButton onClick={() => handleAIAction(AIAction.REFLECT)} title="Insight"><span className="text-xs">🔮</span></ToolbarButton>
        </div>

        <div className="flex items-center gap-2">
            {saveStatus === 'saving' && <span className="text-[10px] text-stone-400 font-sans tracking-wider animate-pulse">☁️ 同步中...</span>}
            {saveStatus === 'saved' && <span className="text-[10px] text-stone-300 font-sans tracking-wider">☁️ 已同步</span>}
            {saveStatus === 'error' && <span className="text-[10px] text-red-400 font-sans tracking-wider" title="同步失败">☁️ 失败</span>}
            <ToolbarButton onClick={() => onDelete(currentEntry.id)} className="hover:text-red-400 hover:bg-red-50" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg></ToolbarButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative" onClick={() => editorRef.current?.focus()}>
         <div className="max-w-[700px] mx-auto min-h-[90vh] p-8 md:p-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-end justify-between mb-10 select-none group">
                <div className="flex items-end gap-3">
                    <h2 className="text-4xl font-bold text-stone-700 font-serif tracking-tight leading-none">{formatDate(currentEntry.createdAt)}</h2>
                    <span className="text-stone-300 font-sans tracking-[0.2em] text-[10px] uppercase pb-1.5">{getWeekDay(currentEntry.createdAt)}</span>
                </div>
                
                {/* Mood */}
                <div className="relative pb-0.5">
                  <button 
                      onClick={(e) => { e.stopPropagation(); setShowMoodPicker(!showMoodPicker); }}
                      className="w-12 h-12 flex items-center justify-center text-4xl hover:scale-110 transition-transform cursor-pointer"
                  >
                      {currentEntry.userMood || '😶'}
                  </button>
                  {showMoodPicker && (
                    <div className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur border border-stone-100 shadow-xl rounded-xl p-3 flex gap-2 animate-in fade-in zoom-in-95 duration-200 w-max z-50 ring-1 ring-black/5">
                      {MOODS.map(m => (
                        <button key={m} onClick={() => { onUpdateMeta(currentEntry.id, { userMood: m }); setShowMoodPicker(false); }} className="w-10 h-10 flex items-center justify-center hover:bg-stone-50 rounded-lg text-2xl hover:scale-125 transition-transform">{m}</button>
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
              onContextMenu={onContextMenu} 
              onKeyDown={handleKeyDown}
              className="rich-editor text-[17px] text-[#44403c] leading-loose font-serif min-h-[60vh] focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-300/50 empty:before:text-sm empty:before:font-sans selection:bg-[#e7e5e4] selection:text-stone-800"
              data-placeholder="开始书写... (Tab键确认 AI 续写)"
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
      </div>
    </div>
  );
};