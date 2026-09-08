import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JournalSync, mergeEntries, type RemoteSnapshot, type SyncPort } from '../services/syncEngine';
import { simpleEncrypt, simpleDecrypt } from '../services/encryption';
import type { JournalEntry } from '../types';

const entry = (content = 'old', id = 'a', time = 1): JournalEntry => ({ id, content, createdAt: 1, updatedAt: time, tags: [] });
const clone = <T>(data: T): T => JSON.parse(JSON.stringify(data));
function backend(initial: JournalEntry[] = [entry()]) {
  let remote: RemoteSnapshot = { entries: clone(initial), revision: '1' };
  let version = 1, fail = false, collision = false;
  let saved: { entries: JournalEntry[]; base: JournalEntry[] | null } | null = null;
  const port: SyncPort = {
    async read() { if (fail) throw Error('network unavailable'); return clone(remote); },
    async compareAndSet(entries, revision) {
      if (fail) throw Error('network unavailable');
      if (collision) { collision = false; remote = { entries: [...(remote?.entries || []), entry('other device', 'b')], revision: String(++version) }; return false; }
      if ((remote?.revision ?? null) !== revision) return false;
      remote = { entries: clone(entries), revision: String(++version) }; return true;
    },
    persist(entries, base) { saved = clone({ entries, base }); }
  };
  return { port, getRemote: () => remote, getSaved: () => saved, fail: (value: boolean) => { fail = value; }, collide: () => { collision = true; } };
}
test('edits checkpoint synchronously before the debounce or a lock', () => {
  const b = backend(), s = new JournalSync(b.port, [entry()], [entry()]);
  s.change(() => [entry('刚写下的中文', 'a', 2)]);
  assert.equal(b.getSaved()?.entries[0].content, '刚写下的中文'); assert.equal(s.status, 'pending');
});
test('stale local data cannot overwrite remote when baseline is known', async () => {
  const b = backend([entry('new remote', 'a', 2)]), s = new JournalSync(b.port, [entry()], [entry()]);
  await s.flush(); assert.equal(s.entries[0].content, 'new remote');
});
test('offline edits survive failure, then sync on retry', async () => {
  const b = backend(), s = new JournalSync(b.port, [entry()], [entry()]);
  b.fail(true); s.change(() => [entry('offline draft', 'a', 3)]); await s.flush();
  assert.notEqual(s.status, 'synced'); assert.equal(b.getSaved()?.entries[0].content, 'offline draft');
  b.fail(false); await s.flush(); assert.equal(b.getRemote()?.entries[0].content, 'offline draft'); assert.equal(s.status, 'synced');
});
test('deleting the last entry persists a tombstone and does not resurrect it', async () => {
  const b = backend(), s = new JournalSync(b.port, [entry()], [entry()]);
  s.change(() => [{ ...entry(), deletedAt: 3, updatedAt: 3 }]); await s.flush();
  assert.equal(b.getRemote()?.entries.filter(e => !e.deletedAt).length, 0);
  const stale = new JournalSync(b.port, [entry()], [entry()]); await stale.flush();
  assert.equal(stale.entries.filter(e => !e.deletedAt).length, 0);
});
test('empty journals sync without an entries.length guard', async () => {
  const b = backend([]), s = new JournalSync(b.port, [], []); await s.flush(); assert.equal(s.status, 'synced'); assert.deepEqual(s.entries, []);
});
test('simultaneous conflicting edits preserve both versions', () => {
  const all = mergeEntries([entry()], [entry('local', 'a', 3)], [entry('remote', 'a', 2)]);
  assert.equal(all.length, 2); assert.ok(all.some(e => e.content === 'local')); assert.ok(all.some(e => e.content === 'remote'));
});
test('different field changes merge without duplicate copies', () => {
  const all = mergeEntries([entry()], [{ ...entry(), title: 'local title', updatedAt: 3 }], [entry('remote text', 'a', 2)]);
  assert.equal(all.length, 1); assert.equal(all[0].title, 'local title'); assert.equal(all[0].content, 'remote text');
});
test('CAS collision retries instead of losing a second device record', async () => {
  const b = backend(), s = new JournalSync(b.port, [entry('local', 'a', 3)], [entry()]); b.collide(); await s.flush();
  assert.equal(s.status, 'synced'); assert.equal(b.getRemote()?.entries.length, 2);
});
test('typing while network write is in flight is included in the next write', async () => {
  const b = backend(); const original = b.port.compareAndSet; let s: JournalSync; let first = true;
  b.port.compareAndSet = async (entries, revision) => { if (first) { first = false; s.change(() => [entry('typed during save', 'a', 4)]); } return original(entries, revision); };
  s = new JournalSync(b.port, [entry('first edit', 'a', 2)], [entry()]); await s.flush();
  assert.equal(b.getRemote()?.entries.length, 1); assert.equal(b.getRemote()?.entries[0].content, 'typed during save'); assert.equal(s.status, 'synced');
});
test('overlapping flush calls use one flight', async () => {
  const b = backend(), s = new JournalSync(b.port, [entry('new', 'a', 2)], [entry()]); let reads = 0;
  const original = b.port.read; b.port.read = async () => { reads++; return original(); };
  await Promise.all([s.flush(), s.flush(), s.flush()]); assert.equal(reads, 1);
});
test('storage quota errors stay visible and never claim local safety', () => {
  const b = backend(); b.port.persist = () => { throw Error('QuotaExceeded'); };
  const s = new JournalSync(b.port, [entry()], [entry()]); s.change(() => [entry('critical')]);
  assert.equal(s.status, 'local-error'); assert.equal(s.localSafe, false); assert.equal(s.entries[0].content, 'critical');
});
test('local experience never reads or writes the cloud', async () => {
  const b = backend(); b.port.read = async () => { throw Error('must not run'); }; b.port.compareAndSet = async () => { throw Error('must not run'); };
  const s = new JournalSync(b.port, [], null, true); s.change(() => [entry('local only')]); await s.flush(); assert.equal(s.status, 'local');
});
test('editing a concurrently deleted entry preserves a recovery copy', () => {
  const result = mergeEntries([entry()], [entry('changed', 'a', 5)], [{ ...entry(), deletedAt: 4, updatedAt: 4 }]);
  assert.equal(result.filter(e => !e.deletedAt).length, 1); assert.equal(result.find(e => !e.deletedAt)?.content, 'changed');
});
test('existing encryption roundtrips old arrays and new optional metadata', () => {
  const data = [{ ...entry('中文与旧日记 / emoji ☀️'), planet: { version: 1, seed: 99, palette: ['#121212'], material: 'resin' } }];
  assert.deepEqual(JSON.parse(simpleDecrypt(simpleEncrypt(JSON.stringify(data), 'Aa1234!'), 'Aa1234!')), data);
});
test('dirty encrypted checkpoint survives a new session', async () => {
  const b = backend(), first = new JournalSync(b.port, [entry()], [entry()]);
  first.change(() => [entry('unsent draft', 'a', 3)]);
  const checkpoint = b.getSaved()!; const reopened = new JournalSync(b.port, checkpoint.entries, checkpoint.base);
  await reopened.flush(); assert.equal(b.getRemote()?.entries[0].content, 'unsent draft');
});

test('a clean session skips redundant flushes, a forced flush still re-reads', async () => {
  const b = backend();
  let reads = 0; const port: SyncPort = { ...b.port, read: async () => { reads++; return b.port.read(); } };
  const clean = new JournalSync(port, [entry()], [entry()]);
  await clean.flush();
  assert.equal(reads, 1); // first flush after login always re-reads the remote state
  await clean.flush();
  assert.equal(reads, 1); // clean and fresh: periodic retries must not re-download the blob
  await clean.flush(true);
  assert.equal(reads, 2); // manual re-sync keeps its full refresh
  const s = new JournalSync(port, [entry()], [entry()]);
  s.change(() => [entry('edit', 'a', 2)]);
  await s.flush();
  assert.equal(s.status, 'synced');
  await s.flush(); // clean again right after the acknowledged write
  assert.equal(reads, 3); // one read for the push, none for the clean retry
});
