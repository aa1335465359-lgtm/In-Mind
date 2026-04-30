
import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry, AIAction, MemoryResult } from '../../types';
import { callAI, callAIToGenerateMemory } from '../../services/ai';
import { uploadImage } from '../../services/storage';
import { EditorToolbar } from './EditorToolbar';

interface EditorProps {
  currentEntry: JournalEntry;
  onContentChange: (text: string) => void;
  onUpdateAiField: (id: string, field: 'aiSummary' | 'aiMood', value: string) => void;
  onUpdateMemory: (id: string, memory: MemoryResult) => void;
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
  onUpdateMemory,
  onUpdateMeta,
  onContextMenu,
  onDelete,
  onToggleSidebar,
  saveStatus
}) => {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [showDisableHint, setShowDisableHint] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAiThinkingRef = useRef<boolean>(false);
  
  // AI UX State
  const rejectionCountRef = useRef<number>(0);
  const tapCloseCountRef = useRef<number>(0);

  // --- Synchronization ---
  
  useEffect(() => {
    if (editorRef.current) {
      const cleanContent = currentEntry.content.replace(/<span id="ai-ghost".*?>.*?<\/span>/g, '');
      if (editorRef.current.innerHTML !== cleanContent) {
        editorRef.current.innerHTML = cleanContent;
      }
    }
  }, [currentEntry.id]);

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

  const checkAndGenerateMemory = () => {
    if (!editorRef.current) return;
    const plainText = editorRef.current.innerText || "";
    // Trigger memory generation if not already generated and length is decent
    if (plainText.length > 30 && !currentEntry.memoryResult && currentEntry.aiMood !== '正在凝结印记...') {
       onUpdateAiField(currentEntry.id, 'aiMood', '正在凝结印记...');
       callAIToGenerateMemory(plainText).then(memory => {
         if (memory) {
           onUpdateMemory(currentEntry.id, memory);
           onUpdateAiField(currentEntry.id, 'aiMood', ''); // clear status
         } else {
           onUpdateAiField(currentEntry.id, 'aiMood', ''); // failed, clear
         }
       });
    }
  };

  const handleInput = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (memoryTimerRef.current) clearTimeout(memoryTimerRef.current);

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
      
      // AI Ghost text Trigger
      const plainText = editorRef.current.innerText || "";
      if (aiEnabled && plainText.length >= 60) {
         typingTimerRef.current = setTimeout(() => triggerAiAutoComplete(), 2500);
      }
      
      // Memory Generation Debounce (5 seconds after typing stops)
      if (plainText.length > 30 && !currentEntry.memoryResult) {
         memoryTimerRef.current = setTimeout(() => checkAndGenerateMemory(), 5000);
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
    } else if (action === AIAction.REFLECT) {
        // Trigger memory generation manually
        checkAndGenerateMemory();
    }
  };

  // --- Format Helpers ---
  const d = new Date(currentEntry.createdAt);
  const dateFormatted = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

  return (
    <div className="flex-1 flex flex-col h-full relative bg-transparent min-w-0">
      
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
         <div className="max-w-[700px] mx-auto min-h-[90vh] p-8 md:p-16 animate-in fade-in duration-500">
            
            {/* Header */}
            <div className="flex flex-col mb-12 select-none">
                <span className="text-[#958D85]/60 font-sans tracking-[0.2em] text-[11px] mb-2">{dateFormatted}</span>
                <h2 className="text-2xl font-serif text-[#4A443F]/80 tracking-widest">{currentEntry.content.length > 0 ? "随心记录的此刻" : "今天想留下什么？"}</h2>
            </div>

            {/* Rich Text Editor */}
            <div 
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onPaste={handlePaste}
              onContextMenu={onContextMenu} 
              onKeyDown={handleKeyDown}
              className="rich-editor font-serif min-h-[60vh] text-[#4A443F] leading-loose text-[15px]"
              data-placeholder="在这里落笔..."
            />

            {/* Tags Input */}
            <div className="mt-20 mb-32 flex flex-wrap gap-2 transition-opacity duration-500 opacity-40 hover:opacity-100">
                {currentEntry.tags.map((tag: string) => (
                  <span key={tag} className="text-[10px] text-[#958D85] bg-black/5 px-3 py-1 rounded-full tracking-wider">#{tag}</span>
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
                  className="bg-transparent border border-[#4A443F]/10 rounded-full px-3 text-[10px] text-[#958D85] placeholder:text-[#958D85]/50 outline-none focus:border-[#4A443F]/30 transition-all font-sans w-24"
                />
            </div>
         </div>
      </div>
    </div>
  );
};
