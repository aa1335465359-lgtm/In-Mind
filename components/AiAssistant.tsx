
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Loader2, Image as ImageIcon, X, History, Plus, Trash2, Clock, 
  Heart, Box, Terminal, Trees, Gift, Feather, Zap
} from 'lucide-react';
import { chatWithBuyerAI } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message { role: 'user' | 'model'; text: string; images?: string[]; }
interface ChatSession { id: string; title: string; timestamp: number; messages: Message[]; }

interface AiAssistantProps {
  theme: string;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ theme }) => {
  const [messages, setMessages] = useState<Message[]>([{ role: 'model', text: '你好呀！我是小番茄。选品、定向、怼商家，今天咱先整哪个？' }]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedSessions = localStorage.getItem('temu_chat_sessions');
    if (savedSessions) setSessions(JSON.parse(savedSessions));
  }, []);
  
  useEffect(() => { 
      if (sessions.length > 0 || localStorage.getItem('temu_chat_sessions')) {
          localStorage.setItem('temu_chat_sessions', JSON.stringify(sessions)); 
      }
  }, [sessions]);
  
  useEffect(() => { 
    if (scrollContainerRef.current) {
        requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            }
        });
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
      if (textareaRef.current) {
          // Reset height to allow shrinking
          textareaRef.current.style.height = 'auto';
          // Set new height based on content, maxing out at reasonable height
          const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
          textareaRef.current.style.height = `${newHeight}px`;
      }
  }, [input]);

  // --- THEME AVATAR HELPERS ---
  const getBotAvatar = () => {
    switch (theme) {
      case 'minecraft':
        return {
          icon: <Box size={18} strokeWidth={2.5} />,
          bgClass: 'bg-[#5a8e3d]', // Grass Green
          textClass: 'text-white'
        };
      case 'kawaii':
        return {
          icon: <Heart size={18} fill="currentColor" />,
          bgClass: 'bg-[#ff9eb5]', // Pink
          textClass: 'text-white'
        };
      case 'sewer':
        return {
          icon: <Terminal size={18} />,
          bgClass: 'bg-black border border-[#39ff14]',
          textClass: 'text-[#39ff14]'
        };
      case 'wooden':
        return {
          icon: <Trees size={18} />,
          bgClass: 'bg-[#8b5a2b]',
          textClass: 'text-[#deb887]'
        };
      case 'christmas':
      case 'reindeer':
        return {
          icon: <Gift size={18} />,
          bgClass: 'bg-[#B22D2D]',
          textClass: 'text-[#E8C887]'
        };
      case 'oil-slick':
        return {
          icon: <Feather size={18} />,
          bgClass: 'bg-[#FF7B89]',
          textClass: 'text-[#F4F0FF]'
        };
      case 'neon-billboard':
        return {
          icon: <Terminal size={18} />,
          bgClass: 'bg-[#FF3EA6]',
          textClass: 'text-[#FFDF4A]'
        };
      case 'deepNebula':
        return {
          icon: <Zap size={18} />,
          bgClass: 'bg-[#4DA6FF]',
          textClass: 'text-[#050513]'
        };
      default:
        return {
          icon: <Bot size={18} />,
          bgClass: 'bg-[#FF7F7F]',
          textClass: 'text-white'
        };
    }
  };

  const botStyle = getBotAvatar();

  // --- HANDLERS ---
  const startNewChat = () => {
    setMessages([{ role: 'model', text: '你好呀！我是小番茄。选品、定向、怼商家，今天咱先整哪个？' }]);
    setCurrentSessionId(null);
    setInput('');
    setImagePreviews([]); 
    setSelectedImages([]);
    // Close history on mobile when starting new chat
    if (window.innerWidth < 768) setShowHistory(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);
      if (currentSessionId === id) {
          startNewChat();
      }
  };

  const handleSelectSession = (session: ChatSession) => {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      setShowHistory(false); // Auto close sidebar on selection
  };

  const handleImageSelect = (file: File) => {
      setSelectedImages(prev => [...prev, file]);
      const reader = new FileReader();
      reader.onload = (ev) => {
          if (ev.target?.result) {
              setImagePreviews(prev => [...prev, ev.target!.result as string]);
          }
      };
      reader.readAsDataURL(file);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          handleImageSelect(e.target.files[0]);
      }
  };

  // Paste & Drop Handlers
  const handlePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
              e.preventDefault();
              const blob = items[i].getAsFile();
              if (blob) handleImageSelect(blob);
          }
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
              handleImageSelect(file);
          }
      }
  };

  const clearImage = (index: number) => {
      setSelectedImages(prev => prev.filter((_, i) => i !== index));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedImages.length === 0) || isLoading) return;
    const currentText = input;
    const currentImages = [...selectedImages];
    const currentPreviews = [...imagePreviews];

    const newUserMsg: Message = { 
        role: 'user', 
        text: currentText,
        images: currentPreviews.length > 0 ? currentPreviews : undefined 
    };
    
    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    
    setInput('');
    setSelectedImages([]);
    setImagePreviews([]);
    setIsLoading(true);

    try {
        const apiHistory = newMessages.map(m => ({
            role: m.role,
            parts: [
                ...(m.text ? [{ text: m.text }] : []),
                ...(m.images ? m.images.map(img => ({ inline_data: { mime_type: 'image/jpeg', data: img.split(',')[1] } })) : [])
            ]
        }));
        
        const responseText = await chatWithBuyerAI(apiHistory, currentText, currentImages);
        
        const assistantMsg: Message = { role: 'model', text: responseText };
        const finalMessages = [...newMessages, assistantMsg];
        setMessages(finalMessages);

        // Update Sessions
        const sessionId = currentSessionId || Date.now().toString();
        const newSession: ChatSession = {
            id: sessionId,
            title: currentText.slice(0, 20) || '新对话',
            timestamp: Date.now(),
            messages: finalMessages
        };

        setSessions(prev => {
            const exists = prev.find(s => s.id === sessionId);
            if (exists) {
                return prev.map(s => s.id === sessionId ? newSession : s);
            } else {
                return [newSession, ...prev];
            }
        });
        
        if (!currentSessionId) setCurrentSessionId(sessionId);

    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'model', text: '抱歉，网络开小差了，请重试一下。' }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-transparent text-theme-text overflow-hidden relative font-sans">
      
      {/* Main Chat Area */}
      <div 
        className="flex-1 flex flex-col min-w-0 relative z-10 transition-all duration-300"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
         {/* Clean Header - justify-between ensures Title is left, Actions are right */}
         <div className="h-16 px-6 flex items-center justify-between shrink-0 z-20">
             <div className="flex items-center gap-3">
                 <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${botStyle.bgClass} ${botStyle.textClass}`}>
                     {botStyle.icon}
                 </div>
                 <div className="flex flex-col">
                     <h2 className="font-bold text-theme-text text-sm">小番茄</h2>
                     <span className="text-[10px] text-theme-subtext font-medium flex items-center gap-1.5 opacity-80">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.5)]"></span>
                        24小时在线 • 懂选品
                     </span>
                 </div>
             </div>
             
             <div className="flex items-center gap-4">
                 <button onClick={startNewChat} className="flex items-center gap-1.5 text-xs font-medium text-theme-subtext hover:text-theme-text transition-colors">
                     <Plus size={14} /> 新对话
                 </button>
                 <button 
                    onClick={() => setShowHistory(!showHistory)} 
                    className={`text-theme-subtext hover:text-theme-text transition-colors ${showHistory ? 'text-theme-accent' : ''}`}
                    title={showHistory ? "收起历史" : "历史记录"}
                 >
                     <Clock size={18} />
                 </button>
             </div>
         </div>

         {/* Messages */}
         <div className="flex-1 overflow-y-auto p-4 md:px-8 scroll-smooth bg-transparent" ref={scrollContainerRef}>
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 mb-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm border border-theme-border ${
                        msg.role === 'model' 
                            ? `${botStyle.bgClass} ${botStyle.textClass}` 
                            : 'bg-theme-text text-theme-panel' // User avatar inverted
                    }`}>
                        {msg.role === 'model' ? React.cloneElement(botStyle.icon as React.ReactElement<any>, { size: 18 }) : <User size={18} />}
                    </div>
                    
                    {/* Bubble */}
                    <div className={`max-w-[80%] md:max-w-[70%] space-y-2`}>
                        {msg.images && msg.images.map((img, i) => (
                            <img key={i} src={img} alt="uploaded" className="max-w-[200px] rounded-lg border border-theme-border shadow-sm" />
                        ))}
                        {msg.text && (
                            <div className={`px-5 py-3.5 text-[14px] leading-relaxed shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-theme-text text-theme-panel rounded-2xl rounded-tr-sm font-medium' // User Bubble: High contrast (Inverted theme)
                                : 'bg-theme-card border border-theme-border text-theme-text rounded-2xl rounded-tl-sm' // Bot Bubble: Theme card
                            }`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                                    h1: ({node, ...props}) => <h1 className="text-base font-bold mb-2 mt-2" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-sm font-bold mb-2 mt-2" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 mt-1" {...props} />,
                                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-theme-border pl-3 text-theme-subtext italic my-2 opacity-80" {...props} />,
                                    a: ({node, ...props}) => <a className="underline decoration-theme-accent hover:text-theme-accent transition-colors" target="_blank" {...props} />,
                                    table: ({node, ...props}) => <div className="overflow-x-auto my-3 border border-theme-border rounded-lg"><table className="min-w-full text-left text-xs" {...props} /></div>,
                                    th: ({node, ...props}) => <th className="bg-theme-input px-3 py-2 font-semibold border-b border-theme-border" {...props} />,
                                    td: ({node, ...props}) => <td className="px-3 py-2 border-b border-theme-border" {...props} />,
                                    code: ({className, children, ...props}: any) => {
                                        const match = /language-(\w+)/.exec(className || '')
                                        const isBlock = !!match;
                                        return !isBlock ? (
                                            <code className="bg-theme-input text-theme-accent px-1.5 py-0.5 rounded text-[13px] font-mono mx-0.5 border border-theme-border" {...props}>{children}</code>
                                        ) : (
                                            <div className="relative group my-3 rounded-lg overflow-hidden border border-theme-border">
                                               <div className="bg-black/80 text-gray-400 text-[10px] px-3 py-1 flex justify-between">
                                                  <span>{match[1]}</span>
                                               </div>
                                               <div className="bg-[#1e1e1e] text-gray-200 p-3 text-xs font-mono overflow-x-auto">
                                                  {children}
                                               </div>
                                            </div>
                                        )
                                    }
                                }}>
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex gap-3 mb-6">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${botStyle.bgClass} ${botStyle.textClass}`}>
                        {React.cloneElement(botStyle.icon as React.ReactElement<any>, { size: 18 })}
                    </div>
                    <div className="bg-theme-card border border-theme-border px-5 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-theme-subtext text-xs backdrop-blur-sm">
                        <Loader2 size={14} className="animate-spin text-theme-accent" />
                        <span className="animate-pulse">小番茄正在思考...</span>
                    </div>
                </div>
            )}
         </div>

         {/* Input Area (Floating) */}
         <div className="p-6 md:px-12 bg-transparent shrink-0">
             <div className={`w-full border border-theme-border rounded-2xl transition-all shadow-sm flex flex-col overflow-hidden ${imagePreviews.length > 0 ? 'bg-theme-input' : 'bg-theme-card'} focus-within:ring-1 focus-within:ring-theme-border`}>
                 {/* Image Preview Strip */}
                 {imagePreviews.length > 0 && (
                     <div className="px-3 pt-3 flex gap-2 overflow-x-auto pb-2 border-b border-theme-border/50">
                         {imagePreviews.map((src, i) => (
                             <div key={i} className="relative group w-14 h-14 shrink-0">
                                 <img src={src} className="w-full h-full object-cover rounded-md border border-theme-border shadow-sm" />
                                 <button onClick={() => clearImage(i)} className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"><X size={10} /></button>
                             </div>
                         ))}
                     </div>
                 )}
                 
                 <div className="flex items-center gap-2 p-2 pl-3">
                     <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="p-2 text-theme-subtext hover:bg-theme-input hover:text-theme-text rounded-xl transition-colors shrink-0"
                        title="上传图片"
                     >
                         <ImageIcon size={22} />
                     </button>
                     <input type="file" ref={fileInputRef} onChange={onFileInputChange} className="hidden" accept="image/*" multiple />
                     
                     <textarea 
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        onPaste={handlePaste}
                        placeholder="想问点什么？"
                        className="flex-1 bg-transparent border-none outline-none py-3 text-[15px] resize-none text-theme-text placeholder:text-theme-subtext/50 leading-normal"
                        rows={1}
                        style={{ minHeight: '48px', height: '48px' }}
                     />
                     <button 
                        onClick={handleSend}
                        disabled={!input.trim() && selectedImages.length === 0}
                        className={`p-2 rounded-xl shrink-0 transition-all ${
                            input.trim() || selectedImages.length > 0 
                            ? 'text-theme-accent hover:bg-theme-accent-bg active:scale-95' 
                            : 'text-theme-subtext cursor-not-allowed opacity-30'
                        }`}
                     >
                         <Send size={22} />
                     </button>
                 </div>
             </div>
             <p className="text-center text-[10px] text-theme-subtext mt-3 opacity-60">内容由 AI 生成，请核实后使用。</p>
         </div>
      </div>

      {/* Right Sidebar: History (Toggled) */}
      {/* Changed to Collapsible Push Sidebar on Desktop */}
      <div 
          className={`
            bg-theme-sidebar border-l border-theme-border shadow-xl z-30 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0
            absolute top-0 right-0 h-full
            md:relative md:shadow-none
            ${showHistory ? 'translate-x-0 w-72' : 'translate-x-full w-72 md:translate-x-0 md:w-0 md:border-l-0'}
          `}
      >
         {/* Inner Container to hold content at fixed width prevents text wrapping during transition */}
         <div className="w-72 h-full flex flex-col overflow-hidden">
             <div className="h-16 border-b border-theme-border flex items-center justify-between px-5 shrink-0 bg-theme-input/20">
                 <h3 className="font-semibold text-sm text-theme-text flex items-center gap-2">
                     <History size={16} className="text-theme-subtext" /> 历史记录
                 </h3>
                 <button onClick={() => setShowHistory(false)} className="p-1.5 text-theme-subtext hover:text-theme-text hover:bg-theme-input rounded-md"><X size={16} /></button>
             </div>
             <div className="flex-1 overflow-y-auto p-3 space-y-1">
                 {sessions.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-48 text-theme-subtext text-xs gap-2 opacity-60">
                         <Clock size={32} className="opacity-50" />
                         <p>暂无历史记录</p>
                     </div>
                 ) : (
                     sessions.map(session => (
                         <div key={session.id} onClick={() => handleSelectSession(session)} className={`group relative p-3 rounded-lg cursor-pointer transition-all border border-transparent ${currentSessionId === session.id ? 'bg-theme-accent-bg border-theme-accent/20' : 'hover:bg-theme-input hover:border-theme-border'}`}>
                             <div className={`text-sm font-medium truncate pr-6 ${currentSessionId === session.id ? 'text-theme-accent' : 'text-theme-text'}`}>{session.title}</div>
                             <div className="text-[10px] text-theme-subtext mt-1.5 flex items-center gap-1 opacity-70">
                                 <Clock size={10} /> {new Date(session.timestamp).toLocaleDateString()}
                             </div>
                             <button onClick={(e) => handleDeleteSession(e, session.id)} className="absolute right-2 top-3 p-1.5 text-theme-subtext opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-theme-card rounded shadow-sm transition-all">
                                 <Trash2 size={12} />
                             </button>
                         </div>
                     ))
                 )}
             </div>
         </div>
      </div>

      {/* Overlay for mobile when history is open */}
      {showHistory && (
          <div className="absolute inset-0 bg-black/5 z-20 md:hidden" onClick={() => setShowHistory(false)}></div>
      )}
    </div>
  );
};

export default AiAssistant;
