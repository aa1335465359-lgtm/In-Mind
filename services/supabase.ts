import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Robust Environment Variable Loader
const getEnvVar = (baseKey: string): string => {
  const prefixes = ['VITE_', 'NEXT_PUBLIC_', 'REACT_APP_', ''];
  
  // 1. Try import.meta.env (Vite / Modern Standards)
  try {
    // @ts-ignore
    const meta = typeof import.meta !== 'undefined' ? (import.meta as any) : null;
    if (meta && meta.env) {
      for (const prefix of prefixes) {
        const key = `${prefix}${baseKey}`;
        if (meta.env[key]) {
          return meta.env[key];
        }
      }
    }
  } catch (e) {}

  // 2. Try process.env (Next.js / Node / Webpack)
  try {
    if (typeof process !== 'undefined' && process.env) {
      for (const prefix of prefixes) {
        const key = `${prefix}${baseKey}`;
        if (process.env[key]) return process.env[key];
      }
    }
  } catch (e) {}

  return '';
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_ANON_KEY');

// --- DEBUGGING LOG (View in Browser Console F12) ---
if (typeof window !== 'undefined') {
  console.log(
    '%c[Supabase Config]', 
    'color: #00bcd4; font-weight: bold;',
    supabaseUrl ? '✅ URL Loaded' : '❌ URL Missing (Check VITE_SUPABASE_URL)',
    '|',
    supabaseKey ? '✅ Key Loaded' : '❌ Key Missing (Check VITE_SUPABASE_ANON_KEY)'
  );
}

export const isCloudConfigured = !!(supabaseUrl && supabaseKey);

let supabaseInstance: SupabaseClient;

// Ensure we don't pass empty strings to createClient, which might throw
if (supabaseUrl && supabaseKey) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
    // Fallback to mock below
  }
}

// @ts-ignore - Handle initialization failure case
if (!supabaseInstance) {
  // MOCK CLIENT (Fail Gracefully)
  if (typeof window !== 'undefined') {
      console.warn('Supabase config missing or invalid. Cloud functionality disabled.');
  }
  const mockError = { message: 'Supabase not configured. Check Console logs.' };
  
  const mockClient = {
    from: () => ({
      upsert: async () => ({ error: mockError }),
      insert: async () => ({ error: mockError }),
      select: () => ({
         eq: () => ({
           single: async () => ({ data: null, error: mockError }),
           then: (r: any) => r({ data: null, error: mockError, count: 0 })
         })
      })
    }),
    storage: {
      from: () => ({
        upload: async () => ({ error: mockError }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      unsubscribe: () => {},
      send: async () => ({})
    })
  };
  
  supabaseInstance = mockClient as unknown as SupabaseClient;
}

export const supabase = supabaseInstance;

// --- Ephemeral Chat Services ---

export const subscribeToRoom = (roomId: string, onMessage: (payload: any) => void): RealtimeChannel => {
  if (!isCloudConfigured) return { unsubscribe: () => {} } as unknown as RealtimeChannel;

  const channel = supabase.channel(`room:${roomId}`, {
    config: { broadcast: { self: true } }
  });

  channel
    .on('broadcast', { event: 'chat' }, ({ payload }) => onMessage(payload))
    .subscribe();

  return channel;
};

export const sendChatMessage = async (channel: RealtimeChannel, message: any) => {
  if (!channel || !isCloudConfigured) return;
  await channel.send({ type: 'broadcast', event: 'chat', payload: message });
};