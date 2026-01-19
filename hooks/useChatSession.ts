
import { useState, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ChatMessage, JournalEntry } from '../types';
import { subscribeToRoom, sendChatMessage, isCloudConfigured } from '../services/supabase';

export const useChatSession = (senderId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const [nickname, setNickname] = useState('');
  const [onlineCount, setOnlineCount] = useState<number>(0);
  
  const channelRef = useRef<RealtimeChannel | null>(null);

  const joinRoom = (id: string, name: string) => {
    if (!isCloudConfigured) {
      alert("⚠️ 无法连接服务器\n\n请检查 Vercel 环境变量配置 (VITE_SUPABASE_URL)。");
      return;
    }

    setRoomId(id);
    setNickname(name);
    
    // Clean up previous connection if exists
    if (channelRef.current) channelRef.current.unsubscribe();

    // Subscribe to new room with Presence tracking
    const channel = subscribeToRoom(
      id, 
      (payload: ChatMessage) => {
        if (payload.type === 'purge-user') {
          // Handle user exit/purge event
          setMessages(prev => {
            const filtered = prev.filter(m => m.senderId !== payload.senderId);
            return [...filtered, {
              id: `sys-${Date.now()}`,
              content: `${payload.senderName || 'Someone'} 已销毁痕迹并离开`,
              senderId: 'system',
              type: 'system',
              timestamp: Date.now()
            }];
          });
        } else {
          setMessages(prev => [...prev, payload]);
        }
      },
      { id: senderId, name: name }, // User Info for presence
      (count) => setOnlineCount(count) // Presence Callback
    );
    
    channelRef.current = channel;
    setIsJoined(true);
    
    // System welcome message (Local only)
    setMessages(prev => [...prev, {
      id: 'sys-start',
      content: '已进入加密通道。消息不做任何存储，退出即焚。',
      senderId: 'system',
      timestamp: Date.now(),
      type: 'system'
    }]);
  };

  const leaveRoom = async () => {
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
    setOnlineCount(0);
  };

  const sendMessage = async (text: string, replyTo?: ChatMessage | null) => {
    if (!channelRef.current) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      content: text,
      senderId,
      senderName: nickname,
      timestamp: Date.now(),
      type: 'text',
      replyTo: replyTo ? {
        id: replyTo.id,
        senderName: replyTo.senderName || 'Unknown',
        contentPreview: replyTo.content.slice(0, 30)
      } : undefined
    };
    await sendChatMessage(channelRef.current, msg);
  };

  const shareJournal = async (entry: JournalEntry) => {
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

  return {
    messages,
    isJoined,
    roomId,
    nickname,
    onlineCount,
    joinRoom,
    leaveRoom,
    sendMessage,
    shareJournal
  };
};
