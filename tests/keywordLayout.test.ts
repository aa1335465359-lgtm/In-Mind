import test from 'node:test';
import assert from 'node:assert/strict';
import { keywordsOf, type WeightedKeyword } from '../services/memoryArt';
import { typographyCanvas } from '../components/memory/memoryField';
import type { JournalEntry } from '../types';

const entry = (content: string): JournalEntry => ({
  id: 'frequency-test',
  title: 'Night Walk',
  content,
  tags: ['city'],
  images: [],
  createdAt: 1,
  updatedAt: 1,
});

test('repeated words receive more weight and ASCII variants collapse together', () => {
  const Parser = globalThis.DOMParser;
  Object.assign(globalThis, { DOMParser: class { parseFromString(html: string) { return { body: { textContent: html.replace(/<[^>]+>/g, ' ') } }; } } });
  try {
    const words = keywordsOf(entry('<p>Orbit orbit ORBIT orbit; quiet quiet; window.</p>'));
    const orbit = words.find(word => word.text === 'orbit');
    const quiet = words.find(word => word.text === 'quiet');
    assert.ok(orbit && quiet);
    assert.ok(orbit.weight > quiet.weight);
    assert.equal(words.filter(word => word.text === 'orbit').length, 1);
  } finally {
    Object.assign(globalThis, { DOMParser: Parser });
  }
});

test('a long journal keeps keywords, phrases and complete original sentences', () => {
  const Parser = globalThis.DOMParser;
  Object.assign(globalThis, { DOMParser: class { parseFromString(html: string) { return { body: { textContent: html.replace(/<[^>]+>/g, ' ') } }; } } });
  try {
    const fragments = keywordsOf(entry('<p>下班以后我沿着江边慢慢走，风把便利店的塑料袋吹到了树上。路灯映在水里，我突然想起去年也是这样的晚上。回家以前，我买了一杯已经不冰的柠檬茶。</p>'));
    assert.ok(fragments.some(item => item.role === 'keyword'));
    assert.ok(fragments.some(item => item.role === 'phrase'));
    assert.ok(fragments.some(item => item.role === 'sentence' && item.text.includes('路灯映在水里')));
    assert.ok(fragments.length >= 12);
  } finally {
    Object.assign(globalThis, { DOMParser: Parser });
  }
});

test('typography packing draws higher-weight words larger in deterministic order', () => {
  const draws: Array<{ text: string; size: number; x: number; y: number }> = [];
  const context = {
    font: '', textAlign: '', textBaseline: '', fillStyle: '', strokeStyle: '', lineWidth: 0,
    measureText(text: string) {
      const size = Number.parseFloat(this.font.match(/[\d.]+px/)?.[0] || '16');
      return { width: text.length * size * .56 };
    },
    fillText(text: string, x: number, y: number) {
      draws.push({ text, size: Number.parseFloat(this.font.match(/[\d.]+px/)?.[0] || '16'), x, y });
    },
    strokeText() {},
  };
  const fakeDocument = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  const previous = globalThis.document;
  Object.assign(globalThis, { document: fakeDocument });
  try {
    const input: WeightedKeyword[] = [
      { text: 'orbit', weight: 12 },
      { text: 'quiet', weight: 5 },
      { text: 'window', weight: 2 },
    ];
    typographyCanvas(input, 33);
    assert.deepEqual(draws.map(item => item.text), input.map(item => item.text));
    assert.ok(draws[0].size > draws[1].size && draws[1].size > draws[2].size);
    const firstRun = structuredClone(draws);
    draws.length = 0;
    typographyCanvas(input, 33);
    assert.deepEqual(draws, firstRun);
  } finally {
    Object.assign(globalThis, { document: previous });
  }
});

test('dense typography keeps a long entry distributed across the full composition', () => {
  const draws: Array<{ text: string; x: number; y: number }> = [];
  const context = {
    font: '', textAlign: '', textBaseline: '', fillStyle: '', strokeStyle: '', lineWidth: 0,
    measureText(text: string) {
      const size = Number.parseFloat(this.font.match(/[\d.]+px/)?.[0] || '16');
      return { width: text.length * size * .5 };
    },
    fillText(text: string, x: number, y: number) { draws.push({ text, x, y }); },
    strokeText() {},
  };
  const previous = globalThis.document;
  Object.assign(globalThis, { document: { createElement: () => ({ width: 0, height: 0, getContext: () => context }) } });
  try {
    const input: WeightedKeyword[] = Array.from({ length: 48 }, (_, index) => ({
      text: `memory${index}`,
      weight: 50 - index,
      role: index < 18 ? 'keyword' : index < 34 ? 'phrase' : 'sentence',
    }));
    typographyCanvas(input, 91);
    const unique = new Set(draws.map(item => item.text));
    assert.ok(unique.size >= 34, `expected at least 34 fragments, received ${unique.size}`);
    assert.ok(Math.max(...draws.map(item => item.x)) - Math.min(...draws.map(item => item.x)) > 650);
    assert.ok(Math.max(...draws.map(item => item.y)) - Math.min(...draws.map(item => item.y)) > 650);
  } finally {
    Object.assign(globalThis, { document: previous });
  }
});
