
export default async function handler(request: any, response: any) {
  // 1. 检查环境变量
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    console.error("[Config Error] ARK_API_KEY is missing in Vercel Environment Variables.");
    return response.status(500).json({ 
      error: '配置错误: 未找到 ARK_API_KEY', 
      hint: '请在 Vercel Settings -> Environment Variables 中添加此变量并重新部署。' 
    });
  }

  // 2. 只允许 POST
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, temperature, max_tokens } = request.body;

    // 3. 构造请求 (严格匹配您的 CURL)
    const apiUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
    const model = "deepseek-v3-250324";

    console.log(`[AI Request] Model: ${model}, Messages: ${messages?.length}`);

    const result = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false, // 暂不支持流式，防止超时复杂化
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens || 800
      })
    });

    // 4. 处理非 200 响应
    if (!result.ok) {
      const errorText = await result.text();
      console.error("[Volcengine API Error]:", result.status, errorText);
      
      // 尝试解析 JSON 错误信息以便更友好地展示
      try {
        const errorJson = JSON.parse(errorText);
        return response.status(result.status).json(errorJson);
      } catch {
        return response.status(result.status).json({ 
          error: `API Provider Error (${result.status})`, 
          details: errorText 
        });
      }
    }

    // 5. 返回成功数据
    const data = await result.json();
    return response.status(200).json(data);

  } catch (error: any) {
    console.error("[Server Internal Error]:", error);
    return response.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
