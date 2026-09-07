import React, { useState } from 'react';
import { LockScreen } from './components/LockScreen';
import { MemoryWorkspace } from './components/memory/MemoryWorkspace';
import { openJournal } from './services/journalSession';
import { JournalSync } from './services/syncEngine';
import { useJournal } from './hooks/useJournal';
import { createEntry } from './services/storage';

export default function App() {
  const [session, setSession] = useState<JournalSync | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { entries, change, update } = useJournal(session);
  const [initialChat] = useState(() => new URLSearchParams(location.search).has('room'));
  const start = async (pass: string, mode: 'login' | 'register' | 'local') => {
    if (busy) return;
    setBusy(true); setError(null);
    try { setSession(await openJournal(pass, mode)); }
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
  return <MemoryWorkspace entries={entries} session={session} initialChat={initialChat} onLock={lock} onUpdate={update} onCreate={() => {
    const entry = createEntry(); change(all => [entry, ...all]); return entry.id;
  }} onDelete={id => change(all => all.map(e => e.id === id ? { ...e, deletedAt: Date.now(), updatedAt: Math.max(Date.now(), e.updatedAt + 1) } : e))} />;
}
