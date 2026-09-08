// Cloud configuration is resolved at build time.
// REGRESSION NOTE: this module used to read the Vite env through a dynamic key
// indirection. Vite only substitutes literal `import.meta.env.VITE_*` member
// expressions, so the production build silently lost both variables while the
// dev server kept working — every user saw 云端未连接. All reads below must
// stay literal; the derivation itself is a pure function covered by tests.

export interface CloudEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

export const deriveCloudConfig = (env: CloudEnv) => {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() || undefined;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY?.trim() || undefined;
  return {
    supabaseUrl,
    supabaseKey,
    isCloudConfigured: Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')),
  };
};

const staticEnv: CloudEnv = {};
try {
  // Keep these two literal member expressions: they are exactly what Vite
  // replaces in production builds. Any indirection breaks the substitution.
  staticEnv.VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  staticEnv.VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
} catch { /* Non-Vite runtime (node tests): import.meta.env is undefined. */ }

try {
  // Server-side parity for the Express entry, without overriding Vite values.
  if (typeof process !== 'undefined' && process.env) {
    staticEnv.VITE_SUPABASE_URL = staticEnv.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    staticEnv.VITE_SUPABASE_ANON_KEY = staticEnv.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  }
} catch { /* process is unavailable in the browser. */ }

export const { supabaseUrl, supabaseKey, isCloudConfigured } = deriveCloudConfig(staticEnv);
