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
      // 深度优化：强调语境融合、标点符号、极简输出
      temperature = 0.5; // 降低随机性，追求精准衔接
      max_tokens = 40;   
      messages = [
        { 
          role: "system", 
          content: `你是一个直觉敏锐的写作助手，擅长捕捉用户的语调和潜台词。
请根据用户输入的上下文，预测并补全下一句话。

严格规则：
1. **必须**包含标点符号（如逗号、句号、感叹号），使句子结构完整。
2. 长度控制在 5-15 字之间，极其简练。
3. 语气、用词风格必须与上文无缝衔接（如果是忧郁风就忧郁，如果是日常风就口语化）。
4. 如果上文语义已经完整或字数过少（不足60字），请直接返回空字符串，不要强行续写。
5. 禁止输出任何解释性文字，只输出补全内容。` 
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

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "";
    
    // 二次清洗：去除可能的引号
    return resultText.trim().replace(/^['"]|['"]$/g, '');

  } catch (error: any) {
    console.error("AI Service Error:", error);
    if (action !== AIAction.PREDICT) {
      return `(AI连接中...)`;
    }
    return "";
  }
};