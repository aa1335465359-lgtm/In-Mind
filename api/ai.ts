
export default async function handler(request: any, response: any) {
  // 优先使用 ARK_API_KEY (火山引擎)
  const apiKey = process.env.ARK_API_KEY || process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'Server Config Error: Missing ARK_API_KEY' });
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, temperature, max_tokens } = request.body;

    // 配置火山引擎 (Ark) 的 DeepSeek 端点
    const apiUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
    
    // 指定具体的模型 ID (根据您提供的信息)
    const model = "deepseek-v3-250324";

    const result = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages,
        stream: false,
        temperature: temperature || 1.3,
        max_tokens: max_tokens || 500
      })
    });

    if (!result.ok) {
      const errText = await result.text();
      console.error("Volcengine API Error:", errText);
      return response.status(result.status).json({ error: `Provider Error: ${result.statusText}` });
    }

    const data = await result.json();
    return response.status(200).json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
