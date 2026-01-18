import { AIAction } from "../types";

// Obfuscated API Key (Base64) to prevent plain text scraping
// Key: 4039381b-0aa7-4144-95d7-808aca8ca058
// Base64: NDAzOTM4MWItMGFhNy00MTQ0LTk1ZDctODA4YWNhOGNhMDU4
const K_ENC = "NDAzOTM4MWItMGFhNy00MTQ0LTk1ZDctODA4YWNhOGNhMDU4";
const API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const MODEL = "deepseek-v3-250324";

const getApiKey = () => {
  // Priority: Environment Variable -> Hardcoded Obfuscated Key
  if (typeof process !== 'undefined' && process.env && process.env.deepseek) {
    return process.env.deepseek;
  }
  try {
    return atob(K_ENC);
  } catch {
    return "";
  }
};

export const callAI = async (
  content: string,
  action: AIAction
): Promise<string> => {
  if (!content || content.trim().length === 0) return '';

  let systemPrompt = "你是隐念APP的人工智能助手。";
  let userPrompt = "";

  switch (action) {
    case AIAction.SUMMARIZE:
      userPrompt = `请用非常简练、优美的中文总结这段日记的核心思想，不要超过50个字。\n\n日记内容：\n${content}`;
      break;
    case AIAction.REFLECT:
      // Changed to analyze mood/insight as requested
      userPrompt = `请分析这篇日记的情绪基调，并提供一句温暖的洞察或鼓励。保持简短深刻。\n\n日记内容：\n${content}`;
      break;
    case AIAction.POETRY:
      userPrompt = `请根据这篇日记的意境，创作一首现代三行诗。\n\n日记内容：\n${content}`;
      break;
    case AIAction.PREDICT:
      systemPrompt = "你是一个强大的文本补全助手。请根据用户输入的上文，预测并生成接下来可能出现的文字。只返回续写的文字，不要重复上文，不要包含任何解释。续写长度控制在5-15个字以内。如果上文不完整，请尝试补全句子。";
      userPrompt = content; 
      break;
  }

  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key not found");

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false,
        temperature: action === AIAction.PREDICT ? 0.3 : 0.7,
        max_tokens: action === AIAction.PREDICT ? 20 : 500
      })
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";
    return result.trim();
  } catch (error) {
    console.error("DeepSeek API Error:", error);
    return "";
  }
};
