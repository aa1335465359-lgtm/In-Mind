import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Robust Environment Variable Loader
const getEnvVar = (baseKey: string): string => {
  // Priority:
  // 1. VITE_ (Standard for Vite)
  // 2. NEXT_PUBLIC_ (Standard for Next.js - likely ignored by Vite build but kept for compat)
  // 3. REACT_APP_ (Standard for CRA)
  
  const prefixes = ['VITE_', 'NEXT_PUBLIC_', 'REACT_APP_', ''];
  
  // 1. Try import.meta.env (Vite / Modern Standards)
  try {
    const meta = import.meta as any;
    if (typeof meta !== 'undefined' && meta.env) {
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
  
  // If missing, print hint
  if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ Vite projects requires variables to start with 'VITE_'. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.");
  }
}

export const isCloudConfigured = !!(supabaseUrl && supabaseKey);

let supabaseInstance: SupabaseClient;

if (supabaseUrl && supabaseKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
} else {
  // MOCK CLIENT (Fail Gracefully)
  console.warn('Supabase config missing. Cloud functionality disabled.');
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