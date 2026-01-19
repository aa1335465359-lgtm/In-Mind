
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

  // 清除指定用户的消息
  const purgeUserMessages = (targetId: string, targetName?: string, reason: string = '已断开连接，痕迹自动销毁') => {
    setMessages(prev => {
      // 1. 找到该用户发送的消息数量，如果为0则不发系统提示（避免幽灵提示）
      const hasMessages = prev.some(m => m.senderId === targetId);
      
      // 2. 过滤消息
      const filtered = prev.filter(m => m.senderId !== targetId);
      
      if (!hasMessages) return filtered;

      // 3. 插入销毁提示
      return [...filtered, {
        id: `sys-${Date.now()}-${Math.random()}`,
        content: `${targetName || '对方'} ${reason}`,
        senderId: 'system',
        type: 'system',
        timestamp: Date.now()
      }];
    });
  };

  const joinRoom = (id: string, name: string) => {
    if (!isCloudConfigured) {
      alert("⚠️ 无法连接服务器\n\n请检查 Vercel 环境变量配置。");
      return;
    }

    setRoomId(id);
    setNickname(name);
    
    if (channelRef.current) channelRef.current.unsubscribe();

    const channel = subscribeToRoom(
      id, 
      (payload: ChatMessage) => {
        if (payload.type === 'purge-user') {
          // 对方主动点击了退出/销毁
          purgeUserMessages(payload.senderId, payload.senderName, '已手动销毁痕迹并离开');
        } else {
          setMessages(prev => [...prev, payload]);
        }
      },
      { id: senderId, name: name }, 
      (count) => setOnlineCount(count),
      (leftPeerId) => {
        // 对方意外掉线 (刷新、关闭标签页、网络断开)
        if (leftPeerId !== senderId) {
           purgeUserMessages(leftPeerId);
        }
      }
    );
    
    channelRef.current = channel;
    setIsJoined(true);
    
    setMessages(prev => [...prev, {
      id: 'sys-start',
      content: '已进入加密通道。消息不做任何存储，对方掉线或退出后记录即刻消失。',
      senderId: 'system',
      timestamp: Date.now(),
      type: 'system'
    }]);
  };

  const leaveRoom = async () => {
    if (isJoined && channelRef.current) {
       // 发送主动销毁信号
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

  const sendMessage = async (text: string, replyTo?: ChatMessage | null, isEphemeral?: boolean) => {
    if (!channelRef.current) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      content: text,
      senderId,
      senderName: nickname,
      timestamp: Date.now(),
      type: 'text',
      isEphemeral,
      replyTo: replyTo ? {
        id: replyTo.id,
        senderName: replyTo.senderName || 'Unknown',
        contentPreview: replyTo.content.slice(0, 30)
      } : undefined
    };
    await sendChatMessage(channelRef.current, msg);
  };

  const sendScreenshotAlert = async (action: 'screenshot' | 'copy') => {
    if (!channelRef.current || !isJoined) return;
    
    let alertText = '';
    if (action === 'screenshot') {
        alertText = `⚠️ ${nickname} 正在进行截图操作`;
    } else if (action === 'copy') {
        alertText = `⚠️ ${nickname} 正在复制对话内容`;
    }

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      content: alertText,
      senderId,
      senderName: 'SYSTEM_ALERT',
      timestamp: Date.now(),
      type: 'screenshot-alert'
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
    sendScreenshotAlert,
    shareJournal
  };
};
