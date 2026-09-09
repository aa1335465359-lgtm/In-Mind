import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowDown, Radio, Shuffle, Send, Flame, Link, LogOut, LockKeyhole, BookOpen, X, Reply, LoaderCircle, Eye, Users } from 'lucide-react';
import { ChatMessage, JournalEntry } from '../types';
import { useChatSession } from '../hooks/useChatSession';
import { hashPasscode } from '../services/encryption';
import { cleanHtml, titleOf } from '../services/memoryArt';
import { createAnonymousName, senderHue } from '../services/chatIdentity';
import { ephemeralRemaining } from '../services/ephemeralMessage';

const nicknameForTab = () => {
  try { const saved = sessionStorage.getItem('inmind_anonymous_name'); if (saved) return saved; }
  catch { /* storage is optional */ }
  return createAnonymousName();
};

function Message({ msg, isMe, onReply, onView, onExpire }: { msg: ChatMessage; isMe: boolean; onReply: () => void; onView: () => void; onExpire: () => void }) {
  const callback = useRef(onExpire); callback.current = onExpire;
  const expired = useRef(false);
  const [openedAt, setOpenedAt] = useState<number | null>(() => msg.isEphemeral && isMe ? msg.timestamp : null);
  const [remaining, setRemaining] = useState(() => openedAt ? ephemeralRemaining(openedAt) : 60);
  const sealed = Boolean(msg.isEphemeral && openedAt === null);

  useEffect(() => {
    if (!msg.isEphemeral || openedAt === null) return;
    const tick = () => {
      const next = ephemeralRemaining(openedAt); setRemaining(next);
      if (next === 0 && !expired.current) { expired.current = true; callback.current(); }
    };
    tick(); const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [msg.isEphemeral, openedAt]);

  if (msg.type === 'system' || msg.type === 'screenshot-alert') return <div className="chat-system">{msg.content}</div>;
  return <article className={`chat-message ${isMe ? 'mine' : ''} ${sealed ? 'is-sealed' : ''}`} style={{ '--sender-hue': senderHue(msg.senderId) } as React.CSSProperties}>
    <div className="message-avatar" aria-hidden="true">{isMe ? '我' : (msg.senderName || '匿').slice(0, 1)}</div>
    <div className="message-body">
      <div className="message-meta"><span>{isMe ? `我 · ${msg.senderName || ''}` : msg.senderName || '匿名来信'}</span><time>{new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time></div>
      {sealed ? <button className="ephemeral-seal" onClick={() => setOpenedAt(Date.now())}><span><Flame size={16} /></span><strong>{msg.type === 'journal-share' ? '一页密封的回忆' : '一条阅后即焚消息'}</strong><small><Eye size={13} /> 点击打开，随后保留 60 秒</small></button> : <div className={`message-bubble ${msg.isEphemeral ? 'ephemeral-open' : ''}`}>
        {msg.replyTo && <blockquote>{msg.replyTo.senderName}：{msg.replyTo.contentPreview}</blockquote>}
        {msg.type === 'journal-share' ? <button className="shared-journal" onClick={onView}><BookOpen size={21} /><span><strong>{msg.meta?.journalTitle || '一页回忆'}</strong><span>{msg.content}</span></span></button> : <p>{msg.content}</p>}
      </div>}
      <div className="message-actions">{msg.isEphemeral && <span className="burn-status"><Flame size={12} />{sealed ? '尚未打开' : `${remaining}s 后从本页清除`}</span>}<button aria-label="引用回复" onClick={onReply}><Reply size={13} /> 回复</button></div>
    </div>
  </article>;
}

export const ChatRoom: React.FC<{ entries: JournalEntry[]; currentEntry: JournalEntry | null; onClose: () => void; initialRoomId?: string }> = ({ entries, onClose, initialRoomId }) => {
  const [senderId] = useState(() => crypto.randomUUID().slice(0, 8));
  const session = useChatSession(senderId);
  const [name, setName] = useState(nicknameForTab), [draft, setDraft] = useState(''), [sending, setSending] = useState(false);
  const [burn, setBurn] = useState(false), [replying, setReplying] = useState<ChatMessage | null>(null), [notice, setNotice] = useState('');
  const [viewing, setViewing] = useState<ChatMessage | null>(null), [share, setShare] = useState(''), [showShare, setShowShare] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const list = useRef<HTMLDivElement>(null), textarea = useRef<HTMLTextAreaElement>(null), nearBottom = useRef(true), previousCount = useRef(0);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior }); nearBottom.current = true; setUnreadCount(0); };

  useLayoutEffect(() => {
    const added = Math.max(0, session.messages.length - previousCount.current); previousCount.current = session.messages.length;
    if (nearBottom.current) requestAnimationFrame(() => scrollToBottom());
    else if (added) setUnreadCount(count => count + added);
    if (viewing && !session.messages.some(message => message.id === viewing.id)) setViewing(null);
    if (replying && !session.messages.some(message => message.id === replying.id)) setReplying(null);
  }, [session.messages]);

  useLayoutEffect(() => {
    if (!textarea.current) return;
    textarea.current.style.height = '0px';
    textarea.current.style.height = `${Math.min(124, Math.max(42, textarea.current.scrollHeight))}px`;
  }, [draft, replying]);

  useEffect(() => { if (session.connection === 'joined') requestAnimationFrame(() => textarea.current?.focus()); }, [session.connection]);

  const shuffleName = () => { const next = createAnonymousName(); setName(next); try { sessionStorage.setItem('inmind_anonymous_name', next); } catch { /* optional */ } };
  const join = async () => {
    const nickname = name.trim(); if (!nickname) { setNotice('先给自己取一个代号。'); return; }
    setNotice(''); try { sessionStorage.setItem('inmind_anonymous_name', nickname); } catch { /* optional */ }
    session.joinRoom(initialRoomId || await hashPasscode('888'), nickname);
  };
  const send = async () => {
    if (!draft.trim() || sending) return;
    const submitted = draft; setSending(true); setNotice(''); nearBottom.current = true;
    try { await session.sendMessage(submitted.trim(), replying, burn); setDraft(current => current === submitted ? '' : current); setReplying(null); setBurn(false); }
    catch (error) { setNotice(error instanceof Error ? error.message : '发送失败，草稿已保留。'); }
    finally { setSending(false); }
  };
  const shareEntry = async () => {
    const entry = entries.find(item => item.id === share); if (!entry || sending) return;
    if (!confirm('将这篇日记的文字分享给当前公共房间内的所有人？')) return;
    setSending(true); nearBottom.current = true;
    try { await session.shareJournal(entry, burn); setShowShare(false); setShare(''); setBurn(false); }
    catch (error) { setNotice(error instanceof Error ? error.message : '分享失败。'); }
    finally { setSending(false); }
  };
  const leave = () => { if (!confirm('离开并清除本页聊天？日记不会受影响。')) return; void session.leaveRoom(); setViewing(null); setReplying(null); setUnreadCount(0); };

  return <section className="radio-room">
    <aside className="radio-sidebar"><button className="text-button" onClick={onClose}><ArrowLeft size={16} /> 返回记忆</button><div className="frequency-copy"><span className="eyebrow">ANONYMOUS FREQUENCY</span><h1>不认识，<br />也可以说真话。</h1><p>没有关注、主页和聊天记录。只保留此刻。</p></div><div className="station-label"><Radio size={20} /><div><strong>公共频率 001</strong><span>{session.isJoined ? `${session.onlineCount} 人在线` : '等待一个偶然经过的人'}</span></div></div><div className="locked-station"><LockKeyhole size={14} /><span>更多频率暂未开放</span></div><p className="radio-footnote">普通消息只存在于当前页面会话。即焚消息需主动打开，60 秒后从本页清除；网页无法阻止截图。</p></aside>
    <div className="radio-content">
      <header className="radio-header"><div><span className="eyebrow">LIVE / 001</span><h2>匿名同频</h2></div><div>{session.isJoined && <span className="online-pill"><i /><Users size={13} />{session.onlineCount}</span>}{session.isJoined && <button className="icon-button" aria-label="复制同频邀请" onClick={async () => { try { const id = await hashPasscode('888'); await navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${id}`); setNotice('邀请地址已复制。'); } catch { setNotice('复制失败，请直接分享本站地址。'); } }}><Link size={16} /></button>}{session.isJoined && <button className="text-button" onClick={leave}><LogOut size={15} /> 离开</button>}</div></header>
      {session.connection !== 'joined' ? <div className="radio-join"><div className="frequency-number">001<span>PUBLIC FREQUENCY</span></div><div className="join-card"><span className="eyebrow">YOUR TEMPORARY IDENTITY</span><h2>{session.connection === 'connecting' ? '正在接入频率…' : '先挑一个荒谬的代号'}</h2><label><span>匿名代号</span><div><input value={name} onChange={event => setName(event.target.value)} maxLength={28} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) void join(); }} /><button aria-label="换一个随机代号" onClick={shuffleName}><Shuffle size={16} /> 换一个</button></div></label><p className="nickname-example">例如：爱吃鸡蛋的捣蛋鬼1、下班失败的奥特曼37</p><button className="primary-button" disabled={session.connection === 'connecting'} onClick={() => void join()}>{session.connection === 'connecting' ? <LoaderCircle size={16} className="spin" /> : <Radio size={16} />}{session.connection === 'error' ? '重新连接' : '带着这个代号进入'}</button>{session.error && <p className="inline-notice" role="alert">{session.error}</p>}</div></div> : <>
        <div className="chat-feed"><div className="chat-scroll" ref={list} aria-live="polite" onScroll={() => { if (!list.current) return; nearBottom.current = list.current.scrollHeight - list.current.scrollTop - list.current.clientHeight < 90; if (nearBottom.current) setUnreadCount(0); }}><p className="chat-system">你以「{session.nickname}」加入 · 这里只显示加入后的消息</p>{session.messages.length === 0 && <div className="chat-welcome"><span>HELLO, STRANGER.</span><p>没有开场白也没关系。</p><div>{['今天最想吐槽什么？', '说一件没人知道的小事。', '路过，和你打个招呼。'].map(text => <button key={text} onClick={() => { setDraft(text); textarea.current?.focus(); }}>{text}</button>)}</div></div>}{session.messages.map(message => <Message key={message.id} msg={message} isMe={message.senderId === senderId} onReply={() => { setReplying(message); textarea.current?.focus(); }} onView={() => setViewing(message)} onExpire={() => session.expireMessage(message.id)} />)}</div>{unreadCount > 0 && <button className="new-messages" onClick={() => scrollToBottom('smooth')}><ArrowDown size={14} /> {unreadCount} 条新消息</button>}</div>
        <div className={`chat-composer ${burn ? 'burn-mode' : ''}`}>{replying && <div className="reply-preview"><span>回复 {replying.senderName}：{replying.isEphemeral ? '[阅后即焚消息]' : replying.content.slice(0, 60)}</span><button aria-label="取消回复" onClick={() => setReplying(null)}><X size={14} /></button></div>}<textarea ref={textarea} value={draft} onChange={event => setDraft(event.target.value)} placeholder={burn ? '这条消息打开 60 秒后会消失…' : '说点什么，不必留下真实名字…'} aria-label="聊天消息" maxLength={2000} rows={1} onFocus={() => requestAnimationFrame(() => scrollToBottom())} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} /><div className="composer-tools"><div><button className={burn ? 'burn-active' : ''} onClick={() => setBurn(value => !value)} aria-pressed={burn}><Flame size={15} /> {burn ? '即焚已开启' : '阅后即焚'}</button><button onClick={() => setShowShare(value => !value)}><BookOpen size={15} /> 分享一页</button></div><button className="send-button" onClick={() => void send()} disabled={sending || !draft.trim()} aria-label="发送消息">{sending ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}</button></div>{showShare && <div className="share-picker"><select aria-label="选择分享的回忆" value={share} onChange={event => setShare(event.target.value)}><option value="">选择一段回忆（仅分享文字）</option>{entries.map(entry => <option key={entry.id} value={entry.id}>{titleOf(entry)}</option>)}</select><button disabled={!share || sending} onClick={() => void shareEntry()}>确认分享</button></div>}<div className="composer-hint"><span>{burn ? '对方主动打开后开始 60 秒倒计时' : 'Enter 发送 · Shift + Enter 换行'}</span><span>{draft.length}/2000</span></div></div>
      </>}
      {notice && <p className="chat-notice" role="status">{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}><X size={13} /></button></p>}
    </div>
    {viewing && <div className="journal-share-overlay" role="dialog" aria-modal="true" aria-label="分享的日记" onClick={() => setViewing(null)} onKeyDown={event => { if (event.key === 'Escape') setViewing(null); }}><article onClick={event => event.stopPropagation()}><header><h2>{viewing.meta?.journalTitle}</h2><button autoFocus aria-label="关闭日记" onClick={() => setViewing(null)}><X /></button></header><div className="memory-prose" dangerouslySetInnerHTML={{ __html: cleanHtml(viewing.meta?.fullContent || '') }} /></article></div>}
  </section>;
};
