import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry, AIAction } from '../types';
import { callAI } from '../services/ai';

interface JournalUIProps {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  onContentChange: (text: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onUpdateAiField: (id: string, field: 'aiSummary' | 'aiMood', value: string) => void;
  onUpdateMeta: (id: string, meta: { tags?: string[], userMood?: string }) => void;
  onLock: () => void;
}

const MOODS = ['🌞', '☁️', '🌧️', '🌪️', '🌱', '☕', '🍷', '🧘', '💡'];

export const JournalUI: React.FC<JournalUIProps> = ({
  entries,
  currentEntry,
  onContentChange,
  onSelect,
  onCreate,
  onDelete,
  onUpdateAiField,
  onUpdateMeta,
  onLock
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestion, setSuggestion] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [currentEntry?.content]);

  // AI Actions
  const handleAIAction = async (action: AIAction) => {
    if (!currentEntry) return;
    setAnalyzing(true);
    
    // Clear suggestion when manually triggering other AI actions
    setSuggestion('');
    
    const result = await callAI(currentEntry.content, action);
    
    if (action === AIAction.SUMMARIZE) {
      onUpdateAiField(currentEntry.id, 'aiSummary', result);
    } else if (action === AIAction.REFLECT) {
      onUpdateAiField(currentEntry.id, 'aiMood', result);
    } else if (action === AIAction.POETRY) {
      onContentChange(currentEntry.content + `\n\n${result}`);
    }
    setAnalyzing(false);
  };

  // Prediction Logic
  const handleContentInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onContentChange(text);
    setSuggestion(''); // Clear suggestion on typing

