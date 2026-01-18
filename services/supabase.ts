import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Robust Environment Variable Loader
// Tries to find the value using various common prefixes (Vite, Next.js, CRA)
const getEnvVar = (baseKey: string): string => {
  const prefixes = ['', 'VITE_', 'NEXT_PUBLIC_', 'REACT_APP_'];
  
  // 1. Try import.meta.env (Vite / Modern Standards)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      for (const prefix of prefixes) {
        const key = `${prefix}${baseKey}`;
        // @ts-ignore
        if (import.meta.env[key]) return import.meta.env[key];
      }
    }
  } catch (e) {}

  // 2. Try process.env (Next.js / CRA / Node)
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

// Log configuration status (without revealing secrets) for debugging
// console.log(`Supabase Config Check: URL=${!!supabaseUrl}, Key=${!!supabaseKey}`);

export const isCloudConfigured = !!(supabaseUrl && supabaseKey);

let supabaseInstance: SupabaseClient;

// Only create the client if credentials exist to avoid "supabaseUrl is required" error
if (supabaseUrl && supabaseKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
} else {
  // Create a mock client that fails gracefully if credentials are missing
  console.warn('Supabase config missing. Cloud sync disabled.');
  
  const mockError = { message: 'Supabase not configured (Check Environment Variables)' };

  // Fully mocked client to prevent "is not a function" errors
  const mockClient = {
    from: (_table: string) => {
      // Chainable query builder mock
      const queryBuilder = {
        upsert: async () => ({ error: mockError }),
        insert: async () => ({ error: mockError }),
        select: (_cols: string) => {
           // Mock chain for select().eq().single() or await select().eq()
           const filterBuilder = {
             eq: (_col: string, _val: any) => filterBuilder,
             single: async () => ({ data: null, error: mockError }),
             then: (resolve: (val: any) => void) => {
                resolve({ data: null, error: mockError, count: 0 });
             }
           };
           return filterBuilder;
        }
      };
      return queryBuilder;
    },
    storage: {
      from: (_bucket: string) => ({
        upload: async () => ({ error: mockError }),
        getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } })
      })
    },
    channel: (_name: string) => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      unsubscribe: () => {},
      send: async () => ({})
    })
  };
  
  supabaseInstance = mockClient as unknown as SupabaseClient;
}

export const supabase = supabaseInstance;

// --- Ephemeral Chat Services (Broadcast Only) ---

export const subscribeToRoom = (
  roomId: string, 
  onMessage: (payload: any) => void
): RealtimeChannel => {
  if (!isCloudConfigured) {
    console.warn("Cannot subscribe: Supabase not configured");
    return { unsubscribe: () => {} } as unknown as RealtimeChannel;
  }

  const channel = supabase.channel(`room:${roomId}`, {
    config: {
      broadcast: { self: true } // Receive own messages to confirm sending
    }
  });

  channel
    .on(
      'broadcast',
      { event: 'chat' },
      ({ payload }) => onMessage(payload)
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // console.log(`Connected to room: ${roomId}`);
      }
    });

  return channel;
};

export const sendChatMessage = async (
  channel: RealtimeChannel, 
  message: any
) => {
  if (!channel || !isCloudConfigured) return;
  await channel.send({
    type: 'broadcast',
    event: 'chat',
    payload: message
  });
};