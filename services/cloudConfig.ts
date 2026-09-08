const getEnv = (key: string): string | undefined => {
  try {
    const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
    if (meta.env) return meta.env[key];
  } catch { /* Vite env is unavailable in non-browser tests. */ }

  try {
    if (typeof process !== 'undefined' && process.env) return process.env[key];
  } catch { /* process is unavailable in the browser. */ }

  return undefined;
};

export const supabaseUrl = getEnv('VITE_SUPABASE_URL');
export const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');
export const isCloudConfigured = Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('http'));
