
export default async function handler(request: any, response: any) {
  const apiKey = process.env.ARK_API_KEY;

  if (!apiKey) {
    console.error("Error: ARK_API_KEY is missing in environment variables.");
    return response.status(500).json({ error: 'Server Config Error: ARK_API_KEY is missing' });
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, temperature, max_tokens } = request.body;

    // 官方火山引擎 DeepSeek 端点
    const apiUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
    // 您指定的模型 ID
    const model = "deepseek-v3-250324";

    console.log(`[AI Request] Model: ${model}, Temp: ${temperature}, Tokens: ${max_tokens}`);

    const result = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
        // 如果前端传了 temperature 就用前端的，否则默认 0.7 (通用稳定值)
        // DeepSeek 某些场景允许 1.3，但在通用接口中 0.7 更安全
        temperature: temperature ?? 0.7, 
        max_tokens: max_tokens || 800
      })
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.error("[Volcengine Error]:", result.status, errorText);
      return response.status(result.status).json({ 
        error: `Provider Error (${result.status})`, 
        details: errorText 
      });
    }

    const data = await result.json();
    return response.status(200).json(data);

  } catch (error: any) {
    console.error("[Internal Error]:", error);
    return response.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
