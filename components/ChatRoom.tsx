import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, JournalEntry } from '../types';
import { subscribeToRoom, sendChatMessage } from '../services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { hashPasscode } from '../services/encryption';

interface ChatRoomProps {
  entries: JournalEntry[]; // List of entries for sharing
  currentEntry: JournalEntry | null; // Keep for fallback or default
  onClose: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ entries, currentEntry, onClose }) => {
  // RAM-Only State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [roomId, setRoomId] = useState<string>('');
  const [isJoined, setIsJoined] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [senderId] = useState(() => crypto.randomUUID().slice(0, 8)); // Anonymous ID per session
  
  // UI State
  const [showJournalSelector, setShowJournalSelector] = useState(false);
  const [showRandomMatchToast, setShowRandomMatchToast] = useState(false);
  
  // Security State
  const [isBlurred, setIsBlurred] = useState(false);
  const [panicTriggered, setPanicTriggered] = useState(false);

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper
  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // --- 1. Security: Panic Mode & Blur ---
  useEffect(() => {
    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);
    
    // Level 2 Threat: Screen Capture / DevTools keys
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen (often just 'PrintScreen' or handled by OS, but we try)
      // F12, Ctrl+Shift+I, Ctrl+Shift+C (DevTools)
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
    // Immediate destruction of data
    setMessages([]);
    setInputValue('');
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setPanicTriggered(true);
  };

  // --- 2. Connection Logic ---
  const joinRoom = () => {
    // Generate Room ID: "public" or hashed password
    const id = passcode.trim() ? hashPasscode(passcode) : 'public_lounge';
    setRoomId(id);
    
    // Clean up old connection if any
    if (channelRef.current) channelRef.current.unsubscribe();

    // Subscribe
    const channel = subscribeToRoom(id, (payload: ChatMessage) => {
      setMessages(prev => [...prev, payload]);
    });
    
    channelRef.current = channel;
    setIsJoined(true);
    
    // Add local system message (RAM only)
    setMessages(prev => [...prev, {
      id: 'sys-start',
      content: '已进入加密通道。消息不做任何存储，刷新即焚。',
      senderId: 'system',
      timestamp: Date.now(),
      type: 'system'
    }]);
  };

  const handleRandomMatch = () => {
    // Logic code exists but is locked
    // const randomId = `room_${Math.floor(Math.random() * 1000)}`;
    // setPasscode(randomId); // Technically works but we block it
    
    setShowRandomMatchToast(true);
    setTimeout(() => setShowRandomMatchToast(false), 3000);
  };

  const leaveRoom = () => {
    if (channelRef.current) channelRef.current.unsubscribe();
    channelRef.current = null;
    setMessages([]);
    setIsJoined(false);
    setPasscode('');
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !channelRef.current) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      content: inputValue.trim(),
      senderId,
      timestamp: Date.now(),
      type: 'text'
    };

    await sendChatMessage(channelRef.current, msg);
    setInputValue('');
  };

  const handleShareEntry = async (entry: JournalEntry) => {
    if (!channelRef.current) return;
    
    // We only send a snippet/shadow initially
    const snippet = entry.content.replace(/<[^>]*>/g, '').slice(0, 60) + '...';
    
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      content: snippet,
      senderId,
      timestamp: Date.now(),
      type: 'journal-share',
      meta: {
        journalTitle: new Date(entry.createdAt).toLocaleDateString(),
        journalId: entry.id 
      }
    };

    await sendChatMessage(channelRef.current, msg);
    setShowJournalSelector(false); // Close selector after sending
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) channelRef.current.unsubscribe();
    };
  }, []);

  // --- Renders ---

  if (panicTriggered) {
    return (
      <div className="h-full w-full bg-red-950 flex items-center justify-center flex-col text-red-500 font-mono z-50">
        <h1 className="text-4xl font-bold mb-4">⚠️ SECURITY BREACH</h1>
        <p>检测到潜在的截屏或调试行为。</p>
        <p>内存数据已强制清空。</p>
        <button onClick={onClose} className="mt-8 px-6 py-2 border border-red-800 hover:bg-red-900 text-red-400">
          退出系统
        </button>
      </div>
    );
  }

  return (
    <div className={`relative h-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4] font-mono overflow-hidden transition-all duration-300 ${isBlurred ? 'blur-xl scale-105' : ''}`}>
      
      {/* Blur Overlay Message */}
      {isBlurred && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <div className="bg-black/80 px-8 py-4 rounded text-white font-bold tracking-widest pointer-events-none">
            🙈 隐私保护模式 · 点击恢复
          </div>
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
        <button onClick={onClose} className="text-[#666] hover:text-white text-xs">
          [ 离开离开 ]
        </button>
      </div>

      {!isJoined ? (
        // JOIN SCREEN
        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 relative">
          
          {/* Toast Notification */}
          {showRandomMatchToast && (
            <div className="absolute top-10 bg-[#333] text-[#ddd] px-4 py-2 rounded shadow-lg border border-[#555] animate-bounce text-xs">
              🚧 功能灰度测试中，暂未对公众开放
            </div>
          )}

          <div className="w-full max-w-sm space-y-6">
             <div className="text-center space-y-2">
               <h2 className="text-xl text-[#eee]">临时匿名对话</h2>
               <p className="text-xs text-[#666]">RAM Only · No Database · No History</p>
             </div>
             
             <div className="space-y-4">
               <input 
                 type="password"
                 placeholder="输入房间暗号 (留空进入大厅)"
                 value={passcode}
                 onChange={(e) => setPasscode(e.target.value)}
                 className="w-full bg-[#2d2d2d] border border-[#444] text-white p-3 rounded text-center outline-none focus:border-[#666] transition-colors placeholder:text-[#444]"
               />
               <button 
                 onClick={joinRoom}
                 className="w-full bg-[#333] hover:bg-[#444] text-[#ccc] py-3 rounded border border-[#444] transition-all"
               >
                 建立加密连接
               </button>
               
               {/* Random Match Button (Beta Locked) */}
               <div className="pt-2 border-t border-[#333]">
                   <button 
                     onClick={handleRandomMatch}
                     className="w-full group relative flex items-center justify-center gap-2 bg-[#222] hover:bg-[#282828] text-[#666] py-2 rounded border border-[#333] transition-all cursor-pointer overflow-hidden"
                   >
                     <span className="z-10 text-xs">🎲 随机匹配 (Beta)</span>
                     {/* Striped overlay to indicate disabled/wip state */}
                     <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#333_10px,#333_20px)] pointer-events-none"></div>
                   </button>
               </div>
             </div>
             
             <div className="text-[10px] text-[#444] text-center pt-8">
               注意：页面刷新后所有内容将永久丢失。<br/>
               严禁发送违规信息，IP 可能会受到监管。
             </div>
          </div>
        </div>
      ) : (
        // CHAT SCREEN
        <>
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
                <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] break-words flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    
                    {msg.type === 'journal-share' ? (
                      <div className={`p-3 rounded-xl mb-1 text-sm border shadow-sm ${isMe ? 'bg-[#2d2d2d] border-[#444] text-[#aaa] rounded-tr-none' : 'bg-[#252526] border-[#333] text-[#888] rounded-tl-none'}`}>
                         <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wider opacity-50">
                            <span>📄 Shared Memory</span>
                         </div>
                         <div className="italic opacity-80 mb-2 font-serif">"{msg.content}"</div>
                         <div className="text-[10px] text-right opacity-40 border-t border-white/5 pt-1 mt-1">
                            {msg.meta?.journalTitle}
                         </div>
                      </div>
                    ) : (
                      <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-[#3e3e42] text-[#f0f0f0] rounded-br-none' : 'bg-[#252526] text-[#b0b0b0] rounded-bl-none border border-[#333]'}`}>
                        {msg.content}
                      </div>
                    )}
                    
                    <span className="text-[9px] text-[#444] mt-1 px-1">
                       {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#252526] border-t border-[#333] relative">
            
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
                                 onClick={() => handleShareEntry(entry)}
                                 className="text-[10px] bg-[#333] hover:bg-[#444] text-[#ccc] px-2 py-0.5 rounded border border-[#444]"
                               >
                                 发送
                               </button>
                            </div>
                            <p className="text-[10px] text-[#666] line-clamp-2 leading-relaxed">
                               {entry.content.replace(/<[^>]*>/g, '').slice(0, 50) || "No content..."}
                            </p>
                         </div>
                       ))
                    )}
                 </div>
              </div>
            )}

            <div className="flex gap-2">
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
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="发送临时消息..."
                className="flex-1 bg-[#1e1e1e] border border-[#333] rounded px-3 text-sm text-[#ccc] focus:border-[#555] outline-none"
                autoFocus
              />
              <button 
                onClick={handleSendMessage}
                className="px-4 bg-[#333] hover:bg-[#444] text-[#999] rounded text-xs transition-colors border border-[#333]"
              >
                发送
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};