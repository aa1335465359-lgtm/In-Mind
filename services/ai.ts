
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
        { role: "system", content: "你是一位文字极简主义者。请用极其精炼的中文总结这段日记的核心内容，像写日记标题一样，不超过 30 个字。" },
        { role: "user", content: `日记内容：\n${content}` }
      ];
      break;
    case AIAction.REFLECT:
      messages = [
        { role: "system", content: "你是一位温暖的心理咨询师。请分析这段文字背后的情绪基调，并给出简短、温暖的洞察或鼓励。不要说教。" },
        { role: "user", content: `日记内容：\n${content}` }
      ];
      break;
    case AIAction.POETRY:
      messages = [
        { role: "system", content: "你是一位现代派诗人。请捕捉这段文字的意境，创作一首现代三行诗。风格要细腻、有画面感。" },
        { role: "user", content: `日记内容：\n${content}` }
      ];
      break;
    case AIAction.PREDICT:
      temperature = 0.6; // 稍微增加创造性
      max_tokens = 60;   
      messages = [
        { 
          role: "system", 
          content: `你就是用户本人（Inner Voice）。请顺着上文的语境、语气和情绪，自然地续写下一句话。
          
要求：
1. 风格完全模仿上文（如果是口语就用口语，文艺就文艺）。
2. 逻辑连贯，不要重复上文已有的词。
3. 不要输出任何解释，直接输出续写内容。
4. 长度控制在 10-20 字左右，点到为止。` 
        },
        { role: "user", content: content } // 传入足够多的上文以供模仿
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

    // 读取原始文本，防止 JSON.parse 崩溃
    const rawText = await response.text();

    // 尝试解析 JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      // 如果解析失败，说明返回的不是 JSON (可能是 404 页面的 HTML，或者 500 报错)
      console.error("API Response is not JSON:", rawText.slice(0, 100));
      throw new Error(`请求异常 (${response.status}): ${rawText.slice(0, 50)}...`);
    }

    if (!response.ok) {
      console.error("AI API Backend Error:", data);
      const errorMsg = data.error?.message || data.error || "未知错误";
      throw new Error(`API错误: ${errorMsg}`);
    }

    const resultText = data.choices?.[0]?.message?.content || "";
    return resultText.trim().replace(/^['"]|['"]$/g, '');

  } catch (error: any) {
    console.error("AI Request Failed:", error);
    
    // 预测模式静默失败，不弹窗
    if (action === AIAction.PREDICT) return "";

    // 直接返回真实的错误信息，不再显示“配置同步中”
    return `(AI连接失败: ${error.message})`;
  }
};
