import DOMPurify from 'dompurify';
import type { JournalEntry } from '../types';

export const PALETTE = ['#e5ef70', '#ed8eaa', '#5168cf'];
export function textOf(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').trim();
}
export function cleanHtml(html: string) {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe'], FORBID_ATTR: ['style', 'id'], ADD_DATA_URI_TAGS: ['img'] });
}
export function imageOf(entry: JournalEntry) {
  const candidate = entry.planet?.cover || entry.images?.[0] || new DOMParser().parseFromString(entry.content, 'text/html').querySelector('img')?.getAttribute('src');
  return candidate && /^(https?:|data:image\/)/i.test(candidate) ? candidate : undefined;
}
export function titleOf(entry: JournalEntry) { return entry.title || textOf(entry.content).slice(0, 22) || '还没命名的这一天'; }
export function seedOf(id: string) { return [...id].reduce((n, c) => ((n * 31 + c.charCodeAt(0)) >>> 0), 7); }

const STOP_WORDS = new Set([
  '今天', '昨天', '然后', '因为', '所以', '一个', '一些', '这个', '那个', '什么', '感觉', '觉得', '就是', '还是',
  '可以', '可能', '没有', '自己', '我们', '你们', '他们', '一直', '已经', '非常', '真的', '这样', '那样', '的', '了', '是', '我', '也', '都', '在',
]);

export type TypographyRole = 'keyword' | 'phrase' | 'sentence';
export interface WeightedKeyword { text: string; weight: number; role?: TypographyRole; }

/**
 * Keep the evidence behind every word. The old implementation sorted by frequency and then
 * discarded the score, so the renderer could only make the first three words large. Body
 * repetition now drives the result; titles, tags and AI hints only provide a small signal.
 */
export function keywordsOf(entry?: JournalEntry, limit = 68): WeightedKeyword[] {
  if (!entry) return [
    { text: '此刻', weight: 5, role: 'keyword' }, { text: '还没有写下什么', weight: 2.8, role: 'phrase' },
    { text: '记忆会在这里慢慢形成。', weight: 1.8, role: 'sentence' },
    { text: '未完成', weight: 3.6, role: 'keyword' }, { text: '时间', weight: 2.2, role: 'keyword' },
  ];
  const weighted = new Map<string, WeightedKeyword>();
  const add = (word: string, weight: number, role: TypographyRole = 'keyword') => {
    const clean = word.trim().replace(/\s+/g, ' ').normalize('NFKC')
      .replace(/^[\p{P}\p{S}\s]+/gu, '')
      .replace(role === 'sentence' ? /[\s]+$/gu : /[\p{P}\p{S}\s]+$/gu, '');
    const key = /^[\x00-\x7F]+$/.test(clean) ? clean.toLocaleLowerCase('en') : clean;
    const display = /^[\x00-\x7F]+$/.test(clean) ? key : clean;
    const maxLength = role === 'sentence' ? 52 : role === 'phrase' ? 20 : 12;
    if (key.length < 2 || key.length > maxLength || (role === 'keyword' && STOP_WORDS.has(key))) return;
    const current = weighted.get(key);
    if (current) {
      current.weight += weight;
      if (role !== 'keyword') current.role = role;
    } else weighted.set(key, { text: display, weight, role });
  };
  entry.memoryResult?.keywords.forEach((word, index) => add(word, 1.8 - Math.min(index, 6) * .1));
  entry.tags.forEach(word => add(word, 2.2));
  if (entry.title) add(entry.title, 3.2, entry.title.length > 8 ? 'phrase' : 'keyword');
  const prose = textOf(entry.content).replace(/\s+/g, ' ').trim().slice(0, 12000);
  const text = `${entry.title || ''}。${prose}`;

  // Preserve the writer's voice. Sentences and clauses provide readable middle and fine
  // detail instead of reducing a long entry to three isolated tags.
  const sentences = prose.match(/[^。！？!?；;]+[。！？!?；;]?/gu) || [];
  sentences.slice(0, 24).forEach((sentence, index) => {
    const clean = sentence.trim();
    if (clean.length >= 7) add(clean, 1.65 - Math.min(index, 12) * .025, 'sentence');
    clean.split(/[，,、：:—]/u).map(clause => clause.trim()).filter(clause => clause.length >= 4 && clause.length <= 20)
      .slice(0, 3).forEach((clause, clauseIndex) => add(clause, 1.35 - clauseIndex * .08, 'phrase'));
  });
  try {
    const Segmenter = (Intl as unknown as { Segmenter?: new (locale: string, options: { granularity: 'word' }) => { segment: (input: string) => Iterable<{ segment: string; isWordLike?: boolean }> } }).Segmenter;
    if (Segmenter) {
      for (const part of new Segmenter('zh-CN', { granularity: 'word' }).segment(text)) {
        if (part.isWordLike) add(part.segment, 1);
      }
    } else text.match(/[\p{Script=Han}]{2,6}|[A-Za-z][A-Za-z0-9-]{2,}/gu)?.forEach(word => add(word, 1));
  } catch {
    text.match(/[\p{Script=Han}]{2,6}|[A-Za-z][A-Za-z0-9-]{2,}/gu)?.forEach(word => add(word, 1));
  }
  // Some Segmenter implementations omit isWordLike for Latin runs under a Chinese locale.
  // Keep an explicit Latin pass so repeated names and English words still become anchors.
  text.match(/[A-Za-z][A-Za-z0-9-]{2,}/g)?.forEach(word => add(word, 1));
  const values = [...weighted.values()];
  const byWeight = (a: WeightedKeyword, b: WeightedKeyword) => b.weight - a.weight || a.text.localeCompare(b.text);
  const keywords = values.filter(item => item.role === 'keyword').sort(byWeight);
  const phrases = values.filter(item => item.role === 'phrase').sort(byWeight);
  const fullSentences = values.filter(item => item.role === 'sentence').sort(byWeight);
  // Reserve space for every scale of reading. A rich article must retain full sentences even
  // when it contains many unique keywords.
  const result = [
    ...keywords.slice(0, Math.min(26, limit)),
    ...phrases.slice(0, Math.min(24, Math.max(0, limit - 12))),
    ...fullSentences.slice(0, Math.min(18, Math.max(0, limit - 20))),
  ].slice(0, limit);
  if (result.length) return result;
  return entry.userMood ? [{ text: entry.userMood, weight: 2, role: 'keyword' }] : [];
}
export async function paletteOf(file: File): Promise<string[]> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas'); canvas.width = 40; canvas.height = 40;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0, 40, 40);
    const bins = new Map<string, { count: number; r: number; g: number; b: number }>();
    const pixels = ctx.getImageData(0, 0, 40, 40).data;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 128) continue;
      const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
      if (Math.max(r, g, b) < 25 || Math.min(r, g, b) > 235) continue;
      const key = `${r >> 5},${g >> 5},${b >> 5}`;
      const item = bins.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      item.count++; item.r += r; item.g += g; item.b += b; bins.set(key, item);
    }
    const selected: number[][] = [];
    for (const item of [...bins.values()].sort((a, b) => b.count - a.count)) {
      const rgb = [item.r, item.g, item.b].map(v => Math.round(v / item.count));
      if (selected.every(other => rgb.reduce((sum, v, i) => sum + (v - other[i]) ** 2, 0) > 5000)) selected.push(rgb);
      if (selected.length === 3) break;
    }
    return [...selected.map(rgb => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('')), ...PALETTE].slice(0, 3);
  } finally { bitmap.close(); }
}