    // Clear previous timer
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Only predict if text is long enough and user stops typing
    if (text.length > 5) {
      debounceRef.current = setTimeout(async () => {
         // Send last 100 chars for context
         const lastChars = text.slice(-100); 
         const pred = await callAI(lastChars, AIAction.PREDICT);
         if (pred) setSuggestion(pred);
      }, 1000); // 1s pause triggers prediction
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab to accept suggestion
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      onContentChange(currentEntry!.content + suggestion);
      setSuggestion('');
    }
  };

  const filteredEntries = entries.filter(e => 
    e.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentEntry) {
      const val = e.currentTarget.value.trim();
      if (val && !currentEntry.tags.includes(val)) {
        onUpdateMeta(currentEntry.id, { tags: [...currentEntry.tags, val] });
        e.currentTarget.value = '';
      }
    }
  };

  const removeTag = (tag: string) => {
    if (currentEntry) {
       onUpdateMeta(currentEntry.id, { tags: currentEntry.tags.filter(t => t !== tag) });
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
    <div className="w-full h-screen bg-[#FDFBF7] text-[#2D2A2E] font-serif flex overflow-hidden">
      
      {/* Sidebar */}
      <div className={`
        ${isSidebarOpen ? 'w-full md:w-80 translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0'} 
        bg-[#F5F2EB] h-full flex flex-col border-r border-[#E5E0D8] transition-all duration-500 ease-in-out absolute z-20 md:relative shadow-2xl md:shadow-none
      `}>
        <div className="p-6 pt-8 pb-4">
          <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-stone-800 rounded-full"></div>
                <h1 className="text-xl font-bold tracking-widest text-stone-800 font-serif">隐念</h1>
             </div>
             <button onClick={onCreate} className="w-8 h-8 flex items-center justify-center bg-white border border-[#E5E0D8] rounded-full hover:bg-stone-50 transition-colors shadow-sm text-stone-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             </button>
          </div>
          
          <div className="relative">
             <input 
               type="text" 
               placeholder="搜索..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-white border border-[#E5E0D8] rounded-lg py-2 px-4 pl-9 text-sm font-sans outline-none focus:border-stone-400 transition-colors placeholder:text-stone-400"
             />
             <svg className="absolute left-3 top-2.5 text-stone-400" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
          {filteredEntries.map(entry => (
            <div 
              key={entry.id}
              onClick={() => {
                onSelect(entry.id);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={`
                group p-4 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden
                ${currentEntry?.id === entry.id 
                  ? 'bg-white shadow-md border border-[#EAE6DE]' 
                  : 'hover:bg-[#EAE6DE]/50 border border-transparent'}
              `}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-baseline gap-2">
                   <span className="font-bold text-stone-800 text-lg font-sans">{formatDate(entry.createdAt)}</span>
                   <span className="text-xs text-stone-400 font-sans uppercase">{getWeekDay(entry.createdAt)}</span>
                </div>
                {entry.userMood && <span className="text-sm opacity-80">{entry.userMood}</span>}
              </div>
              <p className="text-sm text-stone-500 truncate font-sans leading-relaxed pr-4 opacity-90">
                {entry.content || "写点什么..."}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full bg-[#FDFBF7] relative">
        
        {/* Top Navigation */}
        <div className="h-16 flex items-center justify-between px-6 md:px-12 z-10 border-b border-transparent hover:border-[#F0EBE0] transition-colors">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="text-stone-400 hover:text-stone-800 transition-colors p-2 -ml-2 rounded-lg hover:bg-[#F5F2EB]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            </button>
            <span className="text-xs text-stone-300 font-sans hidden sm:block">按 ESC 紧急跳转</span>
          </div>

          <div className="flex items-center gap-2">
             {currentEntry && (
               <>
                 <button 
                   onClick={() => handleAIAction(AIAction.REFLECT)}
                   disabled={analyzing}
                   className="px-3 py-1.5 rounded-full text-stone-500 hover:text-stone-800 hover:bg-[#F5F2EB] transition-all disabled:opacity-50 flex items-center gap-1 text-xs font-sans border border-transparent hover:border-stone-200"
                   title="分析当前心情"
                 >
                   <span>🔮</span>
                   <span className="hidden sm:inline">心情分析</span>
                 </button>
                 <div className="w-[1px] h-4 bg-stone-200 mx-1"></div>
                 <button 
                   onClick={() => handleAIAction(AIAction.SUMMARIZE)}
                   disabled={analyzing}
                   className="p-2 rounded-full text-stone-400 hover:text-stone-800 hover:bg-[#F5F2EB] transition-all disabled:opacity-50"
                   title="AI 总结"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                 </button>
                 <button 
                  onClick={() => onDelete(currentEntry.id)}
                  className="p-2 text-stone-300 hover:text-red-400 transition-colors hover:bg-red-50 rounded-full"
                  title="删除"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
               </>
             )}
             <button 
               onClick={onLock} 
               className="ml-4 p-2 bg-stone-800 text-white rounded-full hover:bg-stone-600 transition-shadow shadow-lg hover:shadow-xl"
               title="锁定"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
             </button>
          </div>
        </div>

        {/* Editor Area */}
        {currentEntry ? (
          <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-20 scroll-smooth custom-scrollbar">
            <div className="max-w-3xl mx-auto mt-8 md:mt-12 animate-in fade-in duration-500 slide-in-from-bottom-4">
              
              {/* Header: Date & Mood */}
              <div className="flex flex-col mb-6 select-none border-b border-stone-100 pb-6">
                 <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-4xl md:text-5xl font-bold text-stone-800 mb-2 font-serif tracking-tight">{formatDate(currentEntry.createdAt)}</h2>
                        <span className="text-stone-400 font-sans tracking-widest text-xs uppercase">{getWeekDay(currentEntry.createdAt)} &middot; {new Date(currentEntry.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    
                    {/* Mood Picker */}
                    <div className="relative group">
                       <button className="text-3xl hover:scale-110 transition-transform cursor-pointer opacity-80 hover:opacity-100">
                          {currentEntry.userMood || '😶'}
                       </button>
                       <div className="absolute right-0 top-full mt-2 bg-white shadow-xl rounded-xl p-2 flex gap-1 border border-stone-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50 w-max">
                          {MOODS.map(m => (
                             <button 
                                key={m}
                                onClick={() => onUpdateMeta(currentEntry.id, { userMood: m })}
                                className="w-8 h-8 flex items-center justify-center hover:bg-stone-50 rounded text-xl"
                             >
                               {m}
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>

                 {/* Tags Input */}
                 <div className="flex flex-wrap gap-2 mt-4 items-center">
                    {currentEntry.tags.map(tag => (
                      <span key={tag} className="bg-stone-100 text-stone-500 px-2 py-1 rounded text-xs font-sans flex items-center gap-1 group">
                         #{tag}
                         <button onClick={() => removeTag(tag)} className="hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                      </span>
                    ))}
                    <input 
                      type="text" 
                      placeholder="+ 标签 (Enter)"
                      onKeyDown={handleTagInput}
                      className="bg-transparent border-none outline-none text-xs text-stone-400 placeholder:text-stone-200 font-sans min-w-[80px]"
                    />
                 </div>
              </div>

              {/* AI Insight Card (Summary) */}
              {currentEntry.aiSummary && (
                <div className="mb-8 p-6 bg-gradient-to-br from-white to-[#F5F2EB] rounded-xl border border-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
                   <div className="flex items-start gap-3">
                      <span className="text-xl">✨</span>
                      <div>
                        <div className="text-stone-600 italic text-sm leading-7 font-serif">
                          "{currentEntry.aiSummary}"
                        </div>
                      </div>
                   </div>
                </div>
              )}
              
              {/* AI Mood Analysis Result */}
              {currentEntry.aiMood && (
                <div className="mb-8 p-5 bg-stone-50/50 rounded-lg border-l-2 border-purple-200 flex items-start gap-3 animate-in fade-in">
                   <span className="text-lg">🔮</span>
                   <div className="text-stone-600 text-sm leading-6 font-sans">
                      <span className="font-bold text-stone-700 block mb-1 text-xs uppercase tracking-wider">情绪洞察</span>
                      {currentEntry.aiMood}
                   </div>
                </div>
              )}

              {/* Main Textarea Container with Ghost Text */}
              <div className="relative font-serif">
                {/* 1. The Backdrop (Ghost Text) */}
                <div 
                   className="absolute top-0 left-0 w-full h-full text-lg md:text-xl leading-loose whitespace-pre-wrap break-words pointer-events-none"
                   style={{ 
                     fontFamily: 'inherit',
                     // Must match textarea padding/borders exactly
                     padding: '0px', 
                   }}
                   aria-hidden="true"
                >
                   {/* Render invisible existing content to push the suggestion to the right place */}
                   <span className="text-transparent opacity-0">{currentEntry.content}</span>
                   {/* Render the suggestion */}
                   <span className="text-stone-300 opacity-60 transition-opacity duration-300">{suggestion}</span>
                </div>

                {/* 2. The Interactive Textarea */}
                <textarea
                  ref={textareaRef}
                  value={currentEntry.content}
                  onChange={handleContentInput}
                  onKeyDown={handleKeyDown}
                  placeholder="记录此刻的所思所想..."
                  className="w-full bg-transparent resize-none outline-none text-stone-800 text-lg md:text-xl leading-loose min-h-[50vh] placeholder:text-stone-200/50 selection:bg-stone-200 selection:text-stone-800 relative z-10"
                  spellCheck={false}
                  style={{ padding: '0px' }} // Normalize padding
                />
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-300 select-none">
             <div className="mb-6 opacity-20 text-6xl">📓</div>
             <p className="font-serif text-lg tracking-widest opacity-50">隐 念</p>
             <p className="text-xs font-sans mt-2 opacity-40">Hidden Thoughts</p>
             <button onClick={onCreate} className="mt-8 px-6 py-2 border border-stone-200 rounded-full hover:bg-white hover:shadow-lg transition-all text-sm">
                开启新篇章
             </button>
          </div>
        )}
      </div>
    </div>
  );
};
