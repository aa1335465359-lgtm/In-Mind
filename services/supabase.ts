
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// 1. 安全读取环境变量
const getEnv = (key: string): string | undefined => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {}

  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

export const isCloudConfigured = !!(supabaseUrl && supabaseKey && supabaseUrl.startsWith('http'));

let supabaseInstance: SupabaseClient;

if (isCloudConfigured && supabaseUrl && supabaseKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
} else {
  // 熔断处理
  const errorResponse = { 
    data: null, 
    error: { 
      message: '系统配置错误：环境变量丢失',
      code: 'CONFIG_MISSING'
    } 
  };
  const fatalError = async () => errorResponse;
  supabaseInstance = {
    from: () => ({
      insert: fatalError,
      upsert: fatalError,
      select: () => ({ 
        eq: () => ({ single: fatalError }),
        order: () => ({ limit: fatalError })
      })
    }),
    storage: { 
      from: () => ({ 
        upload: fatalError,
        getPublicUrl: () => ({ data: { publicUrl: null } })
      }) 
    },
    channel: () => ({ 
        on: () => ({ subscribe: () => {} }), 
        subscribe: () => ({}),
        send: async () => ({}),
        track: async () => ({})
    })
  } as unknown as SupabaseClient;
}

export const supabase = supabaseInstance;

// --- 匿名聊天室核心服务 ---

export const subscribeToRoom = (
  roomId: string, 
  onMessage: (payload: any) => void,
  userInfo?: { id: string, name: string },
  onPresenceUpdate?: (count: number) => void,
  onPeerLeave?: (peerId: string) => void
): RealtimeChannel => {
  if (!isCloudConfigured) {
    return { unsubscribe: () => {} } as unknown as RealtimeChannel;
  }

  // Presence Key 使用 userId，方便追踪离开
  const channel = supabase.channel(`room:${roomId}`, {
    config: { 
      broadcast: { self: true },
      presence: { key: userInfo?.id || 'anon' } 
    }
  });

  // 1. 监听广播消息
  channel.on('broadcast', { event: 'chat' }, ({ payload }) => onMessage(payload));

  // 2. 监听状态同步 (进/出)
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      if (onPresenceUpdate) onPresenceUpdate(Object.keys(state).length);
    })
    .on('presence', { event: 'join' }, () => {
       const state = channel.presenceState();
       if (onPresenceUpdate) onPresenceUpdate(Object.keys(state).length);
    })
    .on('presence', { event: 'leave' }, ({ leftPresences }) => {
       const state = channel.presenceState();
       if (onPresenceUpdate) onPresenceUpdate(Object.keys(state).length);

       // 检测掉线用户
       if (onPeerLeave && leftPresences && leftPresences.length > 0) {
         leftPresences.forEach((p: any) => {
           // p 是 presence 对象。
           // 如果我们在 track 时传入了 id，或者 presence key 本身就是 id
           // Supabase Realtime JS 库中，leftPresences 数组里的对象通常包含 track 的内容以及 presence_ref
           // 我们在下面 track 时加入了 id 字段
           if (p.id) {
             onPeerLeave(p.id);
           }
         });
       }
    });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED' && userInfo) {
       await channel.track({ 
         id: userInfo.id, // 关键：将 ID 写入 presence 数据，以便 leave 时读取
         online_at: new Date().toISOString(), 
         nickname: userInfo.name 
       });
    }
  });

  return channel;
};

export const sendChatMessage = async (channel: RealtimeChannel, message: any) => {
  if (!channel || !isCloudConfigured) return;
  await channel.send({ type: 'broadcast', event: 'chat', payload: message });
};
