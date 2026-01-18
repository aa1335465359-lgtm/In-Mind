import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, JournalEntry } from '../types';
import { subscribeToRoom, sendChatMessage } from '../services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ChatJoin } from './chat/ChatJoin';
import { ChatMessageList } from './chat/ChatMessageList';
import { ChatInput } from './chat/ChatInput';

interface ChatRoomProps {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  onClose: () => void;
  initialRoomId?: string; // Auto-join if provided
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ entries, currentEntry, onClose, initialRoomId }) => {
  // --- State ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const [nickname, setNickname] = useState('');
  
  // Quoting State
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Journal Viewing State
  const [viewingJournal, setViewingJournal] = useState<{content: string, title: string} | null>(null);

  // Identity
  const [senderId] = useState(() => crypto.randomUUID().slice(0, 8));

  // Security
  const [isBlurred, setIsBlurred] = useState(false);
  const [panicTriggered, setPanicTriggered] = useState(false);

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Auto-Join Logic
  useEffect(() => {
    if (initialRoomId && !isJoined) {
      // We still need a nickname, so we can't fully auto-join, but we can pre-fill
      // Or, we render ChatJoin with prefilled room ID logic handled inside ChatJoin component 
      // But ChatJoin component in this architecture handles the UI.
      // Let's rely on user inputting nickname in ChatJoin, but we pass initialRoomId to it if we modify ChatJoin
      // OR we just use the ID. 
    }
  }, [initialRoomId]);

  // --- 1. Security Hooks (Panic & Blur) ---
  useEffect(() => {
    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) ||
        e.key === 'PrintScreen'
      ) {
        triggerPanic();
      }
    };
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const triggerPanic = () => {
    leaveRoom(true); 
    setMessages([]);
    setPanicTriggered(true);
  };

  // --- 2. Connection Logic ---

  const handleJoin = (id: string, name: string) => {
    setRoomId(id);
    setNickname(name);
    
    if (channelRef.current) channelRef.current.unsubscribe();

    const channel = subscribeToRoom(id, (payload: ChatMessage) => {
      if (payload.type === 'purge-user') {
        setMessages(prev => prev.filter(m => m.senderId !== payload.senderId));
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          content: `${payload.senderName || 'Someone'} 已销毁痕迹并离开`,
          senderId: 'system',
          type: 'system',
          timestamp: Date.now()
        }]);
      } else {
        setMessages(prev => [...prev, payload]);
      }
    });
    
    channelRef.current = channel;
    setIsJoined(true);
    
    setMessages(prev => [...prev, {
      id: 'sys-start',
      content: '已进入加密通道。消息不做任何存储，退出即焚。',
      senderId: 'system',
      timestamp: Date.now(),
      type: 'system'
    }]);
  };

  const leaveRoom = async (isPanic = false) => {
    if (isJoined && channelRef.current) {
       const purgeMsg: ChatMessage = {
         id: crypto.randomUUID(),
         content: '',
         senderId,
         senderName: nickname,
         timestamp: Date.now(),
         type: 'purge-user'
       };
       await sendChatMessage(channelRef.current, purgeMsg);
       channelRef.current.unsubscribe();
    }
    
    channelRef.current = null;
    setMessages([]);
    setIsJoined(false);
    setNickname('');
    setRoomId('');
    if (!isPanic) onClose();
  };

  const handleShareInvite = () => {
    // Generate link with current room ID
    // Note: roomId here is already hashed or 'public_lounge'
    const baseUrl = window.location.origin + window.location.pathname;
    const inviteLink = `${baseUrl}?room=${roomId}`;
    
    navigator.clipboard.writeText(inviteLink).then(() => {
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        content: `邀请链接已复制: ${inviteLink} (此链接包含房间密钥，请通过安全渠道发送)`,
        senderId: 'system',
        type: 'system',
        timestamp: Date.now()
      }]);
    });
  };

  const handleSendMessage = async (text: string) => {
    if (!channelRef.current) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      content: text,
      senderId,
      senderName: nickname,
      timestamp: Date.now(),
      type: 'text',
      replyTo: replyingTo ? {
        id: replyingTo.id,
        senderName: replyingTo.senderName || 'Unknown',
        contentPreview: replyingTo.content.slice(0, 30)
      } : undefined
    };
    await sendChatMessage(channelRef.current, msg);
    setReplyingTo(null);
  };

  const handleShareJournal = async (entry: JournalEntry) => {
    if (!channelRef.current) return;
    const snippet = entry.content.replace(/<[^>]*>/g, '').slice(0, 60) + '...';
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      content: snippet,
      senderId,
      senderName: nickname,
      timestamp: Date.now(),
      type: 'journal-share',
      meta: {
        journalTitle: new Date(entry.createdAt).toLocaleDateString(),
        journalId: entry.id,
        fullContent: entry.content
      }
    };
    await sendChatMessage(channelRef.current, msg);
  };

  if (panicTriggered) {
    return (
      <div className="h-full w-full bg-red-950 flex items-center justify-center flex-col text-red-500 font-mono z-50">
        <h1 className="text-4xl font-bold mb-4">⚠️ SECURITY BREACH</h1>
        <button onClick={onClose} className="mt-8 px-6 py-2 border border-red-800 hover:bg-red-900 text-red-400">退出系统</button>
      </div>
    );
  }

  return (
    <div className={`relative h-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4] font-mono overflow-hidden transition-all duration-300 ${isBlurred ? 'blur-xl scale-105' : ''}`}>
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
      {isBlurred && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <div className="bg-black/80 px-8 py-4 rounded text-white font-bold tracking-widest pointer-events-none">🙈 隐私保护模式 · 点击恢复</div>
        </div>
      )}

      {/* Header */}
      <div className="h-12 border-b border-[#333] flex items-center justify-between px-4 bg-[#252526] shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isJoined ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-xs uppercase tracking-widest text-[#888]">
            {isJoined ? (roomId === 'public_lounge' ? 'Public Channel' : 'Private Room') : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
           {isJoined && (
             <button onClick={handleShareInvite} className="text-[#666] hover:text-[#dcb67f] text-xs transition-colors flex items-center gap-1">
               <span>🔗</span> 邀请
             </button>
           )}
           <button onClick={() => leaveRoom()} className="text-[#666] hover:text-white text-xs">
             [ {isJoined ? '销毁并退出' : '关闭'} ]
           </button>
        </div>
      </div>

      {!isJoined ? (
        // We override the ChatJoin internals to handle initialRoomId if passed, 
        // essentially hacking it to prefill the password field if it was a real component prop, 
        // but for now we just show the standard join screen. 
        // Enhanced: If initialRoomId exists, we can show it's pre-filled visually or just handle it logic-wise.
        <ChatJoin 
          onJoin={handleJoin} 
          onClose={onClose} 
        />
      ) : (
        <>
          <ChatMessageList 
             messages={messages} 
             senderId={senderId} 
             onReply={setReplyingTo}
             onViewJournal={(content, title) => setViewingJournal({ content, title: title || 'Journal' })}
          />
          <ChatInput 
             onSendMessage={handleSendMessage} 
             onShareJournal={handleShareJournal}
             entries={entries}
             replyingTo={replyingTo}
             onCancelReply={() => setReplyingTo(null)}
          />
        </>
      )}
    </div>
  );
};