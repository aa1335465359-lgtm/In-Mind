
import { AIAction } from "../types";

export const callAI = async (
  content: string,
  action: AIAction
): Promise<string> => {
  if (!content || content.trim().length === 0) return '';

  // 1. 本地开发环境检测 (Localhost 无法直接运行 Serverless Function)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && !window.location.port.startsWith('3')) {
    // 假设 Vercel dev 可能会用 3000，普通 vite 是 5173
    console.warn("Localhost detected: API calls may fail without 'vercel dev'.");
  }

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

    // 2. 严格检查 Content-Type，区分路由错误和API错误
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      const text = await response.text();
      // 如果返回的是 index.html (包含 App 标题)，说明路由被前端拦截了
      if (text.includes("System Config")) {
        throw new Error("API路由被前端拦截 (Vercel配置未生效)");
      }
      // 否则可能是 Vercel 的 404/500 报错页面
      throw new Error(`服务器返回了 HTML 错误页 (Status ${response.status})`);
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("AI API Backend Error:", data);
      const providerMsg = data.error?.message || data.error || JSON.stringify(data);
      throw new Error(providerMsg);
    }

    const resultText = data.choices?.[0]?.message?.content || "";
    return resultText.trim().replace(/^['"]|['"]$/g, '');

  } catch (error: any) {
    console.error("AI Service Client Error:", error);
    
    // 预测模式静默失败
    if (action === AIAction.PREDICT) return "";

    // 3. 根据环境返回更直观的错误提示
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    
    if (error.message.includes('API路由被前端拦截') || error.message.includes('Unexpected token')) {
       if (isLocal) {
         return `(本地模式：请使用 'vercel dev' 命令启动以测试 API)`;
       }
       return `(API路由异常：请在 Vercel 控制台 Redeploy)`;
    }
    
    // 显示真实的错误信息（如 Key 无效、余额不足等）
    return `(AI 错误: ${error.message.substring(0, 15)}...)`;
  }
};
