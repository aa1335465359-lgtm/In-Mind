import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Helper to safely get environment variables
const getEnv = (key: string) => {
  // Try standard process.env (Next.js/CRA)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // Try import.meta.env (Vite) - strictly avoiding syntax error in non-module envs
  try {
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}
  
  return '';
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

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
        insert: async () => ({ error: mockError }), // Added insert
        select: (_cols: string) => {
           // Mock chain for select().eq().single() or await select().eq()
           const filterBuilder = {
             eq: (_col: string, _val: any) => filterBuilder,
             single: async () => ({ data: null, error: mockError }),
             // Make it thenable so it can be awaited directly like a Promise
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
  if (!channel) return;
  await channel.send({
    type: 'broadcast',
    event: 'chat',
    payload: message
  });
};