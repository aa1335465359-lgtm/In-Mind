import { reportSuccess, reportFailure } from './keyManager.js';

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
    const apiKey = process.env.GEMINI_API_KEY1;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: 'Missing GEMINI_API_KEY1 (Doubao API key)' });
    }

    // 前端传的是 Google Gemini 的格式：{ model, contents, system_instruction, generation_config }
    const body = req.body || {};
    const { contents = [], system_instruction, generation_config } = body;

    // 组装成 Doubao(OpenAI 风格) 的 messages
    const messages = [];

    // system 提示词
    if (system_instruction?.parts?.length) {
      const sysText = system_instruction.parts
        .map((p) => p.text || '')
        .filter(Boolean)
        .join('\n');
      if (sysText) {
        messages.push({ role: 'system', content: sysText });
      }
    }

    // 对话内容处理 (支持文本 + 图片)
    for (const c of contents) {
      const role = c.role === 'model' ? 'assistant' : c.role || 'user';
      
      const contentParts = [];
      
      if (c.parts && Array.isArray(c.parts)) {
        for (const p of c.parts) {
          // 处理文本
          if (p.text) {
            contentParts.push({ type: 'text', text: p.text });
          }
          // 处理图片 (Google format: inline_data -> OpenAI format: image_url)
          else if (p.inline_data) {
            const mimeType = p.inline_data.mime_type || 'image/jpeg';
            const base64Data = p.inline_data.data;
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            });
          }
        }
      }

      if (contentParts.length > 0) {
        // 如果只有纯文本，为了兼容性可以简化为字符串 content (部分模型对 array content 支持不佳)
        // 但标准 Vision 模型通常需要 array。这里视情况而定，豆包通常支持 array。
        // 为了稳妥，如果只有 1 个 text part，就传 string。如果有图片，传 array。
        if (contentParts.length === 1 && contentParts[0].type === 'text') {
           messages.push({ role, content: contentParts[0].text });
        } else {
           messages.push({ role, content: contentParts });
        }
      }
    }

    if (messages.length === 0) {
      return res.status(400).json({ error: 'Empty messages' });
    }

    // 检查是否有图片，如果有图片，可能需要切换到 Vision 模型 (如果模型是分开的)
    // 这里假设 key 对应的 model 支持多模态，或者 doubao-seed-1-6-flash 兼容
    // 注意：豆包目前的 flash 模型可能对图片支持有限，pro-vision 更佳。
    // 但按照原有配置保持 model ID 不变，仅透传图片数据。
    const hasImage = messages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'image_url'));

    // 调用豆包文本/多模态模型
    // 如果有图片，且项目需要，这里可能需要根据是否有图片自动切换 model 名称
    // 但为了不破坏原有逻辑，先保持原 model，或者根据 header/env 配置
    // 假设 doubao-seed-1-6-flash-250828 能处理或忽略
    const modelToUse = 'doubao-seed-1-6-flash-250828'; 

    const upstreamRes = await fetch(
      'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelToUse,
          messages,
          temperature: 0.4,
          ...(generation_config?.response_mime_type === 'application/json'
            ? { response_format: { type: 'json_object' } }
            : {}),
        }),
      }
    );

    const data = await upstreamRes.json();

    if (!upstreamRes.ok) {
      console.error('[Doubao upstream error]', upstreamRes.status, data);
      reportFailure(apiKey);
      return res.status(upstreamRes.status).json({
        error: 'Doubao upstream error',
        details: data,
      });
    }

    // Doubao 返回 OpenAI 风格
    const text =
      data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.delta?.content ??
      '';

    // 包装成“伪 Gemini 格式”
    const wrapped = {
      candidates: [
        {
          content: {
            parts: [{ text }],
          },
        },
      ],
    };

    reportSuccess(apiKey);
    return res.status(200).json(wrapped);
  } catch (err) {
    console.error('[Doubao proxy internal error]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}