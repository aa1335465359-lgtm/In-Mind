
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// 1. 安全读取环境变量 (Safe Env Access for Vite/Webpack/Browser)
const getEnv = (key: string): string | undefined => {
  try {
    // Try Vite standard (import.meta.env)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  try {
    // Try Node/Webpack standard (process.env)
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {}

  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

// 2. 状态导出 - 严格检查
export const isCloudConfigured = !!(supabaseUrl && supabaseKey && supabaseUrl.startsWith('http'));

// 3. 打印诊断日志
if (typeof window !== 'undefined') {
  console.log(
    '%c[System Config]', 
    'color: #00bcd4; font-weight: bold;',
    isCloudConfigured ? '✅ 云端服务已连接' : '⚠️ 仅本地模式 (环境变量未配置)'
  );
}

// 4. 初始化实例或错误熔断
let supabaseInstance: SupabaseClient;

if (isCloudConfigured && supabaseUrl && supabaseKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
} else {
  // 熔断处理：如果没配置好，返回一个会报错的对象，而不是假装成功的 Mock
  const errorResponse = { 
    data: null, 
    error: { 
      message: '系统配置错误：环境变量丢失 (VITE_SUPABASE_URL)',
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
    console.warn("Chat disabled: No cloud config");
    return { unsubscribe: () => {} } as unknown as RealtimeChannel;
  }

  // 使用 userInfo.id 作为 presence key，这样我们就能准确追踪谁离开了
  const channel = supabase.channel(`room:${roomId}`, {
    config: { 
      broadcast: { self: true },
      presence: { key: userInfo?.id || 'anon' } 
    }
  });

  // Message Handler
  channel.on('broadcast', { event: 'chat' }, ({ payload }) => onMessage(payload));

  // Presence Handler
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

       // 触发掉线回调
       if (onPeerLeave && leftPresences) {
         leftPresences.forEach((p: any) => {
           // p.key 应该是我们配置的 senderId
           // 如果 Supabase 版本返回的结构不同，可能需要从 presence_ref 映射，但通常 key 是可靠的
           // 在 presence config 中 key 是用户 ID
           // leftPresences 是一个数组，每一项就是该用户的 presence object (包含我们 track 的数据)
           // 但 key 本身不在数据对象里，而是在外层 map。
           // 不过在 'leave' event payload 中，Supabase 会尽量返回离开的那一项。
           // 我们在 config 里设置了 presence: { key: ... }，Supabase 会用这个作为唯一标识
           // 这里我们需要知道是 *哪个 ID* 离开了。
           
           // 在 Realtime v2 中，leftPresences 是一个对象数组。
           // 我们并没有把 senderId 放在 track 的 payload 里（只放了 nickname）。
           // 所以我们需要依赖 presence key。
           // 实际上，我们可以在 track 里也放一份 id 以便双重确认。
           // 暂时假设 key 机制正常工作，但很难直接从 leftPresences 数组拿到 key 值，
           // 除非我们在 track() 时把 id 也放进去。
           // 让我们修改下方的 track 调用。
           
           // 读取 track 进去的 id
           if (p.id) {
             onPeerLeave(p.id);
           }
         });
       }
    });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED' && userInfo) {
       await channel.track({ 
         id: userInfo.id, // Explicitly track ID for leave detection
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
