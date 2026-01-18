
export default async function handler(request: any, response: any) {
  // 从 Vercel 环境变量获取 Key
  const apiKey = process.env.ARK_API_KEY || process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'Server Config Error: Missing ARK_API_KEY' });
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, temperature, max_tokens, model } = request.body;

    // 用户指定的 Endpoint ID
    const ENDPOINT_ID = "ep-m-20260118165347-t96df";

    const result = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        // Volcengine 中，model 参数通常填 Endpoint ID
        model: model || ENDPOINT_ID,
        messages,
        stream: false,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 100
      })
    });

    if (!result.ok) {
      const errText = await result.text();
      console.error("Volcengine API Error:", errText);
      return response.status(result.status).json({ error: `API Error: ${result.statusText}` });
    }

    const data = await result.json();
    return response.status(200).json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
