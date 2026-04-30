
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

interface ViewingJournalState {
  messageId?: string; // Track which message triggered this
  content: string;
  title: string;
  isEphemeral?: boolean;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ entries, currentEntry, onClose, initialRoomId }) => {
  const [senderId] = useState(() => crypto.randomUUID().slice(0, 8));
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [viewingJournal, setViewingJournal] = useState<ViewingJournalState | null>(null);

  const { 
    messages, isJoined, roomId, nickname, onlineCount,
    joinRoom, leaveRoom, sendMessage, sendScreenshotAlert, shareJournal 
  } = useChatSession(senderId);

  // --- Panic Hook ---
  // isBlurred: 视觉模糊 (切屏或风险)
  // isRiskDetected: 风险警告 (截图/复制)
  const { isBlurred, isRiskDetected, panicTriggered } = usePanicMode({
    onPanic: () => {}, // 可以在这里做一些额外的本地清理
    onScreenshot: (action) => {
      // 只有已加入房间才发送广播
      if (isJoined) {
        sendScreenshotAlert(action);
      }
    }
  });

  useEffect(() => {
    if (initialRoomId && !isJoined) {
      // auto-join logic could go here
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

  // Handle Journal Expiration Sync from ChatMessageList
  // 当 ChatMessageList 里的气泡销毁时，如果正在查看该气泡对应的日记，则关闭窗口
  const handleMsgExpire = (expiredMsgId: string) => {
      if (viewingJournal && viewingJournal.messageId === expiredMsgId) {
          setViewingJournal(null);
      }
  };

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

  // 这种是极端的 Panic 状态（手动触发或严重违规），通常不自动恢复
  if (panicTriggered) {
    return (
      <div className="h-full w-full bg-red-950 flex items-center justify-center flex-col text-red-500 font-mono z-50 animate-in zoom-in duration-300">
        <h1 className="text-3xl font-bold mb-4 tracking-wider">⚠️ 严重警告</h1>
        <p className="text-red-400 mb-8 uppercase tracking-widest text-xs">检测到恶意操作</p>
        <button onClick={onClose} className="px-6 py-2 border border-red-800 hover:bg-red-900 text-red-400 transition-colors">
          断开连接
        </button>
      </div>
    );
  }

  return (
    <div className={`relative flex-1 w-full min-w-0 h-full flex flex-col bg-noise text-main overflow-hidden transition-all duration-300 ${isBlurred ? 'blur-xl grayscale' : ''}`}>
      <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl z-0 pointer-events-none"></div>
      {/* Journal Viewer Overlay */}
      {viewingJournal && (
        <div 
            className="absolute inset-0 z-[60] bg-white/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setViewingJournal(null)} // Click outside to close
        >
           <div 
              className="bg-noise w-full max-w-lg h-[80vh] rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-white flex flex-col overflow-hidden font-serif relative"
              onClick={(e) => e.stopPropagation()} // Prevent close on inner click
           >
              <div className="p-6 border-b border-white/50 flex justify-between items-center bg-white/50">
                 <div className="flex flex-col">
                    <span className="font-bold">{viewingJournal.title}</span>
                    {viewingJournal.isEphemeral && (
                       <span className="text-[10px] text-red-500 flex items-center gap-1">
                          🔥 阅后即焚模式
                       </span>
                    )}
                 </div>
                 <button onClick={() => setViewingJournal(null)} className="text-2xl leading-none hover:text-red-500">×</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 rich-editor">
                 <div dangerouslySetInnerHTML={{ __html: viewingJournal.content }} />
              </div>
              
              {/* Removed ugly countdown sync indicator */}
           </div>
        </div>
      )}

      {/* Warning Overlay - 仅在检测到违规风险时显示 */}
      {isRiskDetected && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-900/20 backdrop-blur-sm transition-all duration-300 pointer-events-none animate-pulse">
          <div className="bg-red-950/90 border border-red-500/50 px-8 py-6 rounded text-white font-bold tracking-widest shadow-2xl flex flex-col items-center gap-3">
             <span className="text-4xl">📸</span>
             <span className="text-red-200">检测到敏感操作</span>
             <span className="text-[10px] text-red-400 font-mono">已向聊天室发送警报</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="h-16 border-b border-white/50 flex items-center justify-between px-6 bg-white/40 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isJoined ? 'bg-[#A3D2C3] animate-pulse shadow-[0_0_8px_rgba(163,210,195,0.8)]' : 'bg-[#FAAE9D]'}`}></div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#4A443F]">
              {isJoined ? (roomId === 'public_lounge' ? '公共信箱' : '私密空间') : '未连接'}
            </span>
            {isJoined && (
              <span className="text-[10px] text-[#958D85] tracking-widest uppercase">
                同频: <span className="text-[#A3D2C3] font-bold">{onlineCount}</span>
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
           {isJoined && (
             <button 
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
                  navigator.clipboard.writeText(url);
                  alert('邀请链接已复制');
                }} 
                className="text-[#958D85] hover:text-[#4A443F] font-bold text-xs transition-colors flex items-center gap-1.5 bg-white/50 px-3 py-1.5 rounded-full shadow-sm hover:shadow"
             >
               <span>🔗</span> 邀请同频人
             </button>
           )}
           <button onClick={handleConfirmLeave} className="text-[#FAAE9D]/70 hover:text-[#FAAE9D] font-bold text-xs bg-white/50 px-3 py-1.5 rounded-full shadow-sm hover:shadow">
             {isJoined ? '烧毁信件' : '离开'}
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 w-full relative">
        {!isJoined ? (
            <ChatJoin onJoin={joinRoom} onClose={onClose} />
        ) : (
            <>
            <div className="flex-1 min-h-0 w-full mx-auto max-w-3xl flex flex-col z-10">
                <ChatMessageList 
                    messages={messages} 
                    senderId={senderId} 
                    onReply={setReplyingTo}
                    onViewJournal={(content, title, isEphemeral, messageId) => setViewingJournal({ content, title: title || '日记', isEphemeral, messageId })}
                    onExpireMsg={handleMsgExpire}
                />
            </div>
            <div className="shrink-0 w-full mx-auto max-w-3xl bg-white/60 backdrop-blur-xl border-t border-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.03)] p-4 mb-4">
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
