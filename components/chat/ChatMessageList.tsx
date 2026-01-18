
import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../../types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  senderId: string;
  onReply: (msg: ChatMessage) => void;
  onViewJournal: (content: string, title?: string) => void;
}

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
        
        if (msg.type === 'system') {
          return (
            <div key={index} className="flex justify-center my-4">
              <span className="text-[10px] text-[#444] border border-[#333] px-2 py-0.5 rounded bg-[#1a1a1a]">
                {msg.content}
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

              {/* Main Bubble */}
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
                <div 
                  className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${isMe ? 'bg-[#3e3e42] text-[#f0f0f0] rounded-br-none' : 'bg-[#252526] text-[#b0b0b0] rounded-bl-none border border-[#333]'}`}
                >
                  {msg.content}
                </div>
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
