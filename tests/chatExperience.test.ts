import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { anonymousNameCount, createAnonymousName, senderHue } from '../services/chatIdentity';
import { EPHEMERAL_LIFETIME_MS, createEphemeralExpiry, ephemeralExpired, ephemeralRemaining } from '../services/ephemeralMessage';

test('anonymous names combine absurd traits, characters and a numeric suffix', () => {
  const values = [0, 0, 0, .999, .999, .999]; let index = 0;
  assert.equal(createAnonymousName(() => values[index++]), '爱吃鸡蛋的捣蛋鬼1');
  assert.match(createAnonymousName(() => values[index++]), /999$/);
  assert.ok(anonymousNameCount > 1_000_000);
  assert.notEqual(senderHue('visitor-a'), senderHue('visitor-b'));
});

test('ephemeral countdown begins when sent and expires after 60 seconds', () => {
  const sentAt = 1_000_000;
  const expiresAt = createEphemeralExpiry(sentAt);
  assert.equal(EPHEMERAL_LIFETIME_MS, 60_000);
  assert.equal(expiresAt, sentAt + 60_000);
  assert.equal(ephemeralRemaining(expiresAt, sentAt), 60);
  assert.equal(ephemeralRemaining(expiresAt, sentAt + 30_001), 30);
  assert.equal(ephemeralExpired(expiresAt, sentAt + 59_999), false);
  assert.equal(ephemeralExpired(expiresAt, sentAt + 60_000), true);
});

test('chat layout keeps the composer outside the only scrolling region', () => {
  const component = readFileSync(new URL('../components/ChatRoom.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
  assert.match(component, /className="chat-feed"/);
  assert.match(component, /className=\{`chat-composer/);
  assert.match(component, /发送后开始计时，60 秒后自动消失/);
  assert.doesNotMatch(component, /setOpenedAt|点击打开/);
  assert.match(css, /\.radio-content\s*\{[^}]*grid-template-rows:\s*72px minmax\(0, 1fr\) auto/s);
  assert.match(css, /\.chat-feed\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.chat-scroll\s*\{[^}]*overflow-y:\s*auto/s);
});
