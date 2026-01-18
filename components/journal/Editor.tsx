
import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry, AIAction } from '../../types';
import { callAI } from '../../services/ai';
import { uploadImage } from '../../services/storage';
import { EditorToolbar } from './EditorToolbar';
import { MoodPicker } from './MoodPicker';

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
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAiThinkingRef = useRef<boolean>(false);
  
  // AI UX State
  const rejectionCountRef = useRef<number>(0);
  const tapCloseCountRef = useRef<number>(0);

  // --- Synchronization ---
  
  // Sync HTML content when entry changes externally
  useEffect(() => {
    if (editorRef.current) {
      const cleanContent = currentEntry.content.replace(/<span id="ai-ghost".*?>.*?<\/span>/g, '');
      if (editorRef.current.innerHTML !== cleanContent) {
        editorRef.current.innerHTML = cleanContent;
      }
    }
  }, [currentEntry.id]);

  // Global Click handler to close popovers
  useEffect(() => {
    const handleClick = () => setShowMoodPicker(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // --- Editing Logic ---

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
       if (rejectionCountRef.current >= 2) setShowDisableHint(true);
    }

    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const cleanHtml = html.replace(/<span id="ai-ghost".*?>.*?<\/span>/g, '');
      
      if (cleanHtml !== currentEntry.content) {
        onContentChange(cleanHtml);
      }
      
      // AI Trigger
      const plainText = editorRef.current.innerText || "";
      if (aiEnabled && plainText.length >= 60) {
         typingTimerRef.current = setTimeout(() => triggerAiAutoComplete(), 2500);
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
    
    if (!editorRef.current || editorRef.current.innerText.length !== textContext.length) return; 

    if (suggestion) {
       insertGhostText(suggestion);
    }
  };

  const insertGhostText = (text: string) => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && sel.anchorNode && editorRef.current.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const span = document.createElement('span');
        span.id = 'ai-ghost';
        span.contentEditable = 'false';
        span.innerText = text;
        span.className = "text-stone-400 opacity-70 pointer-events-none transition-opacity duration-300";
        range.insertNode(span);
        range.collapse(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const ghost = editorRef.current?.querySelector('#ai-ghost') as HTMLElement;

    if (e.key === 'Tab') {
       e.preventDefault();
       if (ghost) {
         // Accept
         const text = ghost.innerText;
         ghost.remove();
         document.execCommand('insertText', false, text);
         rejectionCountRef.current = 0;
         setShowDisableHint(false);
         tapCloseCountRef.current = 0; 
         handleInput();
       } else {
         if (showDisableHint) handleDisableHintInteraction();
         else execCmd('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;'); 
       }
    } else if (e.key === 'Enter') {
        if (ghost) {
          ghost.remove();
          rejectionCountRef.current += 1;
          if (rejectionCountRef.current >= 2) setShowDisableHint(true);
        }
    } else {
        // Typing anything else removes ghost
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

  // --- Format Helpers ---
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
      
      {/* Disable AI Hint Toast */}
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
      <EditorToolbar 
        onToggleSidebar={onToggleSidebar}
        execCmd={execCmd}
        onImageUpload={processFiles}
        onAIAction={handleAIAction}
        onDelete={() => onDelete(currentEntry.id)}
        saveStatus={saveStatus}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative" onClick={() => editorRef.current?.focus()}>
         <div className="max-w-[700px] mx-auto min-h-[90vh] p-8 md:p-12 animate-in fade-in duration-500">
            
            {/* Header & Mood */}
            <div className="flex items-end justify-between mb-10 select-none group">
                <div className="flex items-end gap-3">
                    <h2 className="text-4xl font-bold text-stone-700 font-serif tracking-tight leading-none">{formatDate(currentEntry.createdAt)}</h2>
                    <span className="text-stone-300 font-sans tracking-[0.2em] text-[10px] uppercase pb-1.5">{getWeekDay(currentEntry.createdAt)}</span>
                </div>
                
                <MoodPicker 
                   currentEntry={currentEntry}
                   onUpdateMeta={onUpdateMeta}
                   isOpen={showMoodPicker}
                   onClose={() => setShowMoodPicker(false)}
                   onToggle={(e) => { e.stopPropagation(); setShowMoodPicker(!showMoodPicker); }}
                />
            </div>

            {/* AI Insight Display */}
            {(currentEntry.aiSummary || currentEntry.aiMood) && (
              <div className="mb-10 pl-3 border-l-2 border-stone-200/60 text-stone-400 text-xs font-serif leading-relaxed select-none hover:text-stone-500 transition-colors cursor-default">
                  {currentEntry.aiMood && <p className="mb-1">{currentEntry.aiMood}</p>}
              </div>
            )}

            {/* Rich Text Editor */}
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

            {/* Tags Input */}
            <div className="mt-16 flex flex-wrap gap-2 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-500">
                {currentEntry.tags.map((tag: string) => (
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
