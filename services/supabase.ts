import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Helper to safely get environment variables
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return '';
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

let supabaseInstance: SupabaseClient;

// Only create the client if credentials exist to avoid "supabaseUrl is required" error
if (supabaseUrl && supabaseKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
} else {
  // Create a mock client that fails gracefully if credentials are missing
  // This allows the app to run in local-only mode without crashing
  console.warn('Supabase config missing. Cloud sync disabled.');
  supabaseInstance = {
    from: (_table: string) => ({
      upsert: async () => ({ error: { message: 'Supabase not configured' } }),
      select: (_cols: string) => ({
        eq: (_col: string, _val: any) => ({
          single: async () => ({ data: null, error: { message: 'Supabase not configured' } })
        })
      })
    })
  } as unknown as SupabaseClient;
}

export const supabase = supabaseInstance;
