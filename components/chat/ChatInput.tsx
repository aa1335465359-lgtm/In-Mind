
import React, { useState } from 'react';
import { JournalEntry, ChatMessage } from '../../types';

interface ChatInputProps {
  onSendMessage: (text: string, isEphemeral?: boolean) => void;
  onShareJournal: (entry: JournalEntry, isEphemeral: boolean) => void;
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
    <div className="relative">
            
      {/* Reply Preview Banner */}
      {replyingTo && (
        <div className="flex justify-between items-center bg-white/70 border border-white border-l-4 border-l-[#A3D2C3] p-3 mb-3 rounded-2xl text-xs text-[#958D85] shadow-sm animate-in slide-in-from-bottom-2">
           <div className="flex flex-col">
              <span className="font-bold text-[#A3D2C3]">回复 {replyingTo.senderName}:</span>
              <span className={`line-clamp-1 opacity-80 mt-1 ${replyingTo.isEphemeral ? 'italic' : ''}`}>
                {replyingTo.isEphemeral ? '🔥 [已成灰烬的信件]' : replyingTo.content}
              </span>
           </div>
           <button onClick={onCancelReply} className="text-[#958D85] hover:text-[#FAAE9D] p-2 bg-white/50 rounded-full hover:shadow-sm">✕</button>
        </div>
      )}

      {/* Journal Selector Modal (Popover) */}
      {showJournalSelector && (
        <>
            {/* Backdrop to close on click outside */}
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setShowJournalSelector(false)}
            ></div>
            
            <div className="absolute bottom-16 left-0 md:left-4 z-50 w-72 bg-white/90 backdrop-blur-xl border border-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex flex-col animate-in slide-in-from-bottom-2 duration-200 max-h-[60vh]">
                <div className="flex items-center justify-between p-4 border-b border-black/5 bg-white/50 rounded-t-3xl">
                <span className="text-[10px] font-bold text-[#958D85] uppercase tracking-widest">将私密日记化作落叶分享</span>
                <button onClick={() => setShowJournalSelector(false)} className="text-[#958D85] hover:text-[#FAAE9D] font-bold">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
                {entries.length === 0 ? (
                    <div className="text-center py-8 text-[#958D85]/50 text-xs italic">本子里空空如也</div>
                ) : (
                    entries.map(entry => (
                        <div key={entry.id} className="p-4 bg-white/50 border border-white rounded-2xl hover:shadow-md hover:-translate-y-0.5 transition-all group">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-[#4A443F] font-bold font-serif opacity-80">{formatDate(entry.createdAt)}</span>
                            <button 
                                onClick={() => { onShareJournal(entry, isEphemeral); setShowJournalSelector(false); }}
                                className={`text-[10px] px-3 py-1 font-bold rounded-full transition-colors ${isEphemeral ? 'bg-[#FDF3F1] text-[#FAAE9D] hover:bg-[#FAAE9D] hover:text-white' : 'bg-[#FAAE9D] text-white hover:bg-[#F6A89E] shadow-sm'}`}
                            >
                                分享{isEphemeral ? ' (阅后即焚)' : ''}
                            </button>
                        </div>
                        <p className="text-xs text-[#958D85] line-clamp-2 leading-relaxed font-serif opacity-90">
                            {entry.content.replace(/<[^>]*>/g, '').slice(0, 50) || "..."}
                        </p>
                        </div>
                    ))
                )}
                </div>
            </div>
        </>
      )}

      <div className="flex gap-3 items-center">
        {/* Burn Toggle */}
        <button
           onClick={() => setIsEphemeral(!isEphemeral)}
           className={`h-12 w-12 shrink-0 flex items-center justify-center rounded-2xl transition-all duration-300 relative group shadow-sm
             ${isEphemeral ? 'bg-[#FDF3F1] text-[#FAAE9D] border border-white' : 'bg-white/50 hover:bg-white text-[#958D85] border border-transparent hover:border-white'}
           `}
           title="阅后即焚 (1分钟)"
        >
           <span className={`text-xl ${isEphemeral ? 'animate-bounce' : 'opacity-80'}`}>🔥</span>
           {isEphemeral && (
             <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#FAAE9D] rounded-full"></span>
           )}
        </button>

        <div className="w-[1px] h-6 bg-black/10 mx-1"></div>

        <button 
            onClick={() => setShowJournalSelector(!showJournalSelector)}
            className={`h-12 w-12 shrink-0 flex items-center justify-center rounded-2xl transition-colors shadow-sm ${showJournalSelector ? 'bg-white text-[#A3D2C3] border border-white' : 'bg-white/50 hover:bg-white text-[#958D85] border border-transparent'}`}
            title="分享日记"
        >
            <span className="text-xl opacity-80">📄</span>
        </button>
        
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isEphemeral ? "发送阅后即焚信件..." : "投递心声..."}
          className={`flex-1 rounded-2xl px-5 py-4 text-sm outline-none transition-all shadow-inner
             ${isEphemeral ? 'bg-[#FDF3F1]/80 text-[#4A443F] placeholder-[#FAAE9D]/60' : 'bg-white text-[#4A443F] placeholder-[#958D85]/50'}
          `}
          autoFocus
        />
        <button 
          onClick={handleSend}
          className={`px-6 h-12 rounded-2xl text-sm font-bold tracking-widest transition-all shadow-md hover:-translate-y-0.5 hover:shadow-lg
            ${isEphemeral 
              ? 'bg-[#FAAE9D] text-white hover:bg-[#F6A89E] shadow-[#FAAE9D]/20' 
              : 'bg-[#A3D2C3] hover:bg-[#8DBDAB] text-white shadow-[#A3D2C3]/20'}
          `}
        >
          {isEphemeral ? '投递即焚' : '投递'}
        </button>
      </div>
    </div>
  );
};
