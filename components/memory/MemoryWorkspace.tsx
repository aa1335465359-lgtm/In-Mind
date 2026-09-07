import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Cloud, Download, LoaderCircle, LockKeyhole, Menu, Plus, Radio, RotateCcw, Search, X } from 'lucide-react';
import { JournalEntry } from '../../types';
import { JournalSync } from '../../services/syncEngine';
import { imageOf, keywordsOf, seedOf, textOf, titleOf } from '../../services/memoryArt';
import { MemoryEditor } from './MemoryEditor';
import { ChatRoom } from '../ChatRoom';

const Planet = lazy(() => import('./Planet').then(module => ({ default: module.Planet })));
const Atmosphere = lazy(() => import('./Atmosphere').then(module => ({ default: module.Atmosphere })));

interface Props {
  entries: JournalEntry[];
  session: JournalSync;
  initialChat: boolean;
  onLock: () => void;
  onUpdate: (id: string, patch: Partial<JournalEntry>) => void;
  onDelete: (id: string) => void;
  onCreate: () => string;
}

type View = 'object' | 'archive' | 'chat';

export function MemoryWorkspace({ entries, session, initialChat, onLock, onUpdate, onDelete, onCreate }: Props) {
  const [view, setView] = useState<View>(initialChat ? 'chat' : 'object');
  const [selected, setSelected] = useState<string | null>(entries[0]?.id || null);
  const [detail, setDetail] = useState(false), [menu, setMenu] = useState(false), [showSync, setShowSync] = useState(false);
  const [search, setSearch] = useState(''), [transfers, setTransfers] = useState(0);
  const [motion, setMotion] = useState<'idle' | 'enter' | 'exit'>('enter');
  const [transitioning, setTransitioning] = useState(false);
  const timers = useRef<number[]>([]);
  const entry = entries.find(item => item.id === selected) || entries[0];
  const index = entry ? entries.findIndex(item => item.id === entry.id) : -1;
  const syncLabels = {
    synced: '已同步', pending: '等待同步', syncing: '同步中', offline: '离线保存', error: '云端同步失败',
    local: '仅保存在本机', 'local-error': '本机保存失败',
  };

  const visibleDots = useMemo(() => {
    if (entries.length <= 17) return entries;
    const from = Math.max(0, Math.min(entries.length - 17, index - 8));
    return entries.slice(from, from + 17);
  }, [entries, index]);
  const filtered = useMemo(() => entries.filter(item => {
    const haystack = `${item.title || ''} ${textOf(item.content)} ${item.tags.join(' ')} ${item.userMood || ''}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  }), [entries, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMotion('idle'), 920); timers.current.push(timer);
    return () => { timers.current.forEach(window.clearTimeout); timers.current = []; };
  }, []);

  const later = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timers.current = timers.current.filter(item => item !== timer); callback();
    }, delay);
    timers.current.push(timer); return timer;
  };

  const cancelTransitions = () => {
    timers.current.forEach(window.clearTimeout); timers.current = []; setTransitioning(false);
  };

  const openView = (next: View) => { cancelTransitions(); setView(next); setDetail(false); setMotion('idle'); setMenu(false); };
  const create = () => { cancelTransitions(); setSelected(onCreate()); setView('object'); setDetail(true); setMotion('enter'); setMenu(false); later(() => setMotion('idle'), 920); };
  const selectMemory = (id: string) => {
    if (transitioning || id === entry?.id) return;
    setTransitioning(true); setMotion('exit');
    later(() => { setSelected(id); setMotion('enter'); later(() => setMotion('idle'), 920); }, 430);
    later(() => setTransitioning(false), 1390);
  };
  const move = (direction: -1 | 1) => {
    if (entries.length < 2 || transitioning) return;
    const next = (Math.max(0, index) + direction + entries.length) % entries.length;
    selectMemory(entries[next].id);
  };
  const openDetail = () => {
    if (!entry || transitioning) return;
    setTransitioning(true); setMotion('exit');
    later(() => { setDetail(true); setMotion('enter'); later(() => setMotion('idle'), 920); }, 570);
    later(() => setTransitioning(false), 1530);
  };
  const closeDetail = () => {
    if (transitioning) return;
    setTransitioning(true); setMotion('exit');
    later(() => { setDetail(false); setMotion('enter'); later(() => setMotion('idle'), 920); }, 400);
    later(() => setTransitioning(false), 1360);
  };
  const backup = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `In-Mind-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const planet = (place: 'object' | 'detail') => <Suspense fallback={<div className="planet-loading"><LoaderCircle className="spin" /><span>回忆正在聚拢</span></div>}>
    <Planet key={`${place}-${entry?.id || 'empty'}`} compact image={entry && imageOf(entry)} palette={entry?.planet?.palette} seed={entry?.planet?.seed ?? seedOf(entry?.id || 'inmind')} mood={entry?.userMood} keywords={keywordsOf(entry)} motion={motion} onActivate={place === 'object' ? openDetail : undefined} />
  </Suspense>;

  return <div className={`memory-app ${view}-view ${detail ? 'detail-view' : ''}`}>
    <Suspense fallback={null}><Atmosphere atmosphere={entry?.planet?.atmosphere} weather={entry?.weather} palette={entry?.planet?.palette} seed={entry?.planet?.seed ?? seedOf(entry?.id || 'inmind')} subdued={view !== 'object' || detail} /></Suspense>
    <header className="minimal-header">
      <button className="minimal-brand" onClick={() => openView('object')} aria-label="回到记忆作品">IN MIND<span>°</span></button>
      <div className="minimal-header-actions">
        <button className={`save-indicator ${session.status}`} onClick={() => setShowSync(value => !value)} aria-label={syncLabels[session.status]}>
          <span /><span>{syncLabels[session.status]}</span>
        </button>
        <button className="round-control" aria-label={menu ? '关闭菜单' : '打开菜单'} aria-expanded={menu} onClick={() => setMenu(value => !value)}>{menu ? <X /> : <Menu />}</button>
      </div>
    </header>

    {menu && <div className="control-menu" role="dialog" aria-label="功能菜单">
      <nav>
        <button className={view === 'object' ? 'active' : ''} onClick={() => openView('object')}><span>01</span>记忆</button>
        <button className={view === 'archive' ? 'active' : ''} onClick={() => openView('archive')}><span>02</span>时间收藏</button>
        <button className={view === 'chat' ? 'active' : ''} onClick={() => openView('chat')}><span>03</span>匿名同频</button>
      </nav>
      <div className="control-menu-secondary">
        <button onClick={create}><Plus /> 新的回忆</button>
        <button onClick={() => { setShowSync(true); setMenu(false); }}><Cloud /> {syncLabels[session.status]}</button>
        <button onClick={backup}><Download /> 导出</button>
        <button onClick={onLock} disabled={transfers > 0}><LockKeyhole /> 锁定</button>
      </div>
    </div>}

    {showSync && <aside className="sync-panel" role="status">
      <button className="sync-close" aria-label="关闭同步信息" onClick={() => setShowSync(false)}><X /></button>
      <span className={`large-status ${session.status}`} />
      <strong>{syncLabels[session.status]}</strong>
      <p>{session.error || (session.status === 'local' ? '这些记录只留在这台设备。' : '每次输入都会先写入本机，再安静地同步到云端。')}</p>
      <div><button onClick={() => void session.flush()}>重新同步</button><button onClick={backup}>导出备份</button></div>
    </aside>}

    {session.status === 'local-error' && <div role="alert" className="critical-banner">本机保存失败，请先导出记录。<button onClick={backup}>导出</button></div>}
    {transfers > 0 && <div className="transfer-notice" role="status"><LoaderCircle className="spin" />照片正在成为一段记忆</div>}

    <main className={view === 'chat' ? 'chat-main' : 'workspace-main'}>
      {view === 'object' && (!detail || !entry) && <section className={`object-room scene-${motion}`}>
        {entry ? <>
          <div className="object-art">{planet('object')}</div>
          <button className="object-arrow previous" aria-label="上一段回忆" onClick={() => move(-1)} disabled={entries.length < 2 || transitioning}><ArrowLeft /></button>
          <button className="object-arrow next" aria-label="下一段回忆" onClick={() => move(1)} disabled={entries.length < 2 || transitioning}><ArrowRight /></button>
          <button className="object-caption" onClick={openDetail} disabled={transitioning}>
            <span>{new Date(entry.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
            <strong>{titleOf(entry)}</strong>
            <small>{entry.userMood || '未命名的感受'}</small>
          </button>
          <div className="memory-index" aria-label="回忆索引">{visibleDots.map(item => <button key={item.id} className={item.id === entry.id ? 'active' : ''} aria-label={`打开${titleOf(item)}`} disabled={transitioning} onClick={() => selectMemory(item.id)} />)}</div>
        </> : <div className="empty-object">
          <Suspense fallback={null}><Planet compact seed={1335} keywords={keywordsOf()} motion={motion} /></Suspense>
          <button onClick={create}><Plus /><span>放入第一张照片</span></button>
        </div>}
      </section>}

      {view === 'object' && detail && entry && <section className={`memory-detail scene-${motion}`}>
        <header><button className="back-control" onClick={closeDetail} disabled={transitioning}><ArrowLeft /> 回到作品</button><span>{String(index + 1).padStart(3, '0')} / {String(entries.length).padStart(3, '0')}</span></header>
        <div className="detail-layout">
          <MemoryEditor key={entry.id} entry={entry} onUpdate={onUpdate} onDelete={id => { onDelete(id); setDetail(false); }} localOnly={session.localOnly} onBusy={busy => setTransfers(count => Math.max(0, count + (busy ? 1 : -1)))} />
          <aside className="detail-art">{planet('detail')}<button onClick={closeDetail} disabled={transitioning}><RotateCcw /> 返回作品模式</button></aside>
        </div>
      </section>}

      {view === 'archive' && <section className="archive page-reveal">
        <header className="archive-heading"><div><span>{String(entries.length).padStart(2, '0')} MEMORIES</span><h1>时间收藏</h1></div><button onClick={create}><Plus /> 新的回忆</button></header>
        <label className="archive-search"><Search /><input placeholder="搜索一段回忆" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <div className="archive-list">{filtered.map((item, itemIndex) => <button key={item.id} className="archive-row" style={{ '--row': itemIndex } as React.CSSProperties} onClick={() => { setSelected(item.id); setView('object'); setDetail(true); setMotion('enter'); later(() => setMotion('idle'), 920); }}>
          <span>{String(entries.indexOf(item) + 1).padStart(3, '0')}</span>
          <time>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</time>
          <div className="archive-thumb">{imageOf(item) ? <img src={imageOf(item)} alt="" loading="lazy" /> : <span>{String(itemIndex + 1).padStart(2, '0')}</span>}</div>
          <div><h2>{titleOf(item)}</h2><p>{textOf(item.content).slice(0, 80) || '还没有正文'}</p></div>
          <span className="archive-mood">{item.userMood || '—'}</span><ArrowRight />
        </button>)}</div>
        {!filtered.length && <p className="archive-empty">{search ? '没有找到这段回忆。' : '还没有记录。'}</p>}
      </section>}

      <div className="chat-surface page-reveal" hidden={view !== 'chat'}><ChatRoom entries={entries} currentEntry={entry || null} onClose={() => openView('object')} /></div>
    </main>
  </div>;
}
