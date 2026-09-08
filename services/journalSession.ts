import { JournalEntry } from '../types';
import { hashPasscode, simpleDecrypt, simpleEncrypt } from './encryption';
import { isCloudConfigured } from './cloudConfig';
import { JournalSync, SyncPort } from './syncEngine';

function parseEntries(encrypted: string, pass: string): JournalEntry[] {
  const parsed: unknown = JSON.parse(simpleDecrypt(encrypted, pass));
  if (!Array.isArray(parsed) || !parsed.every(e => e && typeof e.id === 'string' && typeof e.content === 'string' && Number.isFinite(e.createdAt))) throw new Error('记录格式无法读取，请保留备份。');
  return parsed.map(e => {
    const { isGeneratingMemory, ...record } = e;
    return { ...record, tags: Array.isArray(e.tags) ? e.tags : [], updatedAt: e.updatedAt || e.createdAt };
  });
}
function encrypt(entries: JournalEntry[], pass: string) {
  const result = simpleEncrypt(JSON.stringify(entries), pass);
  if (!result) throw new Error('无法生成本地备份');
  return result;
}
function explain(error: { message?: string; code?: string }) {
  if (error.code === '42501' || /row.level|permission/i.test(error.message || '')) return new Error('Supabase 拒绝读写：请检查 encrypted_journals 表权限。本机内容已保留。');
  return new Error(error.message || '云端暂时不可用，本机内容已保留。');
}
export async function openJournal(pass: string, mode: 'login' | 'register' | 'local') {
  const hash = await hashPasscode(pass);
  const key = `ht_sync_${hash}`;
  const port: SyncPort = {
    async read() {
      if (!isCloudConfigured) throw new Error('云端未连接。本机内容会保留，连接恢复后可重试。');
      const { supabase } = await import('./supabase');
      const { data, error } = await supabase.from('encrypted_journals').select('data,updated_at').eq('id', hash).abortSignal(AbortSignal.timeout(12000)).maybeSingle();
      if (error) throw explain(error);
      return data ? { entries: parseEntries(data.data, pass), revision: data.updated_at } : null;
    },
    async compareAndSet(entries, revision) {
      const { supabase } = await import('./supabase');
      const payload = { id: hash, data: encrypt(entries, pass), updated_at: new Date(Math.max(Date.now(), revision ? Date.parse(revision) + 1 : 0)).toISOString() };
      if (!revision) {
        const { error } = await supabase.from('encrypted_journals').insert(payload).abortSignal(AbortSignal.timeout(12000));
        if (error?.code === '23505') return false;
        if (error) throw explain(error);
        return true;
      }
      const { data, error } = await supabase.from('encrypted_journals').update(payload).eq('id', hash).eq('updated_at', revision).select('id').abortSignal(AbortSignal.timeout(12000));
      if (error) throw explain(error);
      return !!data?.length;
    },
    persist(entries, base) {
      // Data + baseline in one atomic encrypted checkpoint; preserve legacy backup.
      localStorage.setItem(key, JSON.stringify({ version: 1, data: encrypt(entries, pass), base: base ? encrypt(base, pass) : null }));
    }
  };
  let entries: JournalEntry[] | null = null, base: JournalEntry[] | null = null;
  const cached = localStorage.getItem(key);
  if (cached) {
    const checkpoint = JSON.parse(cached);
    entries = parseEntries(checkpoint.data, pass);
    base = checkpoint.base ? parseEntries(checkpoint.base, pass) : null;
  } else {
    const legacy = localStorage.getItem(`ht_data_${hash}`) || localStorage.getItem('ht_data_enc');
    if (legacy) { try { entries = parseEntries(legacy, pass); } catch { /* old shared slot may belong to another account */ } }
  }
  if (mode === 'register') {
    if (!isCloudConfigured) throw new Error('云端未连接，暂时无法注册。可以先进入本机体验。');
    // Never poison a local account when remote registration fails.
    if (!await port.compareAndSet([], null)) throw new Error('这个暗号已被使用，请换一个。');
    entries = []; base = [];
  } else if (entries === null && mode !== 'local') {
    const remote = await port.read();
    if (!remote) throw new Error('没有找到这个暗号对应的记录。请检查暗号，或创建新的空间。');
    entries = remote.entries; base = remote.entries;
  }
  const session = new JournalSync(port, entries ?? [], base, mode === 'local');
  port.persist(session.entries, session.base);
  if (mode !== 'local') localStorage.setItem('ht_pass_hash', hash);
  return session;
}
