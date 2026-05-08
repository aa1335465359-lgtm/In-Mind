export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.deepseek || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'env_missing',
      message: 'DeepSeek API key not configured in environment variables.'
    }), {
      status: 200, // Return 200 so frontend can read the error
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { messages, temperature, max_tokens } = body;

    const deepseekBody = JSON.stringify({
      model: "deepseek-v4-flash",
      messages: messages || [],
      stream: false,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens || 800,
    });

    console.log('[AI] calling deepseek model=deepseek-v4-flash max_tokens=' + (max_tokens || 800));

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: deepseekBody
    });

    const rawText = await response.text();

    // Log everything for debugging
    const logPrefix = '[AI] DeepSeek status=' + response.status;
    const preview = rawText.slice(0, 300);
    console.log(logPrefix + ' body=' + preview.replace(/\n/g, ' '));

    // Try to parse; if fails, return raw text
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      return new Response(JSON.stringify({
        error: 'parse_error',
        message: 'DeepSeek returned non-JSON response',
        raw: rawText.slice(0, 200)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // If DeepSeek returned an error (even with 200 status), capture it
    if (data.error) {
      console.error('[AI] DeepSeek API error:', JSON.stringify(data.error));
      return new Response(JSON.stringify({
        error: 'deepseek_error',
        message: data.error.message || 'DeepSeek API error',
        code: data.error.code || 'unknown',
        type: data.error.type || ''
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Success — forward the standard OpenAI-compatible response
    return new Response(rawText, {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });

  } catch (error: any) {
    console.error('[AI] Edge Runtime Error:', error.message);
    return new Response(JSON.stringify({ 
      error: 'runtime_error',
      message: error.message || 'Unknown error'
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
}
