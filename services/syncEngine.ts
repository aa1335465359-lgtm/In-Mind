import type { JournalEntry } from '../types';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline' | 'error' | 'local' | 'local-error';
export type RemoteSnapshot = { entries: JournalEntry[]; revision: string } | null;
export interface SyncPort {
  read(): Promise<RemoteSnapshot>;
  compareAndSet(entries: JournalEntry[], revision: string | null): Promise<boolean>;
  persist(entries: JournalEntry[], base: JournalEntry[] | null): void;
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fields = (e?: JournalEntry) => e && Object.fromEntries(Object.entries(e).filter(([k]) => !['updatedAt', 'isGeneratingMemory'].includes(k)));

// Three-way merge: unchanged stale entries never replace newer remote entries.
// Concurrent changes to the same field preserve the local version as a recovery copy.
export function mergeEntries(base: JournalEntry[] | null, local: JournalEntry[], remote: JournalEntry[]): JournalEntry[] {
  const b = new Map((base ?? []).map(e => [e.id, e]));
  const l = new Map(local.map(e => [e.id, e]));
  const r = new Map(remote.map(e => [e.id, e]));
  const result: JournalEntry[] = [];
  for (const id of new Set([...l.keys(), ...r.keys()])) {
    const left = l.get(id), right = r.get(id), old = b.get(id);
    if (!left) { if (right) result.push(right); continue; }
    if (!right) { result.push(left); continue; }
    if (equal(fields(left), fields(right))) { result.push(left.updatedAt >= right.updatedAt ? left : right); continue; }
    if (old && equal(fields(left), fields(old))) { result.push(right); continue; }
    if (old && equal(fields(right), fields(old))) { result.push(left); continue; }
    // Deleting and editing the same entry on separate devices must not destroy the edit.
    if (left.deletedAt || right.deletedAt) {
      const deleted = left.deletedAt ? left : right;
      const alive = left.deletedAt ? right : left;
      result.push(deleted);
      if (!alive.deletedAt) result.push({ ...alive, id: `${id}-recovered-${alive.updatedAt}`, title: `${alive.title || '未命名回忆'} · 恢复副本`, deletedAt: undefined });
      continue;
    }
    const merged: JournalEntry = { ...right, updatedAt: Math.max(left.updatedAt, right.updatedAt) };
    let conflict = false;
    for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
      if (['id', 'updatedAt', 'isGeneratingMemory'].includes(key)) continue;
      const k = key as keyof JournalEntry;
      const lc = !old || !equal(left[k], old[k]);
      const rc = !old || !equal(right[k], old[k]);
      if (lc && !rc) Object.assign(merged, { [key]: left[k] });
      else if (lc && rc && !equal(left[k], right[k])) conflict = true;
    }
    result.push(merged);
    if (conflict) result.push({ ...left, id: `${id}-recovered-${left.updatedAt}`, title: `${left.title || '未命名回忆'} · 恢复副本` });
  }
  return [...new Map(result.map(e => [e.id, e])).values()].sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}

export class JournalSync {
  entries: JournalEntry[];
  base: JournalEntry[] | null;
  status: SyncStatus;
  error = '';
  localSafe = true;
  private generation = 0;
  // Perf: a clean session that synced recently has nothing to push or pull, so
  // periodic focus/interval flushes skip the full remote read instead of
  // re-downloading the whole journal blob. Cross-device updates still land within
  // the freshness window; a forced flush always re-reads.
  private dirty: boolean;
  private lastFull = 0;
  private flight: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  constructor(private port: SyncPort, entries: JournalEntry[], base: JournalEntry[] | null, readonly localOnly = false) {
    this.entries = entries; this.base = base;
    this.status = localOnly ? 'local' : equal(entries, base) ? 'synced' : 'pending';
    this.dirty = this.status !== 'synced';
  }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach(fn => fn()); }
  private persist() {
    try { this.port.persist(this.entries, this.base); this.localSafe = true; }
    catch { this.localSafe = false; this.status = 'local-error'; this.error = '本机空间不足或存储不可用。请先导出备份，不要关闭页面。'; }
  }
  change(fn: (entries: JournalEntry[]) => JournalEntry[]) {
    this.entries = fn(this.entries); this.generation++; this.dirty = true;
    this.error = ''; this.status = this.localOnly ? 'local' : 'pending';
    // Synchronous encrypted checkpoint: never debounce the durable local copy.
    this.persist(); this.emit();
  }
  flush(force = false): Promise<void> {
    if (this.flight) return this.flight;
    if (this.localOnly) { this.status = 'local'; this.error = ''; this.persist(); this.emit(); return Promise.resolve(); }
    // Skip only when provably clean AND fresh; staleness still re-reads for other devices.
    if (!force && !this.dirty && this.status === 'synced' && Date.now() - this.lastFull < 300000) return Promise.resolve();
    this.flight = this.synchronize().finally(() => { this.flight = null; });
    return this.flight;
  }
  private async synchronize() {
    this.status = 'syncing'; this.error = ''; this.emit();
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const remote = await this.port.read();
        // Capture after the read: typing while reading must participate in this write.
        const generation = this.generation;
        const localBeforeWrite = this.entries;
        const submitted = mergeEntries(this.base, this.entries, remote?.entries ?? []);
        if (remote && equal(submitted, remote.entries)) {
          this.entries = submitted; this.base = submitted;
          this.status = 'synced'; this.dirty = false; this.lastFull = Date.now();
          this.persist(); this.emit(); return;
        }
        if (!await this.port.compareAndSet(submitted, remote?.revision ?? null)) continue;
        const changedDuringWrite = generation !== this.generation;
        this.entries = changedDuringWrite ? mergeEntries(localBeforeWrite, this.entries, submitted) : submitted;
        this.base = submitted;
        this.status = changedDuringWrite ? 'pending' : 'synced';
        if (!changedDuringWrite) { this.dirty = false; this.lastFull = Date.now(); }
        this.persist(); this.emit();
        if (!changedDuringWrite) return;
      }
      this.status = 'pending'; this.error = '仍有更改等待同步，将自动重试。'; this.emit();
    } catch (e) {
      this.status = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error';
      this.error = e instanceof Error ? e.message : '云端同步失败';
      this.persist(); this.emit();
    }
  }
}
