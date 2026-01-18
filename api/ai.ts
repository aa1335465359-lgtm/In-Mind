export default async function handler(request, response) {
  // Retrieve API key from server-side environment variable
  const apiKey = process.env.deepseek;

  if (!apiKey) {
    return response.status(500).json({ error: 'Server configuration error: API Key missing' });
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, temperature, max_tokens } = request.body;

    // Call DeepSeek (Volcengine) API from the server
    const result = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-v3-250324",
        messages,
        stream: false,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 500
      })
    });

    const data = await result.json();
    
    // Forward the response back to the client
    return response.status(result.status).json(data);
  } catch (error) {
    console.error("Proxy Error:", error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}