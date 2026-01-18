
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// 1. 静态硬编码读取环境变量 (Vite 构建时的静态替换要求)
// 注意：必须直接使用 import.meta.env.VITE_XXX，不能解构或动态获取
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

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

if (isCloudConfigured) {
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
} else {
  // 熔断处理：如果没配置好，返回一个会报错的对象，而不是假装成功的 Mock
  // 这防止用户在未配置数据库的情况下误以为"注册成功"
  const errorResponse = { 
    data: null, 
    error: { 
      message: '系统配置错误：Vercel 环境变量丢失 (VITE_SUPABASE_URL)',
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
        send: async () => ({}) 
    })
  } as unknown as SupabaseClient;
}

export const supabase = supabaseInstance;

// --- 匿名聊天室核心服务 ---

export const subscribeToRoom = (roomId: string, onMessage: (payload: any) => void): RealtimeChannel => {
  if (!isCloudConfigured) {
    console.warn("Chat disabled: No cloud config");
    return { unsubscribe: () => {} } as unknown as RealtimeChannel;
  }

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
