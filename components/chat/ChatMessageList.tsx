
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../../types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  senderId: string;
  onReply: (msg: ChatMessage) => void;
  onViewJournal: (content: string, title?: string) => void;
}

// --- 阅后即焚气泡组件 (简化版) ---
const EphemeralBubble: React.FC<{ 
  msg: ChatMessage; 
  isMe: boolean;
}> = ({ msg, isMe }) => {
  // pending: 未读/未进入视口
  // counting: 倒计时中
  // burned: 已销毁
  const [status, setStatus] = useState<'pending' | 'counting' | 'burned'>('pending');
  const [timeLeft, setTimeLeft] = useState(60);
  
  const startTimeRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (status !== 'pending') return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
           startCountdown();
           observer.disconnect();
        }
      });
    }, { 
      threshold: 0.6,
      rootMargin: '0px' 
    });

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [status]);

  const startCountdown = () => {
    setStatus('counting');
    startTimeRef.current = Date.now();
    
    const tick = () => {
      if (!startTimeRef.current) return;
      
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, 60 - elapsed);
      
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setStatus('burned');
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    
    rafRef.current = requestAnimationFrame(tick);
  };

  // 销毁状态：极简灰底白字
  if (status === 'burned') {
    return (
      <div className="px-4 py-3 rounded-xl text-sm bg-[#f0f0f0] text-[#999] italic select-none">
        该消息已销毁
      </div>
    );
  }

  const isCounting = status === 'counting';
  
  return (
    <div ref={elementRef} className="relative max-w-full">
      <div 
        className={`
          relative px-4 py-3 rounded-xl text-sm shadow-sm whitespace-pre-wrap overflow-hidden transition-colors duration-300
          ${isMe 
            ? 'bg-stone-200/20 border border-stone-300/30 text-stone-300 rounded-br-none' 
            : 'bg-[#252526] text-[#c0c0c0] rounded-bl-none border border-[#333]'}
        `}
      > 
        {/* 消息内容 */}
        <div className="leading-relaxed relative z-10">
          {msg.content}
        </div>
        
        {/* === 视觉核心：极简大号倒计时 (右下角) === */}
        {isCounting && (
           <div className="mt-2 text-right flex justify-end items-center gap-1 border-t border-white/5 pt-1">
             <span className="text-[10px] opacity-40">剩余时间</span>
             <span className="text-2xl font-bold font-mono text-red-500/90 tabular-nums leading-none">
               {timeLeft.toFixed(0)}<span className="text-xs font-normal opacity-50 ml-0.5">s</span>
             </span>
           </div>
        )}
      </div>
      
      {/* 状态标记 */}
      {status === 'pending' && (
        <div className="text-[10px] text-stone-500 mt-1 text-right mr-1 flex items-center justify-end gap-1">
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
    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
      {messages.map((msg, index) => {
        const isMe = msg.senderId === senderId;
        
        // --- 系统消息 ---
        if (msg.type === 'system') {
          return (
            <div key={index} className="flex justify-center my-6 opacity-60">
              <span className="text-[10px] text-[#555] border-b border-[#333] pb-0.5 tracking-wider">
                {msg.content}
              </span>
            </div>
          );
        }

        // --- 截图警告 (系统广播) ---
        if (msg.type === 'screenshot-alert') {
          return (
            <div key={index} className="flex justify-center my-6">
              <div className="bg-red-950/20 border border-red-900/40 text-red-400 px-4 py-2 rounded flex items-center gap-3">
                <span className="text-lg">📸</span>
                <div className="flex flex-col">
                   <span className="text-xs font-bold">安全警报</span>
                   <span className="text-[11px] opacity-80">{msg.content}</span>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            {/* 昵称 */}
            {!isMe && (
              <span className="text-[10px] text-[#666] mb-1 ml-1 font-sans">
                {msg.senderName || '匿名用户'}
              </span>
            )}

            <div className={`max-w-[85%] md:max-w-[70%] group relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              
              {/* 回复引用显示 */}
              {msg.replyTo && (
                <div className={`
                  mb-1 text-[10px] p-2 rounded border-l-2 opacity-70 max-w-full truncate
                  ${isMe 
                    ? 'bg-[#2d2d2d] border-transparent border-l-[#666] text-[#888]' 
                    : 'bg-[#252526] border-transparent border-l-[#555] text-[#777]'}
                `}>
                   <span className="font-bold mr-1 text-[#999]">{msg.replyTo.senderName}:</span>
                   {msg.replyTo.contentPreview}
                </div>
              )}

              {/* 消息体 */}
              {msg.type === 'journal-share' ? (
                <div 
                  className={`cursor-pointer p-3 rounded-xl text-sm border shadow-sm transition-transform active:scale-95 ${isMe ? 'bg-[#2d2d2d] border-[#444] text-[#aaa] rounded-tr-none' : 'bg-[#252526] border-[#333] text-[#888] rounded-tl-none'}`}
                  onClick={() => msg.meta?.fullContent && onViewJournal(msg.meta.fullContent, msg.meta.journalTitle)}
                >
                    <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wider opacity-50">
                      <span>📄 加密日记分享</span>
                    </div>
                    <div className="italic opacity-80 mb-2 font-serif line-clamp-3 pl-2 border-l border-[#555]">
                      "{msg.content}"
                    </div>
                    <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                      <span className="text-[10px] text-[#b38676] hover:underline">点击解密阅读</span>
                      <span className="text-[10px] opacity-40">{msg.meta?.journalTitle}</span>
                    </div>
                </div>
              ) : (
                msg.isEphemeral ? (
                   <EphemeralBubble msg={msg} isMe={isMe} />
                ) : (
                  <div 
                    className={`px-4 py-2.5 rounded-xl text-sm shadow-sm whitespace-pre-wrap font-sans leading-relaxed
                      ${isMe 
                        ? 'bg-[#3e3e42] text-[#e5e5e5] rounded-br-none' 
                        : 'bg-[#252526] text-[#b0b0b0] rounded-bl-none border border-[#333]'}
                    `}
                  >
                    {msg.content}
                  </div>
                )
              )}
              
              {/* 操作栏 (回复/时间) */}
              <div className={`flex items-center mt-1 gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                 <span className="text-[9px] text-[#444] px-1 opacity-50">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </span>
                 <button 
                   onClick={() => onReply(msg)}
                   className="opacity-0 group-hover:opacity-100 text-[10px] text-[#555] hover:text-[#999] transition-opacity"
                 >
                   回复
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
