
import { AIAction } from "../types";

export const callAI = async (
  content: string,
  action: AIAction
): Promise<string> => {
  if (!content || content.trim().length === 0) return '';

  // 检测本地环境：Vite 本地启动如果不配置代理，无法请求 /api
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && !window.location.port.startsWith('3')) {
     // 简单的本地环境推断 (假设 vercel dev 会用 3000)
     // 这里不阻断，只是为了调试方便
  }

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
      temperature = 0.5;
      max_tokens = 50;   
      messages = [
        { 
          role: "system", 
          content: `你是一个直觉敏锐的写作助手。请根据上下文补全下一句话。规则：必须包含标点，5-15字，风格一致，不输出解释。` 
        },
        { role: "user", content: content }
      ];
      break;
  }

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        temperature,
        max_tokens
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("AI API Error:", data);
      throw new Error(data.error || `Error ${response.status}`);
    }

    const resultText = data.choices?.[0]?.message?.content || "";
    return resultText.trim().replace(/^['"]|['"]$/g, '');

  } catch (error: any) {
    console.error("AI Service Execution Failed:", error);
    
    // 如果是预测模式，失败则静默
    if (action === AIAction.PREDICT) {
      return "";
    }
    
    // 返回具体错误信息给 UI
    if (error.message.includes('Unexpected token')) {
      return `(API路径错误: 请部署到Vercel测试)`;
    }
    return `(AI连接失败: ${error.message || '未知错误'})`;
  }
};
