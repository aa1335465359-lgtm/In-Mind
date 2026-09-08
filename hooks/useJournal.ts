import { useCallback, useEffect, useRef, useState } from 'react';
import { JournalEntry } from '../types';
import { JournalSync } from '../services/syncEngine';

export function useJournal(session: JournalSync | null) {
  const [, redraw] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!session) return;
    const unsubscribe = session.subscribe(() => redraw(n => n + 1));
    // Perf: clean-and-fresh sessions skip the network inside flush(); only login
    // forces a full re-read, everything else rides the freshness window.
    const retry = () => { void session.flush(); };
    const forceRetry = () => { void session.flush(true); };
    const visible = () => { if (document.visibilityState === 'visible') retry(); };
    const warn = (e: BeforeUnloadEvent) => { if (!session.localSafe) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('online', forceRetry); window.addEventListener('focus', retry);
    window.addEventListener('beforeunload', warn); window.addEventListener('pagehide', retry);
    document.addEventListener('visibilitychange', visible);
    const interval = setInterval(() => { if (session.status !== 'local' && document.visibilityState === 'visible') retry(); }, 30000);
    forceRetry();
    return () => {
      unsubscribe(); clearTimeout(timer.current); clearInterval(interval);
      window.removeEventListener('online', forceRetry); window.removeEventListener('focus', retry);
      window.removeEventListener('beforeunload', warn); window.removeEventListener('pagehide', retry);
      document.removeEventListener('visibilitychange', visible);
      if (session.status !== 'synced' && session.status !== 'local') void session.flush();
    };
  }, [session]);
  const change = useCallback((fn: (entries: JournalEntry[]) => JournalEntry[]) => {
    if (!session) return;
    session.change(fn);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { void session.flush(); }, 750);
  }, [session]);
  const update = useCallback((id: string, patch: Partial<JournalEntry>) => {
    change(entries => entries.map(e => e.id === id && !e.deletedAt ? { ...e, ...patch, updatedAt: Math.max(Date.now(), e.updatedAt + 1) } : e));
  }, [change]);
  return { entries: session?.entries.filter(e => !e.deletedAt) ?? [], change, update };
}
