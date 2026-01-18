
import React, { useState, useEffect } from 'react';
import { ChatMessage, JournalEntry } from '../types';
import { useChatSession } from '../hooks/useChatSession';
import { usePanicMode } from '../hooks/usePanicMode';
import { ChatJoin } from './chat/ChatJoin';
import { ChatMessageList } from './chat/ChatMessageList';
import { ChatInput } from './chat/ChatInput';

interface ChatRoomProps {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  onClose: () => void;
  initialRoomId?: string; 
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ entries, currentEntry, onClose, initialRoomId }) => {
  // --- 1. Identity & State ---
  const [senderId] = useState(() => crypto.randomUUID().slice(0, 8));
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [viewingJournal, setViewingJournal] = useState<{content: string, title: string} | null>(null);

  // --- 2. Custom Hooks (Logic Extracted) ---
  const { 
    messages, isJoined, roomId, nickname, 
    joinRoom, leaveRoom, sendMessage, shareJournal 
  } = useChatSession(senderId);

  const { isBlurred, panicTriggered, triggerPanic } = usePanicMode({
    onPanic: () => leaveRoom()
  });

  // --- 3. Effects ---
  
  // Auto-join if ID provided via URL
  useEffect(() => {
    if (initialRoomId && !isJoined) {
      // Auto-join logic could be placed here if we had a nickname strategy
    }
  }, [initialRoomId]);

  // Prevent accidental tab closure
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isJoined) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isJoined]);

  // --- 4. Handlers ---

  const handleConfirmLeave = () => {
    if (isJoined) {
       if (window.confirm('确定要断开加密连接吗？\n当前会话记录将被立即销毁且无法恢复。')) {
          leaveRoom();
          onClose();
       }
    } else {
       leaveRoom();
       onClose();
    }
  };

  const handleSendMessage = async (text: string) => {
    await sendMessage(text, replyingTo);
    setReplyingTo(null);
  };

  // --- 5. Render ---

  if (panicTriggered) {
    return (
      <div className="h-full w-full bg-red-950 flex items-center justify-center flex-col text-red-500 font-mono z-50">
        <h1 className="text-4xl font-bold mb-4">⚠️ SECURITY BREACH</h1>
        <button onClick={onClose} className="mt-8 px-6 py-2 border border-red-800 hover:bg-red-900 text-red-400">退出系统</button>
      </div>
    );
  }

  return (
    <div className={`relative flex-1 w-full min-w-0 h-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4] font-mono overflow-hidden transition-all duration-300 ${isBlurred ? 'blur-xl scale-105' : ''}`}>
      
      {/* Journal Viewer Overlay */}
      {viewingJournal && (
        <div className="absolute inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-[#fdfbf7] text-[#44403c] w-full max-w-lg h-[80vh] rounded-lg shadow-2xl flex flex-col overflow-hidden font-serif">
              <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-[#f8f6f1]">
                 <span className="font-bold">{viewingJournal.title}</span>
                 <button onClick={() => setViewingJournal(null)} className="text-2xl leading-none hover:text-red-500">×</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 rich-editor">
                 <div dangerouslySetInnerHTML={{ __html: viewingJournal.content }} />
              </div>
           </div>
        </div>
      )}

      {/* Privacy Curtain */}
      {isBlurred && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <div className="bg-black/80 px-8 py-4 rounded text-white font-bold tracking-widest pointer-events-none">🙈 隐私保护模式 · 点击恢复</div>
        </div>
      )}

      {/* Header */}
      <div className="h-12 border-b border-[#333] flex items-center justify-between px-4 bg-[#252526] shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isJoined ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-xs uppercase tracking-widest text-[#888]">
            {isJoined ? (roomId === 'public_lounge' ? 'Public Channel' : 'Private Room') : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
           {isJoined && (
             <button 
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
                  navigator.clipboard.writeText(url);
                  alert('邀请链接已复制');
                }} 
                className="text-[#666] hover:text-[#dcb67f] text-xs transition-colors flex items-center gap-1"
             >
               <span>🔗</span> 邀请
             </button>
           )}
           <button onClick={handleConfirmLeave} className="text-[#666] hover:text-white text-xs">
             [ {isJoined ? '销毁并退出' : '关闭'} ]
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 w-full relative">
        {!isJoined ? (
            <ChatJoin onJoin={joinRoom} onClose={onClose} />
        ) : (
            <>
            <div className="flex-1 min-h-0 w-full mx-auto max-w-5xl flex flex-col">
                <ChatMessageList 
                    messages={messages} 
                    senderId={senderId} 
                    onReply={setReplyingTo}
                    onViewJournal={(content, title) => setViewingJournal({ content, title: title || 'Journal' })}
                />
            </div>
            <div className="shrink-0 w-full mx-auto max-w-5xl bg-[#252526] border-t border-[#333]">
                <ChatInput 
                    onSendMessage={handleSendMessage} 
                    onShareJournal={shareJournal}
                    entries={entries}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                />
            </div>
            </>
        )}
      </div>
    </div>
  );
};
