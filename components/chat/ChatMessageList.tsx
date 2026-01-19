
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../../types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  senderId: string;
  onReply: (msg: ChatMessage) => void;
  onViewJournal: (content: string, title?: string) => void;
}

// --- Sub-component for Burn Logic ---
const EphemeralBubble: React.FC<{ 
  msg: ChatMessage; 
  isMe: boolean;
}> = ({ msg, isMe }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isBurned, setIsBurned] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If it's my own message, I don't burn it for myself (optional logic, but standard behavior usually shows sender what they sent)
    // However, requirement says "Burn after reading", implies receiver. 
    // Let's burn for everyone to be safe and consistent, or just receiver. 
    // Let's burn for receiver primarily. If isMe, maybe show a static "Ephemeral" icon.
    // BUT requirement: "对方打开窗口...1min后自动消失".
    if (isMe) return;

    if (isBurned) return;

    let interval: ReturnType<typeof setInterval>;

    const checkVisibility = () => {
       // Check if element is in viewport
       if (!elementRef.current) return;
       const rect = elementRef.current.getBoundingClientRect();
       const inViewport = (
         rect.top >= 0 &&
         rect.left >= 0 &&
         rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
         rect.right <= (window.innerWidth || document.documentElement.clientWidth)
       );
       
       // Check if window is active (not blurred) and tab is visible
       const isWindowActive = document.hasFocus() && !document.hidden;

       if (inViewport && isWindowActive) {
          // Start timer if not started
          if (timeLeft === null) {
            setTimeLeft(60); 
          }
       }
    };

    // Initial check
    checkVisibility();

    // Loop check every second to countdown ONLY if focused
    interval = setInterval(() => {
       if (timeLeft !== null) {
         if (timeLeft <= 0) {
           setIsBurned(true);
           clearInterval(interval);
         } else {
           // Only decrease time if window is still focused
           if (document.hasFocus() && !document.hidden) {
              setTimeLeft(prev => (prev !== null ? prev - 1 : 60));
           }
         }
       } else {
         checkVisibility();
       }
    }, 1000);

    // Also listen to visibility change to pause/resume logic conceptually
    const handleVisChange = () => checkVisibility();
    document.addEventListener('visibilitychange', handleVisChange);
    window.addEventListener('focus', handleVisChange);
    window.addEventListener('scroll', handleVisChange, true); // Capture scroll

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisChange);
      window.removeEventListener('focus', handleVisChange);
      window.removeEventListener('scroll', handleVisChange, true);
    };
  }, [isMe, isBurned, timeLeft]);

  if (isBurned) {
    return (
      <div className="px-4 py-2.5 rounded-2xl text-xs bg-[#1a1a1a] border border-[#333] text-[#444] italic flex items-center gap-2 select-none">
        <span>🔥</span> 消息已焚毁
      </div>
    );
  }

  return (
    <div ref={elementRef} className="relative group/bubble">
      <div 
        className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm whitespace-pre-wrap relative overflow-hidden transition-all duration-500
          ${isMe 
            ? 'bg-red-950/30 text-red-100/90 border border-red-900/50 rounded-br-none' 
            : 'bg-[#252526] text-[#b0b0b0] rounded-bl-none border border-red-900/30'}
        `}
      > 
        {/* Flame Icon Background Watermark */}
        <div className="absolute -right-2 -bottom-2 text-6xl opacity-[0.03] pointer-events-none select-none">🔥</div>
        
        <span className="relative z-10">{msg.content}</span>
        
        {/* Countdown Overlay for Receiver */}
        {!isMe && timeLeft !== null && (
           <div className="absolute top-1 right-2 text-[9px] text-red-500 font-mono font-bold animate-pulse">
             {timeLeft}s
           </div>
        )}
      </div>
      {isMe && (
        <div className="text-[9px] text-red-800/60 mt-1 text-right mr-1 flex items-center justify-end gap-1">
          <span>🔥 阅后即焚</span>
        </div>
      )}
    </div>
  );
};

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ 
  messages, 
  senderId, 
  onReply,
  onViewJournal
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {messages.map((msg, index) => {
        const isMe = msg.senderId === senderId;
        
        // --- System Messages ---
        if (msg.type === 'system') {
          return (
            <div key={index} className="flex justify-center my-4">
              <span className="text-[10px] text-[#444] border border-[#333] px-2 py-0.5 rounded bg-[#1a1a1a]">
                {msg.content}
              </span>
            </div>
          );
        }

        // --- Screenshot Alerts ---
        if (msg.type === 'screenshot-alert') {
          return (
            <div key={index} className="flex justify-center my-4 animate-bounce">
              <span className="text-[11px] text-red-500 font-bold border border-red-900/50 bg-red-950/30 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.2)] flex items-center gap-2">
                📸 {msg.content}
              </span>
            </div>
          );
        }

        return (
          <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
            {/* Nickname */}
            {!isMe && (
              <span className="text-[10px] text-[#666] mb-1 ml-1">
                {msg.senderName || 'Anonymous'}
              </span>
            )}

            <div className={`max-w-[85%] md:max-w-[70%] group relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              
              {/* Reply/Quote Context Display */}
              {msg.replyTo && (
                <div className={`
                  mb-1 text-[10px] p-2 rounded border border-l-2 opacity-70 max-w-full truncate
                  ${isMe 
                    ? 'bg-[#2d2d2d] border-[#444] border-l-[#666] text-[#888]' 
                    : 'bg-[#252526] border-[#333] border-l-[#555] text-[#777]'}
                `}>
                   <span className="font-bold mr-1">{msg.replyTo.senderName}:</span>
                   {msg.replyTo.contentPreview}
                </div>
              )}

              {/* Main Bubble Logic */}
              {msg.type === 'journal-share' ? (
                <div 
                  className={`cursor-pointer p-3 rounded-xl text-sm border shadow-sm transition-transform active:scale-95 ${isMe ? 'bg-[#2d2d2d] border-[#444] text-[#aaa] rounded-tr-none' : 'bg-[#252526] border-[#333] text-[#888] rounded-tl-none'}`}
                  onClick={() => msg.meta?.fullContent && onViewJournal(msg.meta.fullContent, msg.meta.journalTitle)}
                >
                    <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wider opacity-50">
                      <span>📄 Shared Journal</span>
                    </div>
                    <div className="italic opacity-80 mb-2 font-serif line-clamp-3">"{msg.content}"</div>
                    <div className="flex justify-between items-center border-t border-white/5 pt-1 mt-1">
                      <span className="text-[10px] text-[#b38676] hover:underline">点击阅读全文</span>
                      <span className="text-[10px] opacity-40">{msg.meta?.journalTitle}</span>
                    </div>
                </div>
              ) : (
                msg.isEphemeral ? (
                   <EphemeralBubble msg={msg} isMe={isMe} />
                ) : (
                  <div 
                    className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${isMe ? 'bg-[#3e3e42] text-[#f0f0f0] rounded-br-none' : 'bg-[#252526] text-[#b0b0b0] rounded-bl-none border border-[#333]'}`}
                  >
                    {msg.content}
                  </div>
                )
              )}
              
              {/* Action Bar (Reply) */}
              <div className={`flex items-center mt-1 gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                 <span className="text-[9px] text-[#444] px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </span>
                 <button 
                   onClick={() => onReply(msg)}
                   className="opacity-0 group-hover:opacity-100 text-[9px] text-[#555] hover:text-[#999] transition-opacity"
                 >
                   引用
                 </button>
              </div>

            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};
