
import React, { useState } from 'react';
import { JournalEntry, ChatMessage } from '../../types';

interface ChatInputProps {
  onSendMessage: (text: string, isEphemeral?: boolean) => void;
  onShareJournal: (entry: JournalEntry, isEphemeral: boolean) => void; // Updated signature
  entries: JournalEntry[];
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onShareJournal, 
  entries, 
  replyingTo,
  onCancelReply
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showJournalSelector, setShowJournalSelector] = useState(false);
  const [isEphemeral, setIsEphemeral] = useState(false);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue, isEphemeral);
      setInputValue('');
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div className="p-4 bg-[#252526] border-t border-[#333] relative">
            
      {/* Reply Preview Banner */}
      {replyingTo && (
        <div className="flex justify-between items-center bg-[#1e1e1e] border border-[#333] border-l-4 border-l-[#b38676] p-2 mb-2 rounded text-xs text-[#888] animate-in slide-in-from-bottom-2">
           <div className="flex flex-col">
              <span className="font-bold text-[#b38676]">回复 {replyingTo.senderName}:</span>
              <span className={`line-clamp-1 opacity-70 ${replyingTo.isEphemeral ? 'italic' : ''}`}>
                {replyingTo.isEphemeral ? '🔥 [阅后即焚消息]' : replyingTo.content}
              </span>
           </div>
           <button onClick={onCancelReply} className="text-[#555] hover:text-[#aaa] px-2">✕</button>
        </div>
      )}

      {/* Journal Selector Modal (Popover) */}
      {showJournalSelector && (
        <div className="absolute bottom-16 left-4 z-50 w-64 bg-[#1e1e1e] border border-[#444] rounded-lg shadow-2xl flex flex-col animate-in slide-in-from-bottom-2 duration-200 max-h-[60vh]">
            <div className="flex items-center justify-between p-3 border-b border-[#333] bg-[#252526] rounded-t-lg">
              <span className="text-xs font-bold text-[#888] uppercase tracking-wider">选择日记分享</span>
              <button onClick={() => setShowJournalSelector(false)} className="text-[#666] hover:text-white">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {entries.length === 0 ? (
                  <div className="text-center py-4 text-[#444] text-xs">暂无日记可分享</div>
              ) : (
                  entries.map(entry => (
                    <div key={entry.id} className="mb-2 p-3 bg-[#252526] rounded border border-[#333] hover:border-[#555] transition-colors group">
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-[#aaa] font-bold">{formatDate(entry.createdAt)}</span>
                          <button 
                            onClick={() => { onShareJournal(entry, isEphemeral); setShowJournalSelector(false); }}
                            className="text-[10px] bg-[#333] hover:bg-[#444] text-[#ccc] px-2 py-0.5 rounded border border-[#444]"
                          >
                            发送{isEphemeral ? ' (即焚)' : ''}
                          </button>
                      </div>
                      <p className="text-[10px] text-[#666] line-clamp-2 leading-relaxed">
                          {entry.content.replace(/<[^>]*>/g, '').slice(0, 50) || "无内容..."}
                      </p>
                    </div>
                  ))
              )}
            </div>
        </div>
      )}

      <div className="flex gap-2 items-center">
        {/* Burn Toggle */}
        <button
           onClick={() => setIsEphemeral(!isEphemeral)}
           className={`h-10 w-10 shrink-0 flex items-center justify-center border rounded transition-all duration-300 relative group
             ${isEphemeral ? 'bg-stone-200/10 border-stone-400/50 text-white' : 'border-[#333] hover:bg-[#333] text-[#555]'}
           `}
           title="阅后即焚 (1分钟)"
        >
           <span className={`${isEphemeral ? 'animate-pulse' : ''}`}>🔥</span>
           {isEphemeral && (
             <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
           )}
        </button>

        <div className="w-[1px] h-6 bg-[#333] mx-1"></div>

        <button 
            onClick={() => setShowJournalSelector(!showJournalSelector)}
            className={`h-10 w-10 shrink-0 flex items-center justify-center border rounded transition-colors ${showJournalSelector ? 'bg-[#333] border-[#555] text-[#eee]' : 'border-[#333] hover:bg-[#333] text-[#555] hover:text-[#888]'}`}
            title="分享日记"
        >
            📄
        </button>
        
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isEphemeral ? "发送阅后即焚消息..." : "发送消息..."}
          className={`flex-1 border rounded px-3 text-sm text-[#ccc] outline-none transition-colors
             ${isEphemeral ? 'bg-[#2a2a2a] border-stone-500/30 focus:border-stone-500' : 'bg-[#1e1e1e] border-[#333] focus:border-[#555]'}
          `}
          autoFocus
        />
        <button 
          onClick={handleSend}
          className={`px-4 h-10 rounded text-xs transition-colors border font-medium tracking-wide
            ${isEphemeral 
              ? 'bg-stone-100 text-stone-900 border-stone-200 hover:bg-white' 
              : 'bg-[#333] hover:bg-[#444] text-[#999] border-[#333]'}
          `}
        >
          {isEphemeral ? '即焚' : '发送'}
        </button>
      </div>
    </div>
  );
};
