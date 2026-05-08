
// api/doubaoImage.js

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 这里用的是你在 Vercel 里配的 GEMINI_API_KEY2，其实就是 Ark 的 key
    const apiKey = process.env.GEMINI_API_KEY2;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: 'Missing GEMINI_API_KEY2 (Doubao image API key)' });
    }

    let body = req.body || {};
    // Vercel 有时候会把 body 作为字符串传进来，这里兜一层
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse body string', e);
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    }

    const { prompt, size, images_base64 } = body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // ===== 按官方示例构造 payload =====
    const payload = {
      model: 'doubao-seedream-4-5-251128',
      prompt,
      size: size || '2K',
      watermark: false,
    };

    // 图生图：处理多张图片
    if (Array.isArray(images_base64) && images_base64.length > 0) {
      if (images_base64.length === 1) {
        // 单图兼容：使用 image 字段
        payload.image = `data:image/jpeg;base64,${images_base64[0]}`;
      } else {
        // 多图：使用 image_urls 列表 (支持底图+参考图模式)
        payload.image_urls = images_base64.map(b64 => `data:image/jpeg;base64,${b64}`);
      }
    }
    // ===== payload 结束 =====

    const upstreamRes = await fetch(
      'https://ark.cn-beijing.volces.com/api/v3/images/generations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await upstreamRes.json().catch(() => null);

    if (!upstreamRes.ok) {
      console.error(
        '[Doubao image upstream error]',
        upstreamRes.status,
        JSON.stringify(data)
      );
      // 原样把上游错误透传给前端，方便在 Network 面板里排查
      return res.status(upstreamRes.status).json({
        error: 'Doubao upstream error',
        upstreamStatus: upstreamRes.status,
        details: data,
      });
    }

    const url = data?.data?.[0]?.url;
    if (!url) {
      return res
        .status(500)
        .json({ error: 'No image URL in response', raw: data });
    }

    return res.status(200).json({ url });
  } catch (err) {
    console.error('[Doubao image proxy internal error]', err);
    return res
      .status(500)
      .json({ error: err.message || 'Internal error in doubaoImage proxy' });
  }
}
