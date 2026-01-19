
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
  // pending: 未读/未进入视口
  // counting: 倒计时中
  // burned: 已销毁
  const [status, setStatus] = useState<'pending' | 'counting' | 'burned'>('pending');
  // 倒计时剩余秒数，用于 UI 显示
  const [timeLeft, setTimeLeft] = useState(60);
  
  // 使用 Ref 存储关键时间点，避免闭包问题和重渲染丢失
  const startTimeRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // 一旦组件卸载或状态变为 burned，清理动画帧
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    // 只有在 pending 状态下才监听可见性
    if (status !== 'pending') return;

    // 使用 IntersectionObserver 精准检测“看到”的瞬间
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // 只有当元素进入视口，且状态为 pending 时才开始
        if (entry.isIntersecting) {
           startCountdown();
           observer.disconnect(); // 开始后就不需要再观察了
        }
      });
    }, { 
      threshold: 0.6, // 只有当 60% 的内容进入视口才算“阅读”
      rootMargin: '0px' 
    });

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [status]);

  const startCountdown = () => {
    setStatus('counting');
    // 核心逻辑：记录开始的绝对时间戳
    startTimeRef.current = Date.now();
    
    const tick = () => {
      if (!startTimeRef.current) return;
      
      // 使用 Date.now() 计算流逝时间
      // 即使页面被挂起，Date.now() 依然是准确的系统时间
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, 60 - elapsed);
      
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setStatus('burned');
      } else {
        // 递归调用下一帧
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    
    rafRef.current = requestAnimationFrame(tick);
  };

  // 销毁状态的 UI - 赛博朋克故障风
  if (status === 'burned') {
    return (
      <div className="px-4 py-3 rounded-xl text-xs bg-[#1a1a1a] border border-[#333] text-[#444] italic flex items-center gap-2 select-none animate-in fade-in duration-500 font-mono overflow-hidden relative">
        <span className="text-red-900/40">✖</span> 
        <span className="line-through opacity-40 tracking-widest decoration-red-900/50">DATA_PURGED</span>
        {/* 故障扫描线 */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/5 to-transparent animate-scan pointer-events-none"></div>
      </div>
    );
  }

  const isCounting = status === 'counting';
  
  return (
    <div ref={elementRef} className="relative group/bubble max-w-full transition-all duration-300">
      <div 
        className={`
          relative px-4 py-3 rounded-xl text-sm shadow-sm whitespace-pre-wrap overflow-hidden transition-all duration-300
          ${isMe 
            ? 'bg-red-950/20 text-red-100/90 border border-red-900/40 rounded-br-none' 
            : 'bg-[#202022] text-[#c0c0c0] rounded-bl-none border border-red-900/20'}
          ${isCounting ? 'shadow-[0_0_15px_rgba(220,38,38,0.1)]' : ''}
        `}
      > 
        {/* 背景纹理：增加隐秘感 */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at center, #ff0000 1px, transparent 1px)', backgroundSize: '12px 12px' }}>
        </div>

        {/* 消息内容 */}
        <span className={`relative z-10 font-mono leading-relaxed ${isCounting && !isMe ? 'text-[#e5e5e5]' : ''}`}>
          {msg.content}
        </span>
        
        {/* === 视觉核心：引信进度条 (仅接收方或计数时显示) === */}
        {isCounting && (
           <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent transition-all duration-100 ease-linear opacity-80 z-20"
                style={{ 
                  width: '100%', 
                  transform: `scaleX(${timeLeft / 60})`,
                  transformOrigin: 'left'
                }}
           />
        )}

        {/* === 视觉核心：悬浮倒计时角标 (接收方才显示倒计时具体数字，增加紧迫感) === */}
        {isCounting && (
           <div className="absolute -top-3 -right-1 flex items-center gap-1.5 bg-[#0a0a0a] border border-red-900/60 rounded px-2 py-0.5 shadow-lg z-30 scale-90 animate-in zoom-in duration-300">
             <span className="text-[10px] text-red-500 font-mono font-bold tabular-nums tracking-wider">
               {timeLeft.toFixed(1)}s
             </span>
             {/* 呼吸灯圆点 */}
             <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
             </span>
           </div>
        )}
      </div>
      
      {/* 发送者视角的静态标记 */}
      {isMe && !isCounting && (
        <div className="text-[9px] text-red-800/60 mt-1 text-right mr-1 flex items-center justify-end gap-1 font-mono tracking-tighter">
          <span>BURN_ON_READ</span>
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
        
        // --- System Messages ---
        if (msg.type === 'system') {
          return (
            <div key={index} className="flex justify-center my-6 opacity-60 hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-[#555] font-mono border-b border-[#333] pb-0.5 tracking-wider">
                {msg.content}
              </span>
            </div>
          );
        }

        // --- Screenshot Alerts (系统广播) ---
        if (msg.type === 'screenshot-alert') {
          return (
            <div key={index} className="flex justify-center my-6 animate-pulse">
              <div className="bg-red-950/30 border border-red-900/60 text-red-500 px-4 py-2 rounded flex items-center gap-3 shadow-[0_0_20px_rgba(220,38,38,0.15)]">
                <span className="text-xl">📸</span>
                <div className="flex flex-col">
                   <span className="text-xs font-bold font-mono uppercase tracking-widest">Security Alert</span>
                   <span className="text-[11px] opacity-80">{msg.content}</span>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            {/* Nickname */}
            {!isMe && (
              <span className="text-[10px] text-[#555] mb-1 ml-1 font-mono opacity-60">
                {msg.senderName || 'Unknown Signal'}
              </span>
            )}

            <div className={`max-w-[85%] md:max-w-[70%] group relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              
              {/* Reply/Quote Context Display */}
              {msg.replyTo && (
                <div className={`
                  mb-1 text-[10px] p-2 rounded border-l-2 opacity-70 max-w-full truncate font-mono
                  ${isMe 
                    ? 'bg-[#2d2d2d] border-transparent border-l-[#666] text-[#888]' 
                    : 'bg-[#252526] border-transparent border-l-[#555] text-[#777]'}
                `}>
                   <span className="font-bold mr-1 text-[#999]">{msg.replyTo.senderName}:</span>
                   {msg.replyTo.contentPreview}
                </div>
              )}

              {/* Main Bubble Logic */}
              {msg.type === 'journal-share' ? (
                <div 
                  className={`cursor-pointer p-3 rounded-xl text-sm border shadow-sm transition-transform active:scale-95 ${isMe ? 'bg-[#2d2d2d] border-[#444] text-[#aaa] rounded-tr-none' : 'bg-[#252526] border-[#333] text-[#888] rounded-tl-none'}`}
                  onClick={() => msg.meta?.fullContent && onViewJournal(msg.meta.fullContent, msg.meta.journalTitle)}
                >
                    <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wider opacity-50 font-mono">
                      <span>📄 Encrypted Journal</span>
                    </div>
                    <div className="italic opacity-80 mb-2 font-serif line-clamp-3 pl-2 border-l border-[#555]">
                      "{msg.content}"
                    </div>
                    <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                      <span className="text-[10px] text-[#b38676] hover:underline">Decrypt & Read</span>
                      <span className="text-[10px] opacity-40 font-mono">{msg.meta?.journalTitle}</span>
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
              
              {/* Action Bar (Reply) */}
              <div className={`flex items-center mt-1 gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                 <span className="text-[9px] text-[#444] px-1 font-mono opacity-50">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </span>
                 <button 
                   onClick={() => onReply(msg)}
                   className="opacity-0 group-hover:opacity-100 text-[9px] text-[#555] hover:text-[#999] transition-opacity font-mono"
                 >
                   [QUOTE]
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
