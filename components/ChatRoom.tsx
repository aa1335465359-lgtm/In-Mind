
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
  const handleMsgExpire = (expiredMsgId: string) => {
      // If the currently viewed journal matches the expired message, close it
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
    <div className={`relative flex-1 w-full min-w-0 h-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4] overflow-hidden transition-all duration-300 ${isBlurred ? 'blur-lg grayscale' : ''}`}>
      
      {/* Journal Viewer Overlay */}
      {viewingJournal && (
        <div 
            className="absolute inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setViewingJournal(null)} // Click outside to close
        >
           <div 
              className="bg-[#fdfbf7] text-[#44403c] w-full max-w-lg h-[80vh] rounded-lg shadow-2xl flex flex-col overflow-hidden font-serif relative"
              onClick={(e) => e.stopPropagation()} // Prevent close on inner click
           >
              <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-[#f8f6f1]">
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
              
              {/* Ephemeral Indicator (Controlled by message timer now) */}
              {viewingJournal.isEphemeral && (
                  <div className="absolute bottom-4 left-4 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-mono shadow-lg animate-pulse flex items-center gap-2">
                    <span>🔥 消息倒计时同步中...</span>
                  </div>
              )}
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
                    onViewJournal={(content, title, isEphemeral, messageId) => setViewingJournal({ content, title: title || '日记', isEphemeral, messageId })}
                    onExpireMsg={handleMsgExpire}
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
