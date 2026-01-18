
import { AIAction } from "../types";

export const callAI = async (
  content: string,
  action: AIAction
): Promise<string> => {
  if (!content || content.trim().length === 0) return '';

  let messages = [];
  let temperature = 0.7;
  let max_tokens = 500;

  // 根据不同动作构建 Prompt
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

    // 检查 Content-Type，防止返回 HTML (404/500 页面) 导致 JSON 解析挂掉
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") === -1) {
      const text = await response.text();
      console.error("Received non-JSON response:", text.substring(0, 100));
      throw new Error("服务器返回了非 JSON 数据，可能是 API 路由未生效。");
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("AI API Backend Error:", data);
      // 优先显示火山引擎返回的详细错误
      const providerMsg = data.error?.message || data.error || JSON.stringify(data);
      throw new Error(providerMsg);
    }

    const resultText = data.choices?.[0]?.message?.content || "";
    return resultText.trim().replace(/^['"]|['"]$/g, '');

  } catch (error: any) {
    console.error("AI Service Client Error:", error);
    
    // 如果是预测模式（自动补全），失败则静默，不打扰用户
    if (action === AIAction.PREDICT) {
      return "";
    }
    
    // 友好的错误提示
    if (error.message.includes('API 路由未生效') || error.message.includes('Unexpected token')) {
       return `(配置同步中...请稍后刷新页面)`;
    }
    
    return `(AI 暂停: ${error.message || '连接超时'})`;
  }
};
