import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// 1. 静态读取环境变量 (Vite 必须这样写，不能用循环)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 2. 状态导出
export const isCloudConfigured = !!(supabaseUrl && supabaseKey);

// 3. 打印诊断日志 (发布前可删除)
if (typeof window !== 'undefined') {
  console.log(
    '%c[Supabase Config Check]', 
    'color: #00bcd4; font-weight: bold;',
    supabaseUrl ? '✅ URL 成功加载' : '❌ URL 丢失 (Vite 没识别到变量)',
    '|',
    supabaseKey ? '✅ Key 成功加载' : '❌ Key 丢失'
  );
}

// 4. 初始化实例
let supabaseInstance: SupabaseClient;

if (isCloudConfigured) {
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
} else {
  // 如果没配置好，返回 Mock 对象防止页面崩溃
  const mockError = { message: 'Supabase 尚未配置，请检查 Vercel 环境变量' };
  supabaseInstance = {
    from: () => ({
      insert: async () => ({ error: mockError }),
      upsert: async () => ({ error: mockError }),
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: mockError }) }) })
    }),
    storage: { from: () => ({ upload: async () => ({ error: mockError }) }) },
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
