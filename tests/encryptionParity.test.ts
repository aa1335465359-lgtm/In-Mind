import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simpleEncrypt, simpleDecrypt, hashPasscode } from '../services/encryption';

// Byte-identical reference of the pre-optimization implementation (v2.1).
// The hot path was rewritten for speed; this file pins its output forever.
const legacyEncrypt = (text: string, pass: string): string => {
  const cleanPass = pass.trim();
  if (!cleanPass) return "";
  const safeText = encodeURIComponent(text);
  const textToChars = (t: string) => t.split("").map((c) => c.charCodeAt(0));
  const byteHex = (n: number) => ("0" + Number(n).toString(16)).substr(-2);
  const applySaltToChar = (code: number) => textToChars(cleanPass).reduce((a, b) => a ^ b, code);
  return safeText.split("").map(c => c.charCodeAt(0)).map(applySaltToChar).map(byteHex).join("");
};
const legacyDecrypt = (encoded: string, pass: string): string => {
  const cleanPass = pass.trim();
  if (!cleanPass) return "";
  const textToChars = (t: string) => t.split("").map((c) => c.charCodeAt(0));
  const applySaltToChar = (code: number) => textToChars(cleanPass).reduce((a, b) => a ^ b, code);
  const decryptedRaw = (encoded.match(/.{1,2}/g) || [])
    .map((hex) => parseInt(hex, 16))
    .map(applySaltToChar)
    .map((charCode) => String.fromCharCode(charCode))
    .join("");
  try { return decodeURIComponent(decryptedRaw); } catch { return decryptedRaw; }
};

const samples = [
  '', 'a', 'hello world',
  '刚写下的中文', '暗号与记忆星球，包含标点！？',
  'emoji 😀🇨🇳和家庭 👨‍👩‍👧‍👦 组合代理对',
  '<p>HTML with "quotes" & ampersands + plus = equals / slash</p>',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAg==',
  JSON.stringify({ nested: { array: [1, 2, 3], unicode: '年月日', bool: true } }),
  'control \u0000\u0001 chars and % percent %20 encoding',
  '长'.repeat(5000),
];
const passes = ['', ' ', 'x', 'Abc123!@#xyz', '中文暗号', '😀pass', 'a'.repeat(200)];

test('encrypt output stays byte-identical to the legacy implementation', () => {
  for (const text of samples) for (const pass of passes) {
    assert.equal(simpleEncrypt(text, pass), legacyEncrypt(text, pass), `text=${text.slice(0, 20)} pass=${pass.slice(0, 12)}`);
  }
});

test('decrypt output stays byte-identical, including corrupt and legacy payloads', () => {
  for (const text of samples) for (const pass of passes) {
    const cipher = legacyEncrypt(text, pass);
    assert.equal(simpleDecrypt(cipher, pass), legacyDecrypt(cipher, pass));
    // Round-trip only holds for a usable passcode: an empty one yields an empty cipher,
    // and a non-ASCII passcode folds a mask above 255 — a pre-existing v2.1 quirk
    // where the legacy code itself cannot restore the plain text. Both implementations
    // degrade identically; parity above is what must never change.
    if (pass.trim() && !/[^\x00-\x7F]/.test(pass)) assert.equal(simpleDecrypt(cipher, pass), text);
    assert.equal(simpleDecrypt(simpleEncrypt(text, pass), pass), legacyDecrypt(cipher, pass));
  }
  // Odd-length and non-hex cipher text must degrade exactly like before.
  for (const junk of ['z', 'abc', 'zz9', '0', 'f']) {
    assert.equal(simpleDecrypt(junk, 'Abc123!@#xyz'), legacyDecrypt(junk, 'Abc123!@#xyz'));
  }
  // Legacy payloads that were never URI-encoded still pass through the same fallback.
  const notUri = '%E4%B8%AD' + String.fromCharCode(0x4e2d);
  assert.equal(simpleDecrypt(legacyEncrypt('raw', 'p').slice(0, -2) + notUri.slice(0, 2), 'p'),
               legacyDecrypt(legacyEncrypt('raw', 'p').slice(0, -2) + notUri.slice(0, 2), 'p'));
});

test('empty passcode keeps returning empty cipher and empty plain text', () => {
  assert.equal(simpleEncrypt('任何内容', ''), '');
  assert.equal(simpleDecrypt('deadbeef', '  '), '');
});

test('hashPasscode stays a stable 64-char hex identity', async () => {
  assert.match(await hashPasscode('暗号'), /^[0-9a-f]{64}$/);
  assert.equal(await hashPasscode(' 暗号 '), await hashPasscode('暗号'));
  assert.equal(await hashPasscode(''), '');
});
