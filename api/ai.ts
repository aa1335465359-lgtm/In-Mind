
export const config = {
  runtime: 'edge', // 切换到 Edge 运行时，解决 Serverless 启动崩溃问题
};

export default async function handler(req: Request) {
  // 1. CORS 处理 (Edge 方式)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // 2. 方法限制
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. 环境变量检查
  const apiKey = process.env.deepseek || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'Configuration Error',
      message: 'Environment variable "deepseek" or "DEEPSEEK_API_KEY" is missing.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 4. 解析请求体 (使用 Web Standard JSON)
    const body = await req.json().catch(() => ({}));
    const { messages, temperature, max_tokens, response_format } = body;

    // 5. 转发请求到 DeepSeek
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: messages || [],
        stream: false,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens || 800,
        response_format: response_format || undefined
      })
    });

    // 6. 返回结果
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });

  } catch (error: any) {
    console.error("Edge API Error:", error);
    return new Response(JSON.stringify({ 
      error: 'Edge Runtime Error', 
      message: error.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
}
