
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../../types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  senderId: string;
  onReply: (msg: ChatMessage) => void;
  onViewJournal: (content: string, title?: string, isEphemeral?: boolean, messageId?: string) => void;
  onExpireMsg?: (msgId: string) => void;
}

// 预设的浅色系气泡背景
const BUBBLE_COLORS = [
  'bg-white text-[#4A443F] shadow-sm',
  'bg-[#FDF3F1] text-[#4A443F]',
  'bg-[#E6F3F0] text-[#4A443F]',
  'bg-[#F2F6F9] text-[#4A443F]',
  'bg-[#F5F2F7] text-[#4A443F]',
];

const getBubbleColor = (senderId: string) => {
  if (!senderId) return BUBBLE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) {
    hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BUBBLE_COLORS.length;
  return BUBBLE_COLORS[index];
};

// --- 通用阅后即焚容器 ---
const EphemeralContainer: React.FC<{ 
  children: React.ReactNode;
  isMe: boolean;
  onBurn?: () => void;
}> = ({ children, isMe, onBurn }) => {
  const [status, setStatus] = useState<'pending' | 'counting' | 'burned'>('pending');
  const [timeLeft, setTimeLeft] = useState(60);
  
  const startTimeRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const hasTriggeredBurnRef = useRef(false);
  
  // 关键修复：使用 Ref 追踪最新的回调函数，解决闭包陷阱
  const onBurnRef = useRef(onBurn);

  // 每次渲染都更新 Ref 指向最新的 onBurn (包含了最新的 viewingJournal 状态)
  useEffect(() => {
    onBurnRef.current = onBurn;
  }, [onBurn]);

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
    }, { threshold: 0.6 });

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
        // 使用 Ref 调用，确保执行的是最新版本的函数
        if (onBurnRef.current && !hasTriggeredBurnRef.current) {
          hasTriggeredBurnRef.current = true;
          onBurnRef.current();
        }
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  if (status === 'burned') {
    return (
      <div className="px-4 py-3 rounded-2xl text-xs bg-white/50 text-[#958D85] italic select-none shadow-sm">
        信件已化为灰烬
      </div>
    );
  }

  return (
    <div ref={elementRef} className="relative max-w-full">
       {/* 渲染实际内容 */}
       {children}

       {/* 倒计时 UI */}
       {status === 'counting' && (
           <div className={`mt-1 text-right flex justify-end items-center gap-1 ${isMe ? 'mr-1' : 'mr-1'}`}>
             <span className="text-[9px] text-red-500/60 opacity-60">销毁倒计时</span>
             <span className="text-xl font-bold font-mono text-red-500/90 tabular-nums leading-none">
               {timeLeft.toFixed(0)}<span className="text-xs font-normal opacity-50 ml-0.5">s</span>
             </span>
           </div>
       )}

       {/* Pending 标记 */}
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
  onViewJournal,
  onExpireMsg
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
      {messages.map((msg, index) => {
        const isMe = msg.senderId === senderId;
        
        // --- 系统消息 & 警报 ---
        if (msg.type === 'system') {
          return (
            <div key={index} className="flex justify-center my-6 opacity-60">
              <span className="text-[10px] text-[#555] border-b border-[#333] pb-0.5 tracking-wider">{msg.content}</span>
            </div>
          );
        }
        if (msg.type === 'screenshot-alert') {
          return (
            <div key={index} className="flex justify-center my-6">
              <div className="bg-red-950/20 border border-red-900/40 text-red-400 px-4 py-2 rounded flex items-center gap-3">
                <span className="text-lg">📸</span>
                <div className="flex flex-col"><span className="text-xs font-bold">安全警报</span><span className="text-[11px] opacity-80">{msg.content}</span></div>
              </div>
            </div>
          );
        }

        const bubbleColorClass = isMe 
          ? 'bg-[#4A443F] text-[#FDF3F1] rounded-br-none shadow-sm' 
          : `${getBubbleColor(msg.senderId)} rounded-bl-none border border-white`;

        // --- 核心内容渲染 ---
        const renderContent = () => {
          if (msg.type === 'journal-share') {
             return (
              <div 
                className={`cursor-pointer p-5 rounded-3xl text-sm border shadow-sm transition-transform active:scale-95 ${isMe ? 'bg-[#F2EDDE] border-[#E8E1CD] text-[#4A443F] rounded-br-none' : 'bg-white border-[#FDF3F1] text-[#4A443F] rounded-bl-none'}`}
                onClick={() => msg.meta?.fullContent && onViewJournal(msg.meta.fullContent, msg.meta.journalTitle, msg.isEphemeral, msg.id)}
              >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] uppercase tracking-widest text-[#958D85]">📄 {msg.isEphemeral ? '加密页 (阅后即焚)' : '落叶分享'}</span>
                  </div>
                  <div className="italic opacity-90 mb-4 font-serif line-clamp-3 leading-relaxed">
                    "{msg.content}"
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-black/5">
                    <span className="text-[10px] text-[#FAAE9D] hover:underline font-bold">解开信封</span>
                    <span className="text-[10px] text-[#958D85]">{msg.meta?.journalTitle}</span>
                  </div>
              </div>
             );
          } else {
             // 普通文本消息
             return (
              <div 
                className={`px-5 py-3 rounded-3xl text-sm whitespace-pre-wrap font-sans leading-relaxed ${bubbleColorClass}`}
              >
                {msg.content}
              </div>
             );
          }
        };

        return (
          <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            {!isMe && (
              <span className="text-[10px] text-[#666] mb-1 ml-1 font-sans">{msg.senderName || '匿名用户'}</span>
            )}

            <div className={`max-w-[85%] md:max-w-[70%] group relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              
              {/* 回复引用 */}
              {msg.replyTo && (
                <div className={`mb-1 text-[10px] p-2 rounded border-l-2 opacity-70 max-w-full truncate ${isMe ? 'bg-[#2d2d2d] border-transparent border-l-[#666] text-[#888]' : 'bg-[#252526] border-transparent border-l-[#555] text-[#777]'} ${msg.replyTo.isEphemeral ? 'italic font-serif opacity-50' : ''}`}>
                   <span className="font-bold mr-1 text-[#999]">{msg.replyTo.senderName}:</span>
                   {msg.replyTo.contentPreview}
                </div>
              )}

              {/* 是否包裹在阅后即焚容器中 */}
              {msg.isEphemeral ? (
                <EphemeralContainer 
                  isMe={isMe} 
                  onBurn={() => onExpireMsg && onExpireMsg(msg.id)}
                >
                  {renderContent()}
                </EphemeralContainer>
              ) : (
                renderContent()
              )}
              
              {/* 操作栏 (非阅后即焚模式下显示时间，任何模式都可回复) */}
              <div className={`flex items-center mt-1 gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                 {!msg.isEphemeral && (
                    <span className="text-[9px] text-[#444] px-1 opacity-50">
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                 )}
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
