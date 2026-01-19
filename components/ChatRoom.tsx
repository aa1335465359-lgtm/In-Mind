
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
  const [senderId] = useState(() => crypto.randomUUID().slice(0, 8));
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [viewingJournal, setViewingJournal] = useState<{content: string, title: string} | null>(null);

  const { 
    messages, isJoined, roomId, nickname, onlineCount,
    joinRoom, leaveRoom, sendMessage, sendScreenshotAlert, shareJournal 
  } = useChatSession(senderId);

  // --- 关键：挂载检测钩子 ---
  const { isBlurred, panicTriggered } = usePanicMode({
    onPanic: () => {
      // 本地模糊时的回调，目前主要靠 isBlurred 控制 CSS
    },
    onScreenshot: (action) => {
      // 只有已加入房间才发送广播，且明确区分 copy 和 screenshot
      if (isJoined) {
        sendScreenshotAlert(action);
      }
    }
  });

  useEffect(() => {
    if (initialRoomId && !isJoined) {
      // auto-join logic handled in ChatJoin or here if desired
    }
  }, [initialRoomId]);

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

  const handleSendMessage = async (text: string, isEphemeral?: boolean) => {
    await sendMessage(text, replyingTo, isEphemeral);
    setReplyingTo(null);
  };

  if (panicTriggered) {
    return (
      <div className="h-full w-full bg-red-950 flex items-center justify-center flex-col text-red-500 font-mono z-50 animate-in zoom-in duration-300">
        <h1 className="text-3xl font-bold mb-4 tracking-wider">⚠️ 安全警报</h1>
        <p className="text-red-400 mb-8 uppercase tracking-widest text-xs">检测到敏感操作</p>
        <button onClick={onClose} className="px-6 py-2 border border-red-800 hover:bg-red-900 text-red-400 transition-colors">
          强制断开连接
        </button>
      </div>
    );
  }

  return (
    <div className={`relative flex-1 w-full min-w-0 h-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4] overflow-hidden transition-all duration-300 ${isBlurred ? 'blur-2xl grayscale opacity-50' : ''}`}>
      
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-all duration-300 pointer-events-none">
          <div className="bg-black/80 border border-red-900/50 px-8 py-4 rounded text-white font-bold tracking-widest shadow-2xl flex flex-col items-center gap-2 animate-pulse">
             <span className="text-2xl">🛡️</span>
             <span>隐私保护已激活</span>
             <span className="text-[10px] text-stone-400">检测到窗口失焦、截图或复制行为</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="h-12 border-b border-[#333] flex items-center justify-between px-4 bg-[#252526] shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isJoined ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#bbb]">
              {isJoined ? (roomId === 'public_lounge' ? '公共休息室' : '加密频道') : '未连接'}
            </span>
            {isJoined && (
              <span className="text-[9px] text-[#666] tracking-tight">
                在线人数: <span className="text-green-600">{onlineCount}</span>
              </span>
            )}
          </div>
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
             [ {isJoined ? '销毁' : '关闭'} ]
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
                    onViewJournal={(content, title) => setViewingJournal({ content, title: title || '日记' })}
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
