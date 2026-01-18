import { AIAction } from "../types";

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
      userPrompt = `请分析这篇日记的情绪基调，并提供一句温暖的洞察或鼓励。保持简短深刻。\n\n日记内容：\n${content}`;
      break;
    case AIAction.POETRY:
      userPrompt = `请根据这篇日记的意境，创作一首现代三行诗。\n\n日记内容：\n${content}`;
      break;
    case AIAction.PREDICT:
      // Optimized prompt for emotional resonance and seamless continuation
      systemPrompt = "你是用户的灵魂共鸣者。请阅读上文，捕捉字里行间流露出的情绪（无论是孤独、喜悦还是平静），以第一人称‘我’的口吻续写半句话或一句话。";
      userPrompt = `要求：\n1. 风格必须完全贴合上文，像思维的自然流淌。\n2. 不要重复上文的词句。\n3. 不要解释，只返回续写的文字。\n4. 简短有力，控制在15个字以内。\n\n上文：\n${content}\n\n续写：`; 
      break;
  }

  try {
    // Request our own backend proxy instead of external API directly
    // This keeps the API key hidden on the server side
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: action === AIAction.PREDICT ? 0.8 : 0.7, // Slightly higher temp for creative flow
        max_tokens: action === AIAction.PREDICT ? 60 : 500
      })
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";
    return result.trim();
  } catch (error) {
    console.error("AI Service Error:", error);
    return "";
  }
};