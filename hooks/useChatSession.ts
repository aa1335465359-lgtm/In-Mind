import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatMessage, JournalEntry } from '../types';
import { subscribeToRoom, sendChatMessage, isCloudConfigured } from '../services/supabase';
import { cleanHtml, textOf } from '../services/memoryArt';

export const useChatSession = (senderId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connection, setConnection] = useState<'idle' | 'connecting' | 'joined' | 'error'>('idle');
  const [error, setError] = useState(''), [roomId, setRoomId] = useState(''), [nickname, setNickname] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null), generation = useRef(0);
  const connectTimer = useRef<ReturnType<typeof setTimeout>>();
  const nickRef = useRef(''), stateRef = useRef(connection); stateRef.current = connection;
  const purge = (id: string) => setMessages(items => items.filter(m => m.senderId !== id));
  const append = (message: ChatMessage) => setMessages(items => items.some(m => m.id === message.id) ? items : [...items, message].slice(-500));
  useEffect(() => () => {
    generation.current++;
    clearTimeout(connectTimer.current);
    const channel = channelRef.current; channelRef.current = null;
    if (channel) {
      // On lock/unmount, clean up even if broadcast acknowledgement fails.
      void sendChatMessage(channel, { id: crypto.randomUUID(), content: '', type: 'purge-user', senderId, timestamp: Date.now() }).catch(() => {}).finally(() => channel.unsubscribe());
    }
  }, [senderId]);
  const joinRoom = (id: string, name: string) => {
    if (!isCloudConfigured) { setError('同频暂未连接到 Supabase，日记仍可使用。'); setConnection('error'); return false; }
    const version = ++generation.current;
    clearTimeout(connectTimer.current);
    void channelRef.current?.unsubscribe();
    setRoomId(id); setNickname(name); nickRef.current = name;
    setMessages([]); setError(''); setConnection('connecting');
    channelRef.current = subscribeToRoom(id, (payload: ChatMessage) => {
      if (version !== generation.current || !payload || typeof payload.id !== 'string' || typeof payload.senderId !== 'string' || typeof payload.content !== 'string' || !Number.isFinite(payload.timestamp)) return;
      if (payload.type === 'purge-user') { purge(payload.senderId); return; }
      if (!['text', 'system', 'journal-share', 'screenshot-alert'].includes(payload.type)) return;
      append({ ...payload, content: payload.content.slice(0, 16000), senderName: String(payload.senderName || '匿名来信').slice(0, 40), meta: payload.meta ? { ...payload.meta, fullContent: cleanHtml(String(payload.meta.fullContent || '').slice(0, 120000)) } : undefined });
    }, { id: senderId, name }, count => { if (version === generation.current) setOnlineCount(count); }, id => { if (version === generation.current && id !== senderId) purge(id); }, status => {
      if (version !== generation.current) return;
      if (status === 'SUBSCRIBED') { clearTimeout(connectTimer.current); setConnection('joined'); setError(''); }
      else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) { setConnection('error'); setError('连接中断，文字草稿已保留。可以重新进入。'); }
    });
    connectTimer.current = setTimeout(() => {
      if (version === generation.current && stateRef.current !== 'joined') {
        setConnection('error'); setError('连接超时，可以重新进入。草稿仍然保留。');
      }
    }, 15000);
    return true;
  };
  const leaveRoom = async () => {
    const channel = channelRef.current; channelRef.current = null; generation.current++;
    clearTimeout(connectTimer.current);
    setConnection('idle'); setMessages([]); setOnlineCount(0); setError('');
    if (channel) try { await sendChatMessage(channel, { id: crypto.randomUUID(), content: '', senderId, senderName: nickname, timestamp: Date.now(), type: 'purge-user' }); } catch { /* still unsubscribe */ } finally { await channel.unsubscribe(); }
  };
  const send = async (message: ChatMessage) => {
    if (stateRef.current !== 'joined' || !channelRef.current) throw new Error('尚未连上房间，请重试连接。');
    await sendChatMessage(channelRef.current, message);
    append(message);
  };
  const sendMessage = async (content: string, replyTo?: ChatMessage | null, isEphemeral?: boolean) => {
    await send({ id: crypto.randomUUID(), content, senderId, senderName: nickname, timestamp: Date.now(), type: 'text', isEphemeral, replyTo: replyTo ? { id: replyTo.id, senderName: replyTo.senderName || '匿名', contentPreview: replyTo.isEphemeral ? '[阅后即焚消息]' : replyTo.content.slice(0, 40), isEphemeral: replyTo.isEphemeral } : undefined });
  };
  const shareJournal = async (entry: JournalEntry, isEphemeral = false) => {
    const fullContent = cleanHtml(entry.content).replace(/<img\b[^>]*>/gi, '').slice(0, 100000);
    await send({ id: crypto.randomUUID(), content: textOf(entry.content).slice(0, 80) || '一页回忆', senderId, senderName: nickname, timestamp: Date.now(), type: 'journal-share', isEphemeral, meta: { journalTitle: entry.title || new Date(entry.createdAt).toLocaleDateString(), journalId: entry.id, fullContent } });
  };
  const sendScreenshotAlert = async (action: 'screenshot' | 'copy') => {
    await send({ id: crypto.randomUUID(), senderId, senderName: nickname, timestamp: Date.now(), type: 'screenshot-alert', content: `${nickname} 触发了${action === 'copy' ? '复制' : '截图快捷键'}提醒` });
  };
  return { messages, isJoined: connection === 'joined', connection, error, roomId, nickname, onlineCount, joinRoom, leaveRoom, sendMessage, shareJournal, sendScreenshotAlert, expireMessage: (id: string) => setMessages(items => items.filter(m => m.id !== id)) };
};
