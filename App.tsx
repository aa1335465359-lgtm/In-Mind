import React, { lazy, Suspense, useEffect, useState } from 'react';
import { LockScreen } from './components/LockScreen';
import type { JournalSync } from './services/syncEngine';
import { useJournal } from './hooks/useJournal';
import type { JournalEntry } from './types';

const MemoryWorkspace = lazy(() => import('./components/memory/MemoryWorkspace').then(module => ({ default: module.MemoryWorkspace })));

const createEntry = (): JournalEntry => ({
  id: crypto.randomUUID(), content: '', createdAt: Date.now(), updatedAt: Date.now(), tags: [], images: [],
});

export default function App() {
  const [session, setSession] = useState<JournalSync | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Perf: the first paint stays free of three.js. Once the user interacts with
  // the gate (focus/typing), pull the workspace, the two WebGL layers and the
  // session service in the background — still well before the login round-trip
  // finishes. Imports are idempotent, and the listeners detach after one fire.
  useEffect(() => {
    const warm = () => {
      void import('./components/memory/MemoryWorkspace');
      void import('./components/memory/Orbit');
      void import('./components/memory/Atmosphere');
      void import('./services/journalSession');
    };
    const events = ['pointerdown', 'keydown', 'focusin'] as const;
    const once = () => { events.forEach(name => window.removeEventListener(name, once)); warm(); };
    events.forEach(name => window.addEventListener(name, once, { passive: true }));
    return () => events.forEach(name => window.removeEventListener(name, once));
  }, []);
  const { entries, change, update } = useJournal(session);
  const [initialChat] = useState(() => new URLSearchParams(location.search).has('room'));
  const start = async (pass: string, mode: 'login' | 'register' | 'local') => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const { openJournal } = await import('./services/journalSession');
      setSession(await openJournal(pass, mode));
    }
    catch (e) { setError(e instanceof Error ? e.message : '暂时无法进入，请重试。'); }
    finally { setBusy(false); }
  };
  const local = () => {
    try {
      let pass = localStorage.getItem('ht_device_pass');
      if (!pass) { pass = crypto.randomUUID(); localStorage.setItem('ht_device_pass', pass); }
      void start(pass, 'local');
    } catch { setError('浏览器不允许本地存储，请退出无痕模式或允许站点存储。'); }
  };
  const lock = () => {
    if (session && !session.localSafe) { alert('本机备份失败，请先导出记录再锁定。'); return; }
    if (session) void session.flush();
    setSession(null);
  };
  if (!session) return <LockScreen isSetup={false} isNewUser={false} onLogin={p => void start(p, 'login')} onRegister={p => void start(p, 'register')} onReset={() => setError(null)} onTestBypass={local} errorMsg={error} isLoading={busy} />;
  return <Suspense fallback={<div className="workspace-loading"><span>IN MIND°</span><i /></div>}><MemoryWorkspace entries={entries} session={session} initialChat={initialChat} onLock={lock} onUpdate={update} onCreate={() => {
    const entry = createEntry(); change(all => [entry, ...all]); return entry.id;
  }} onDelete={id => change(all => all.map(e => e.id === id ? { ...e, deletedAt: Date.now(), updatedAt: Math.max(Date.now(), e.updatedAt + 1) } : e))} /></Suspense>;
}
