import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deriveCloudConfig, isCloudConfigured, supabaseUrl, supabaseKey } from '../services/cloudConfig';

test('a fully injected production env configures the cloud', () => {
  const cfg = deriveCloudConfig({ VITE_SUPABASE_URL: 'https://demo.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon-key' });
  assert.equal(cfg.isCloudConfigured, true);
  assert.equal(cfg.supabaseUrl, 'https://demo.supabase.co');
  assert.equal(cfg.supabaseKey, 'anon-key');
});

test('missing key, non-http url or empty values keep the cloud off', () => {
  assert.equal(deriveCloudConfig({ VITE_SUPABASE_URL: 'https://demo.supabase.co' }).isCloudConfigured, false);
  assert.equal(deriveCloudConfig({ VITE_SUPABASE_ANON_KEY: 'anon-key' }).isCloudConfigured, false);
  assert.equal(deriveCloudConfig({ VITE_SUPABASE_URL: 'ftp://demo.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon-key' }).isCloudConfigured, false);
  assert.equal(deriveCloudConfig({ VITE_SUPABASE_URL: '   ', VITE_SUPABASE_ANON_KEY: 'anon-key' }).isCloudConfigured, false);
});

test('whitespace-only padding is trimmed before validation', () => {
  const cfg = deriveCloudConfig({ VITE_SUPABASE_URL: '  https://demo.supabase.co  ', VITE_SUPABASE_ANON_KEY: ' anon-key ' });
  assert.equal(cfg.isCloudConfigured, true);
  assert.equal(cfg.supabaseUrl, 'https://demo.supabase.co');
  assert.equal(cfg.supabaseKey, 'anon-key');
});

test('importing the module outside Vite stays safe and unconfigured', () => {
  // node tests have no import.meta.env: the module must not throw and must
  // report an unconfigured cloud instead of a half-configured client.
  assert.equal(isCloudConfigured, false);
  assert.equal(supabaseUrl, undefined);
  assert.equal(supabaseKey, undefined);
});

test('the config reads stay literal — no dynamic env key access', () => {
  // Source contract: Vite only replaces literal member expressions, so any
  // dynamic `env[key]` reading regresses production to 云端未连接.
  const source = readFileSync(new URL('../services/cloudConfig.ts', import.meta.url), 'utf8');
  assert.ok(source.includes('import.meta.env.VITE_SUPABASE_URL'));
  assert.ok(source.includes('import.meta.env.VITE_SUPABASE_ANON_KEY'));
  assert.ok(!/\bmeta\.env\[/.test(source));
});
