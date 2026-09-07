import React, { lazy, Suspense, useState } from 'react';
import { Plus, ArrowUpRight, ArrowLeft, ArrowRight, LockKeyhole, Download, Search, CloudCheck, CloudOff, LoaderCircle, Radio, Orbit, CalendarDays } from 'lucide-react';
import { JournalEntry } from '../../types';
import { JournalSync } from '../../services/syncEngine';
import { imageOf, seedOf, textOf, titleOf } from '../../services/memoryArt';
import { MemoryEditor } from './MemoryEditor';
import { ChatRoom } from '../ChatRoom';

const Planet = lazy(() => import('./Planet').then(m => ({ default: m.Planet })));
interface Props { entries: JournalEntry[]; session: JournalSync; initialChat: boolean; onLock: () => void; onUpdate: (id: string, patch: Partial<JournalEntry>) => void; onDelete: (id: string) => void; onCreate: () => string; }
export function MemoryWorkspace({ entries, session, initialChat, onLock, onUpdate, onDelete, onCreate }: Props) {
  const [tab, setTab] = useState<'planet' | 'time' | 'chat'>(initialChat ? 'chat' : 'planet');
  const [selected, setSelected] = useState<string | null>(entries[0]?.id || null);
  const [detail, setDetail] = useState(false), [search, setSearch] = useState('');
  const [transfers, setTransfers] = useState(0), [showSync, setShowSync] = useState(false);
  const entry = entries.find(e => e.id === selected) || entries[0];
  const index = entry ? entries.findIndex(e => e.id === entry.id) : -1;
  const labels = { synced: '云端已同步', pending: '本机已存 · 等待同步', syncing: '正在同步', offline: '离线 · 本机已存', error: '本机已存 · 云端失败', local: '本机体验 · 不同步', 'local-error': '本机保存失败' };
  const start = () => { setSelected(onCreate()); setTab('planet'); setDetail(true); };
  const open = (id: string) => { setSelected(id); setDetail(true); setTab('planet'); };
  const backup = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `In-Mind-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const planet = <Suspense fallback={<div className="planet-loading"><LoaderCircle className="spin" /><span>正在唤醒这颗星球</span></div>}><Planet image={entry && imageOf(entry)} palette={entry?.planet?.palette} seed={entry?.planet?.seed ?? seedOf(entry?.id || 'inmind')} weather={entry?.weather} mood={entry?.userMood} /></Suspense>;
  return <div className="memory-app">
    <header className="app-header"><button className="wordmark" onClick={() => { setTab('planet'); setDetail(false); }} aria-label="返回记忆星球"><Orbit size={27} strokeWidth={1.4} /><span>in mind<span className="brand-dot">.</span></span></button>
      <nav className="main-nav" aria-label="主导航">{([{ key: 'planet', label: '记忆星球', Icon: Orbit }, { key: 'time', label: '时间收藏', Icon: CalendarDays }, { key: 'chat', label: '匿名同频', Icon: Radio }] as const).map(({ key, label, Icon }) => <button key={key} className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => { setTab(key); setDetail(false); }}><Icon size={16} /><span>{label}</span></button>)}</nav>
      <div className="header-actions"><button className={`sync-chip ${['error', 'local-error', 'offline'].includes(session.status) ? 'warning' : ''}`} onClick={() => setShowSync(!showSync)} aria-expanded={showSync}>{session.status === 'syncing' ? <LoaderCircle size={15} className="spin" /> : session.status === 'synced' ? <CloudCheck size={16} /> : <CloudOff size={16} />}<span>{labels[session.status]}</span></button><button className="icon-button" aria-label="锁定日记" onClick={onLock} disabled={transfers > 0}><LockKeyhole size={18} /></button></div>
    </header>
    {showSync && <div className="sync-panel" role="status"><strong>{labels[session.status]}</strong><p>{session.error || (session.status === 'local' ? '体验记录只保存在这台设备。正式登录后使用云端日记。' : '每次输入先保存本机，再同步到 Supabase。关闭前无需等待，但未同步内容暂时只在本机。')}</p><div><button onClick={() => void session.flush()}>立即重试同步</button><button onClick={backup}><Download size={14} /> 导出备份</button><button onClick={() => setShowSync(false)}>收起</button></div><small>导出的 JSON 含日记原文，请妥善保管。</small></div>}
    {session.status === 'local-error' && <div role="alert" className="critical-banner">本机保存失败，请勿关闭页面。<button onClick={backup}>立即导出备份</button></div>}
    {transfers > 0 && <div className="transfer-notice" role="status"><LoaderCircle size={14} className="spin" /> 照片正在处理，请暂时保持页面打开。</div>}
    <main className={tab === 'chat' ? 'chat-main' : 'workspace-main'}>
      {tab === 'planet' && (!detail || !entry) && <>
        <div className="collection-topline"><span className="eyebrow">THE PRIVATE COLLECTION</span><button className="primary-button" onClick={start}><Plus size={17} /> 留下一段回忆</button></div>
        <section className="planet-gallery"><div className="gallery-copy"><div className="collection-number">{String(entries.length).padStart(2, '0')}<span>段回忆，独一无二。</span></div><p className="eyebrow">{entry ? new Date(entry.createdAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) : '你的第一颗记忆星球'}</p><h1>{entry ? titleOf(entry) : <>平凡的一天，<br />也有自己的<br /><em>引力。</em></>}</h1><p className="gallery-excerpt">{entry ? textOf(entry.content).slice(0, 85) || '照片、心情，还有没来得及说的话。' : '放进一张照片，留下一点心情。把生活收进自己的小宇宙。'}</p><button className="open-memory" onClick={() => entry ? setDetail(true) : start()}>{entry ? '走进这段回忆' : '创建第一段回忆'}<ArrowUpRight size={20} /></button><div className="gallery-pagination"><button aria-label="上一段回忆" disabled={index <= 0} onClick={() => setSelected(entries[index - 1].id)}><ArrowLeft size={17} /></button><span>{index < 0 ? '00' : String(index + 1).padStart(2, '0')} <i>/</i> {String(entries.length).padStart(2, '0')}</span><button aria-label="下一段回忆" disabled={index >= entries.length - 1} onClick={() => setSelected(entries[index + 1].id)}><ArrowRight size={17} /></button></div></div><div className="gallery-art">{planet}<span className="art-margin-note">A LITTLE WORLD, ONLY YOURS.</span></div></section>
        <section className="memory-shelf"><div className="section-line"><h2>最近落下的星光</h2><button className="text-button" onClick={() => setTab('time')}>全部回忆 <ArrowUpRight size={14} /></button></div><div className="shelf-items">{entries.slice(0, 5).map((e, i) => <button className={`shelf-card ${entry?.id === e.id ? 'active' : ''}`} key={e.id} onClick={() => open(e.id)}><div className="shelf-image">{imageOf(e) ? <img src={imageOf(e)} alt="" loading="lazy" /> : <span className="typographic-cover" style={{ color: e.planet?.palette[0] }}>{String(i + 1).padStart(2, '0')}<small>{e.userMood || '未完待续'}</small></span>}</div><div><span>{new Date(e.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span><h3>{titleOf(e)}</h3></div></button>)}<button className="shelf-new" onClick={start}><Plus size={24} /><span>下一段，留给今天。</span></button></div></section>
      </>}
      {tab === 'planet' && detail && entry && <><div className="detail-topline"><button className="text-button" onClick={() => setDetail(false)}><ArrowLeft size={17} /> 返回星球</button><span className="eyebrow">{entry.isPinned ? '珍藏 / ' : ''}MEMORY NO. {String(index + 1).padStart(3, '0')}</span></div><div className="detail-layout"><MemoryEditor key={entry.id} entry={entry} onUpdate={onUpdate} onDelete={onDelete} localOnly={session.localOnly} onBusy={busy => setTransfers(n => Math.max(0, n + (busy ? 1 : -1)))} /><aside className="detail-art">{planet}<p>颜色来自照片，天气来自那一天。</p></aside></div></>}
      {tab === 'time' && <section className="archive"><div className="archive-heading"><div><span className="eyebrow">A LIFE, COLLECTED</span><h1>时间留下的，<em>都在这里。</em></h1></div><button className="primary-button" onClick={start}><Plus size={17} /> 新的回忆</button></div><label className="archive-search"><Search size={19} /><input placeholder="找一个词，一种心情，一段回忆…" value={search} onChange={e => setSearch(e.target.value)} /></label><div className="archive-list">{entries.filter(e => `${e.title || ''} ${textOf(e.content)} ${e.tags.join(' ')} ${e.userMood || ''} ${new Date(e.createdAt).toLocaleDateString()}`.includes(search)).map(e => <button key={e.id} className="archive-row" onClick={() => open(e.id)}><time>{new Date(e.createdAt).toLocaleDateString('zh-CN')}</time><div className="archive-thumb">{imageOf(e) ? <img src={imageOf(e)} alt="" loading="lazy" /> : <span>◌</span>}</div><div><h2>{titleOf(e)}</h2><p>{textOf(e.content).slice(0, 65) || '还没有正文'}</p></div><span className="archive-mood">{e.userMood || '未标记'}</span><ArrowUpRight size={19} /></button>)}</div>{(!entries.length || !entries.some(e => `${e.title || ''} ${textOf(e.content)} ${e.tags.join(' ')} ${e.userMood || ''} ${new Date(e.createdAt).toLocaleDateString()}`.includes(search))) && <p className="archive-empty">{search ? '没有找到对应的回忆，换个词试试。' : '还没有记录。第一段回忆，从今天开始。'}</p>}<button className="text-button" onClick={backup}><Download size={16} /> 导出我的记录</button></section>}
      {/* Preserve the live channel when moving between diary and chat; dispose on lock. */}
      <div className="chat-surface" hidden={tab !== 'chat'}><ChatRoom entries={entries} currentEntry={entry || null} onClose={() => setTab('planet')} /></div>
    </main>
    {tab !== 'chat' && <footer className="app-footer"><span>IN MIND — 记忆有形，生活有迹。</span><span>{new Date().getFullYear()} · PRIVATE COLLECTION</span></footer>}
  </div>;
}
