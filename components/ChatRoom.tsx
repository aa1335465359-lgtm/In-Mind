import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowDown, Radio, Shuffle, Send, Flame, Link, LogOut, LockKeyhole, BookOpen, X, Reply, LoaderCircle } from 'lucide-react';
import { ChatMessage, JournalEntry } from '../types';
import { useChatSession } from '../hooks/useChatSession';
import { hashPasscode } from '../services/encryption';
import { cleanHtml, titleOf } from '../services/memoryArt';

const names = ['路过月亮的人', '把风装进口袋', '一颗不想上班的星', '凌晨的收音机', '今天也有引力', '雨天的漫游者'];
const randomName = () => names[Math.floor(Math.random() * names.length)] + String(Math.floor(Math.random() * 90 + 10));
function Message({ msg, isMe, onReply, onView, onExpire }: { msg: ChatMessage; isMe: boolean; onReply: () => void; onView: () => void; onExpire: () => void }) {
  const ref = useRef<HTMLDivElement>(null), callback = useRef(onExpire); callback.current = onExpire;
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!msg.isEphemeral || !ref.current) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const observer = new IntersectionObserver(events => {
      if (!events.some(e => e.isIntersecting)) return;
      observer.disconnect(); const end = Date.now() + 60000; setRemaining(60);
      timer = setInterval(() => { const left = Math.max(0, Math.ceil((end - Date.now()) / 1000)); setRemaining(left); if (left === 0) { clearInterval(timer); callback.current(); } }, 1000);
    }, { threshold: .15 });
    observer.observe(ref.current);
    return () => { observer.disconnect(); clearInterval(timer); };
  }, [msg.id, msg.isEphemeral]);
  if (msg.type === 'system' || msg.type === 'screenshot-alert') return <div className="chat-system">{msg.content}</div>;
  return <div ref={ref} className={`chat-message ${isMe ? 'mine' : ''}`}><div className="message-meta"><span>{isMe ? '我' : msg.senderName || '匿名来信'}</span><time>{new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time></div><div className="message-bubble">{msg.replyTo && <blockquote>{msg.replyTo.senderName}：{msg.replyTo.contentPreview}</blockquote>}{msg.type === 'journal-share' ? <button className="shared-journal" onClick={onView}><BookOpen size={23} /><span><strong>{msg.meta?.journalTitle || '一页回忆'}</strong><span>{msg.content}</span></span></button> : <p>{msg.content}</p>}</div><div className="message-actions">{msg.isEphemeral && <span><Flame size={12} /> {remaining === null ? '阅读后 60 秒消失' : `${remaining}s 后消失`}</span>}<button aria-label="引用回复" onClick={onReply}><Reply size={13} /> 回复</button></div></div>;
}
export const ChatRoom: React.FC<{ entries: JournalEntry[]; currentEntry: JournalEntry | null; onClose: () => void; initialRoomId?: string }> = ({ entries, onClose }) => {
  const [senderId] = useState(() => crypto.randomUUID().slice(0, 8));
  const session = useChatSession(senderId);
  const [name, setName] = useState(randomName), [draft, setDraft] = useState(''), [sending, setSending] = useState(false);
  const [burn, setBurn] = useState(false), [replying, setReplying] = useState<ChatMessage | null>(null), [notice, setNotice] = useState('');
  const [viewing, setViewing] = useState<ChatMessage | null>(null), [share, setShare] = useState(''), [showShare, setShowShare] = useState(false);
  const [unread, setUnread] = useState(false);
  const list = useRef<HTMLDivElement>(null), nearBottom = useRef(true);
  useEffect(() => {
    if (nearBottom.current && list.current) list.current.scrollTop = list.current.scrollHeight;
    else setUnread(true);
    if (viewing && !session.messages.some(m => m.id === viewing.id)) setViewing(null);
    if (replying && !session.messages.some(m => m.id === replying.id)) setReplying(null);
  }, [session.messages]);
  const join = async () => { if (!name.trim()) { setNotice('先给自己取一个代号。'); return; } setNotice(''); session.joinRoom(await hashPasscode('888'), name.trim()); };
  const send = async () => {
    if (!draft.trim() || sending) return;
    const submitted = draft; setSending(true); setNotice('');
    try { await session.sendMessage(submitted.trim(), replying, burn); setDraft(current => current === submitted ? '' : current); setReplying(null); nearBottom.current = true; }
    catch (e) { setNotice(e instanceof Error ? e.message : '发送失败，草稿已保留。'); }
    finally { setSending(false); }
  };
  const shareEntry = async () => {
    const e = entries.find(e => e.id === share); if (!e || sending) return;
    if (!confirm('将这篇日记的文字分享给当前公共房间内的所有人？')) return;
    setSending(true);
    try { await session.shareJournal(e, burn); setShowShare(false); }
    catch (e) { setNotice(e instanceof Error ? e.message : '分享失败。'); }
    finally { setSending(false); }
  };
  return <section className="radio-room">
    <aside className="radio-sidebar"><button className="text-button" onClick={onClose}><ArrowLeft size={16} /> 返回记忆</button><span className="eyebrow">ON THE SAME FREQUENCY</span><h1>不必认识，<br />也能<em>同频。</em></h1><p>把今天的一句话，交给另一个路过这里的人。</p><div className="station-label"><Radio size={22} /><div><strong>公共频率 001</strong><span>{session.isJoined ? `${session.onlineCount} 人此刻在这里` : '同一个房间，偶然相遇'}</span></div></div><div className="locked-station"><LockKeyhole size={15} /><span>更多频率，尚未开放</span></div><p className="radio-footnote">消息不写入聊天数据库。离开后清除本页会话，无法阻止对方截图或留存。</p></aside>
    <div className="radio-content"><header className="radio-header"><div><span className="eyebrow">LIVE / 001</span><h2>匿名同频</h2></div><div>{session.isJoined && <><button className="icon-button" aria-label="复制同频邀请" onClick={async () => { try { const id = await hashPasscode('888'); await navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${id}`); setNotice('邀请已复制，进入的仍是这个公共房间。'); } catch { setNotice('复制失败，请直接分享本站地址。'); } }}><Link size={17} /></button><button className="text-button" onClick={() => { if (confirm('离开并清除本页聊天？日记不会受影响。')) { void session.leaveRoom(); setViewing(null); setReplying(null); } }}><LogOut size={16} /> 离开</button></>}</div></header>
      {session.connection !== 'joined' ? <div className="radio-join"><div className="frequency-number">001<span>PUBLIC FREQUENCY</span></div><h2>{session.connection === 'connecting' ? '正在寻找同频的人…' : '带上代号，就能加入。'}</h2><label>你的匿名代号<div><input value={name} onChange={e => setName(e.target.value)} maxLength={20} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) void join(); }} /><button aria-label="随机代号" onClick={() => setName(randomName())}><Shuffle size={17} /></button></div></label><button className="primary-button" disabled={session.connection === 'connecting'} onClick={() => void join()}>{session.connection === 'connecting' ? <LoaderCircle size={17} className="spin" /> : <Radio size={17} />}{session.connection === 'error' ? '重新连接' : '进入公共频率'}</button>{session.error && <p className="inline-notice" role="alert">{session.error}</p>}</div> : <>
        <div className="chat-scroll" ref={list} onScroll={() => { if (!list.current) return; nearBottom.current = list.current.scrollHeight - list.current.scrollTop - list.current.clientHeight < 70; if (nearBottom.current) setUnread(false); }}>
          <p className="chat-system">已加入公共频率 · 从此刻开始的对话</p>{session.messages.length === 0 && <div className="chat-welcome"><span>HELLO, STRANGER.</span><p>没有开场白也没关系。</p><div>{['今天有什么小事让你开心？', '我想在这里放下一点烦恼。', '路过，和你打个招呼。'].map(t => <button key={t} onClick={() => setDraft(t)}>{t}</button>)}</div></div>}
          {session.messages.map(msg => <Message key={msg.id} msg={msg} isMe={msg.senderId === senderId} onReply={() => setReplying(msg)} onView={() => setViewing(msg)} onExpire={() => session.expireMessage(msg.id)} />)}
        </div>
        {unread && <button className="new-messages" onClick={() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' }); setUnread(false); }}><ArrowDown size={15} /> 新消息</button>}
        <div className="chat-composer">{replying && <div className="reply-preview"><span>回复 {replying.senderName}：{replying.isEphemeral ? '[阅后即焚消息]' : replying.content.slice(0, 60)}</span><button aria-label="取消回复" onClick={() => setReplying(null)}><X size={15} /></button></div>}<textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="说点什么，不必留下名字…" aria-label="聊天消息" maxLength={8000} rows={3} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} /><div className="composer-tools"><div><button className={burn ? 'burn-active' : ''} onClick={() => setBurn(!burn)} aria-pressed={burn}><Flame size={16} /> 阅后即焚</button><button onClick={() => setShowShare(!showShare)}><BookOpen size={16} /> 分享一页</button></div><button className="send-button" onClick={() => void send()} disabled={sending || !draft.trim()} aria-label="发送消息">{sending ? <LoaderCircle size={17} className="spin" /> : <Send size={17} />}</button></div>{showShare && <div className="share-picker"><select aria-label="选择分享的回忆" value={share} onChange={e => setShare(e.target.value)}><option value="">选择一段回忆（仅分享文字）</option>{entries.map(e => <option key={e.id} value={e.id}>{titleOf(e)}</option>)}</select><button disabled={!share || sending} onClick={() => void shareEntry()}>确认分享</button></div>}<div className="composer-hint"><span>{burn ? '进入对方可见区域后，60 秒从页面移除' : 'Enter 发送 · Shift + Enter 换行'}</span><span>{draft.length}/8000</span></div></div>
      </>}{notice && <p className="chat-notice" role="status">{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}><X size={13} /></button></p>}
    </div>
    {viewing && <div className="journal-share-overlay" role="dialog" aria-modal="true" aria-label="分享的日记" onClick={() => setViewing(null)} onKeyDown={e => { if (e.key === 'Escape') setViewing(null); }}><article onClick={e => e.stopPropagation()}><header><h2>{viewing.meta?.journalTitle}</h2><button autoFocus aria-label="关闭日记" onClick={() => setViewing(null)}><X /></button></header><div className="memory-prose" dangerouslySetInnerHTML={{ __html: cleanHtml(viewing.meta?.fullContent || '') }} /></article></div>}
  </section>;
};
