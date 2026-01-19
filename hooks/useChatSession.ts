
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

  // 公用的清除逻辑
  const purgeUserMessages = (targetId: string, targetName?: string, reason: string = '已销毁痕迹并离开') => {
    setMessages(prev => {
      // 过滤掉该用户的所有消息
      const filtered = prev.filter(m => m.senderId !== targetId);
      // 添加系统提示
      return [...filtered, {
        id: `sys-${Date.now()}-${Math.random()}`,
        content: `${targetName || '某人'} ${reason}`,
        senderId: 'system',
        type: 'system',
        timestamp: Date.now()
      }];
    });
  };

  const joinRoom = (id: string, name: string) => {
    if (!isCloudConfigured) {
      alert("⚠️ 无法连接服务器\n\n请检查 Vercel 环境变量配置 (VITE_SUPABASE_URL)。");
      return;
    }

    setRoomId(id);
    setNickname(name);
    
    if (channelRef.current) channelRef.current.unsubscribe();

    const channel = subscribeToRoom(
      id, 
      (payload: ChatMessage) => {
        if (payload.type === 'purge-user') {
          // 主动退出
          purgeUserMessages(payload.senderId, payload.senderName);
        } else {
          setMessages(prev => [...prev, payload]);
        }
      },
      { id: senderId, name: name }, 
      (count) => setOnlineCount(count),
      (leftPeerId) => {
        // 被动掉线 (刷新/关闭/断网)
        // 注意：Supabase Presence 可能会在用户主动 unsubscribe 时也触发 leave
        // 但我们在 leaveRoom 里是先发 purge 消息再 unsubscribe
        // 所以这里可能是一个冗余保障，或者处理异常断开
        if (leftPeerId !== senderId) { // 不处理自己
           purgeUserMessages(leftPeerId, '信号丢失 (自动清除痕迹)');
        }
      }
    );
    
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

  const sendScreenshotAlert = async (action: 'screenshot' | 'copy' = 'screenshot') => {
    if (!channelRef.current || !isJoined) return;
    
    let alertText = '';
    if (action === 'screenshot') {
        alertText = `⚠️ ${nickname} 正在截图`;
    } else if (action === 'copy') {
        alertText = `⚠️ ${nickname} 正在复制信息`;
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
