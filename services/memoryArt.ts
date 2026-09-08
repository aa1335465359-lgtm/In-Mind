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

export interface WeightedKeyword { text: string; weight: number; }

/**
 * Keep the evidence behind every word. The old implementation sorted by frequency and then
 * discarded the score, so the renderer could only make the first three words large. Body
 * repetition now drives the result; titles, tags and AI hints only provide a small signal.
 */
export function keywordsOf(entry?: JournalEntry, limit = 42): WeightedKeyword[] {
  if (!entry) return [
    { text: '此刻', weight: 5 }, { text: '未完成', weight: 3.6 },
    { text: '记忆', weight: 2.8 }, { text: '时间', weight: 2.2 },
  ];
  const weighted = new Map<string, number>();
  const add = (word: string, weight: number) => {
    const clean = word.trim().replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, '');
    if (clean.length < 2 || clean.length > 12 || STOP_WORDS.has(clean)) return;
    weighted.set(clean, (weighted.get(clean) || 0) + weight);
  };
  entry.memoryResult?.keywords.forEach((word, index) => add(word, 1.6 - Math.min(index, 6) * .1));
  entry.tags.forEach(word => add(word, 2.2));
  if (entry.title) add(entry.title, 2.6);
  const text = `${entry.title || ''}。${textOf(entry.content)}`.slice(0, 12000);
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
  const result = [...weighted]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([text, weight]) => ({ text, weight }));
  if (result.length) return result;
  return entry.userMood ? [{ text: entry.userMood, weight: 2 }] : [];
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
