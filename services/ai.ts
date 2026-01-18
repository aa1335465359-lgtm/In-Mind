import { AIAction } from "../types";

export const callAI = async (
  content: string,
  action: AIAction
): Promise<string> => {
  if (!content || content.trim().length === 0) return '';

  let messages = [];
  let temperature = 0.7;
  let max_tokens = 500;

  switch (action) {
    case AIAction.SUMMARIZE:
      messages = [
        { role: "system", content: "你是专业的文字编辑。请用极其简练、优美的中文总结这段日记的核心思想，限50字以内。" },
        { role: "user", content: `日记内容：\n${content}` }
      ];
      break;
    case AIAction.REFLECT:
      messages = [
        { role: "system", content: "你是一位心理咨询师。请分析日记的情绪基调，提供一句温暖的洞察或鼓励。保持简短。" },
        { role: "user", content: `日记内容：\n${content}` }
      ];
      break;
    case AIAction.POETRY:
      messages = [
        { role: "system", content: "你是一位现代诗人。请根据意境创作一首现代三行诗。" },
        { role: "user", content: `日记内容：\n${content}` }
      ];
      break;
    case AIAction.PREDICT:
      // 优化后的 Prompt：强调速度、标点、简洁
      temperature = 0.6; // 稍微降低随机性以提高准确度
      max_tokens = 30;   // 限制token数以加快响应速度
      messages = [
        { 
          role: "system", 
          content: "你是一个直觉敏锐的写作助手。请根据用户输入的文本，预测并补全下一句话。要求：1. 极其简短（15字以内）。2. 必须包含标点符号（如逗号或句号）。3. 风格与上文完全融合。4. 不要重复上文的结尾。5. 直接输出补全内容，不要任何解释。" 
        },
        { role: "user", content: content }
      ];
      break;
  }

  try {
    // 调用 Vercel Serverless Function (代理到 DeepSeek/Volcengine)
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        temperature,
        max_tokens
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "";
    return resultText.trim();

  } catch (error: any) {
    console.error("AI Service Error:", error);
    // 只有在非预测模式下才返回错误文本，预测模式下失败则静默
    if (action !== AIAction.PREDICT) {
      return `(AI连接中...)`; // 避免直接报错显得突兀
    }
    return "";
  }
};