
export default async function handler(request: any, response: any) {
  // 1. 设置标准 CORS 头 (防止某些浏览器环境下跨域报错)
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const apiKey = process.env.ARK_API_KEY;

  // 3. 检查环境变量
  if (!apiKey) {
    console.error("ARK_API_KEY is missing");
    return response.status(500).json({ 
      error: 'Configuration Error', 
      message: 'ARK_API_KEY is not set in Vercel environment variables.' 
    });
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, temperature, max_tokens } = request.body || {};

    // 4. 发起请求
    const result = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-v3-250324",
        messages: messages || [],
        stream: false,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens || 800
      })
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.error("Volcengine Error:", errorText);
      try {
        return response.status(result.status).json(JSON.parse(errorText));
      } catch {
        return response.status(result.status).json({ error: 'Upstream Error', details: errorText });
      }
    }

    const data = await result.json();
    return response.status(200).json(data);

  } catch (error: any) {
    console.error("Internal Error:", error);
    return response.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
