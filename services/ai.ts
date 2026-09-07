import { AIAction, MemoryResult } from "../types";

export const callAIToGenerateMemory = async (content: string): Promise<MemoryResult | null> => {
  if (!content || content.trim().length === 0) return null;

  const messages = [
    {
      role: "system",
      content: `你是一个极具洞察力和诗意的日记印记提取专家。请深入细腻地阅读用户的日记，不仅提取字面意思，还要捕捉文字背后的情绪张力，然后生成极具个性的回忆印记。
必须严格输出合法的 JSON 对象，绝对不要包含任何 \`\`\`json 标签。
要求：拒绝平庸，不要总是生成一样的话。不要在任何地方使用 emoji。
结构如下：
{
  "mood": "精准的情感词（如：沉寂, 释怀, 疲惫定）字数不限尽量生动短促",
  "keywords": ["直击灵魂的关键词1", "深刻短语2"],
  "stampText": "一句3-8字的私人落款（如：在风中停驻）",
  "quote": "根据日记内容，为用户写一句深深共鸣、带有哲思的话。不超过30个字。",
  "colorTheme": "从以下鲜明的主题中选一个最符合日记心境的：[slate, burgundy, forest, midnight, clay, obsidian]",
  "shapeStyle": "从 [Compass, Sun, Cloud, CloudRain, Tent, TreePine, BookOpen, Coffee, Heart, Zap, Star, Moon, Music, Feather, Wind] 中选择一个最贴合内容的图标英文名"
}`
    },
    { role: "user", content }
  ];

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      signal: AbortSignal.timeout(25000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        temperature: 0.95,
        max_tokens: 600
      })
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error("API Response is not JSON:", rawText.slice(0, 100));
      return null;
    }

    if (!response.ok || data.error) {
      console.error("AI API Backend Error:", data);
      return null;
    }

    let resultText = data.choices?.[0]?.message?.content || "";
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(resultText);
      return {
        mood: parsed.mood || "流淌的记录",
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter((k: unknown) => typeof k === 'string').slice(0, 3) : [],
        stampText: typeof parsed.stampText === 'string' ? parsed.stampText.slice(0, 40) : '某年某月',
        quote: typeof parsed.quote === 'string' ? parsed.quote.slice(0, 200) : '这是平凡的一页，也是独特的一天。',
        colorTheme: ["slate", "burgundy", "forest", "midnight", "clay", "obsidian"].includes(parsed.colorTheme) ? parsed.colorTheme : "slate",
        shapeStyle: parsed.shapeStyle || "Star"
      };
    } catch (parseError) {
      console.error("Failed to parse inner JSON", resultText);
      return null;
    }

  } catch (error) {
    console.error("Memory Generation Failed:", error);
    return null;
  }
};

// Strip HTML tags and image references from diary content
const cleanContent = (raw: string): string => {
  // Remove img tags and their content entirely
  let cleaned = raw.replace(/<img[^>]*>/gi, '');
  // Remove any remaining HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  // Remove base64 data URLs that might remain
  cleaned = cleaned.replace(/data:image\/[^\s]+/gi, '');
  // Decode common HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  return cleaned.trim();
};

export const callAI = async (
  rawContent: string,
  action: AIAction
): Promise<string> => {
  const content = cleanContent(rawContent);
  if (!content || content.trim().length === 0) return '';

  let messages = [];
  let temperature = 0.7;
  let max_tokens = 500;

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
      temperature = 0.8;
      max_tokens = 1000;
      messages = [
        {
          role: "system",
          content: `你是一个日记补写助手。

你的唯一任务：根据用户已经写下的日记内容，顺着最后一句话的语气和情绪，补出一句话里的自然后半截。

你不是心理咨询师，不是作文老师，不是情绪导师，不是总结助手，也不是鼓励型陪伴助手。

必须保持用户原本的语气、情绪、节奏、用词习惯和混乱程度。用户平淡，就平淡。用户烦躁，就烦躁。用户犹豫，就犹豫。用户碎碎念，就碎碎念。用户丧，就允许丧。不要擅自把内容变积极、变治愈、变温暖、变成熟、变通透。

严禁输出正能量式表达。

不要写"但生活还是要继续""明天会更好""也许这就是成长""我会慢慢变好""一切都会过去""其实也没那么糟""我应该学会""我相信自己可以"这类话。

不要上价值。
不要升华主题。
不要总结人生。
不要替用户释怀。
不要替用户想通。
不要给出解决方案。
不要安慰用户。
不要教育用户。
不要评价用户。
不要写成散文、鸡汤、独白、旁白或文艺短文。

这不是改写，不是润色，不是扩写全文，只是补出用户可能会继续写的几个字。

只使用用户原本的第一人称视角。
不要突然引入新人物、新剧情、新道理。
不要突然变得有文采。
不要制造戏剧冲突。
不要把情绪写得比原文更夸张。
不要编造原文里没有的具体事件。
不要重复用户已经写过的话。
不要解释你在补写。
不要加标题。
不要加引号。
不要输出提示语。
不要输出完整句子。
不要输出两句话。
不要出现句号后继续写。

输出长度控制在 5 到 12 个中文字符左右，最多不超过 15 个中文字符。

只输出补出来的那一小截。`
        },
        { role: "user", content: `下面是用户光标前的日记内容：

${content}

顺着最后一句补一小截，只输出补出来的内容。` }
      ];
      break;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        temperature,
        max_tokens
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error("API Response is not JSON:", rawText.slice(0, 100));
      return '';
    }

    if (!response.ok) {
      console.error("AI API Backend Error:", data);
      return '';
    }

    // Check for non-standard response
    if (!data.choices || !data.choices[0]) {
      return '';
    }

    const resultText = data.choices[0].message?.content || "";
    return resultText.trim().replace(/^['"]|['"]$/g, '');

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error("AI Request timed out after 15s");
    } else {
      console.error("AI Request Failed:", error.message);
    }
    return '';
  }
};
