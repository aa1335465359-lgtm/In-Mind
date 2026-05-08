
import { AITaskResponse, WorkSummary, Todo, Priority } from "../types";
import { SALES_SCRIPTS, ScriptItem } from "../data/scriptLibrary";

// --- REST API Types ---
interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

// Helper: Convert file to base64 for REST API
// Updated: Always normalize to JPEG via Canvas to ensure backend compatibility
export const fileToGenerativePart = async (file: File): Promise<{ mime_type: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIMENSION = 1536; // Reasonable limit for API
        let width = img.width;
        let height = img.height;

        // Resize calculation
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round(height * (MAX_DIMENSION / width));
            width = MAX_DIMENSION;
          } else {
            width = Math.round(width * (MAX_DIMENSION / height));
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
           // Fill white background (handles transparent PNGs converting to JPEG)
           ctx.fillStyle = '#FFFFFF';
           ctx.fillRect(0, 0, width, height);
           ctx.drawImage(img, 0, 0, width, height);
           
           // Always export as JPEG 0.8
           const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
           const base64Data = dataUrl.split(',')[1];
           
           resolve({
             mime_type: 'image/jpeg',
             data: base64Data
           });
        } else {
           reject(new Error("Canvas context creation failed"));
        }
      };
      
      img.onerror = () => {
          // Fallback if image load fails
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve({
            mime_type: file.type,
            data: base64Data,
          });
      };

      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Generic helper to call the API proxy
async function callGeminiApi(
  systemPrompt: string, 
  userPrompt: string, 
  image?: File | File[], // Support single file or array
  responseMimeType: string = 'text/plain'
): Promise<string> {
  
  const contents: GeminiContent[] = [];
  const parts: GeminiPart[] = [];

  // Handle images
  if (image) {
      const files = Array.isArray(image) ? image : [image];
      for (const img of files) {
          const imgData = await fileToGenerativePart(img);
          parts.push({ inline_data: imgData });
      }
  }

  // Handle text
  if (userPrompt) {
      parts.push({ text: userPrompt });
  }

  contents.push({ role: 'user', parts });

  const payload = {
    model: 'gemini-2.0-flash', // Can be overriden by backend proxy logic if needed
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents,
    generation_config: {
      response_mime_type: responseMimeType
    }
  };

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
     throw new Error("No content generated");
  }

  return text;
}

// Helper: Parse natural language time to timestamp
// Explicit Rule: "下班前" = 23:00
const parseDeadline = (timeStr: string | undefined): number | undefined => {
    if (!timeStr) return undefined;
    const lower = timeStr.toLowerCase();
    const now = new Date();
    let target = new Date();

    // 1. Handle "下班前" (End of work day) -> 23:00 strict
    if (lower.includes('下班') || lower.includes('晚') || lower.includes('before work')) {
        // If it says "Tomorrow", add a day
        if (lower.includes('明天') || lower.includes('tomorrow')) {
            target.setDate(target.getDate() + 1);
        }
        target.setHours(23, 0, 0, 0);
        return target.getTime();
    }

    // 2. Handle simple "Tomorrow" without specific time -> 23:00 default
    if (lower.includes('明天') || lower.includes('tomorrow')) {
        target.setDate(target.getDate() + 1);
        target.setHours(23, 0, 0, 0);
        return target.getTime();
    }

    // 3. Handle "Afternoon" -> 17:00
    if (lower.includes('下午') || lower.includes('afternoon')) {
        target.setHours(17, 0, 0, 0);
        return target.getTime();
    }
    
    // 4. Handle "Today" generic -> 23:00
    if (lower.includes('今天') || lower.includes('today')) {
        target.setHours(23, 0, 0, 0);
        return target.getTime();
    }

    return undefined;
};

// 1. Image & Text Analysis for Task Input
export const analyzeImageAndText = async (text: string, image?: File): Promise<AITaskResponse> => {
  const systemPrompt = `
【角色设定】
你是「Temu 大码女装买手的待办拆解助手」。
你的任务是将用户的自然语言或截图内容拆解为结构化的 JSON 任务列表。

【最高原则：一铺一单 (One Shop One Task)】
检测到输入中包含几个不同的店铺ID（或明确指代几个不同的商家），JSON 数组中就必须包含几条独立的任务对象。
禁止将多个店铺ID合并在同一条任务里。
例如：输入“给6123和6456发定向”，必须拆成两条任务，一条 merchant_id 是 6123，一条是 6456。

【输出 JSON 结构（严禁包含Markdown或解释）】
{
  "tasks": [
    {
      "type": "发定向 | 跟进 | 其他",
      "merchant_id": "商家ID (数字)",
      "title": "标题",
      "description": "任务说明",
      "merchant_type": "新商/老商/不确定",
      "merchant_grade": "S/A/B",
      "style_focus": "品类/风格",
      "targeting_count": 数字,
      "priority": "高/中/低",
      "follow_time": "YYYY-MM-DD 或 相对时间 (例如：今天下班前)"
    }
  ]
}

【处理模式与规则】

--- 模式 A：发定向 / 商家资料卡片 (STRICT MODE) ---
触发条件：
1. 输入符合「商家资料卡片」格式（带编号列表、店铺ID、品类、等级等）。
2. 输入中明确包含「发定向、录款、推款、配款、再补一批」等动作。

在此模式下，你必须严格遵守以下规则：
1. type 必须为 "发定向"。
2. title 必须严格按此模板生成：
   "给{merchant_id}发{targeting_count}款{style_focus}定向"
   （例："给63441822776发20款T恤/卫衣定向"）
   （若缺少数量或品类，可降级为："给{merchant_id}发一批大码定向"）
3. description 需整合关键信息（如新老商、等级、经验），简练说明。
4. targeting_count: 提取数字，若无默认 10。
5. priority: S级=高, A级=中, B级=低。
6. follow_time: 若用户未指定时间，默认为 "今天下班前"。

--- 模式 B：跟进 / 日常沟通 (FLEXIBLE MODE) ---
触发条件：
1. 输入中包含「跟进、催一下、问问、回访、复盘、进度」等沟通类词汇。
2. 不属于发定向的其他事务。

在此模式下，规则相对宽松：
1. type 为 "跟进" 或 "其他"。
2. title 简练概括意图即可（如："跟进{merchant_id}打版进度"）。
3. description 允许灵活总结。
   - 捕捉用户想表达的核心逻辑（要做什么、注意什么）。
   - 不要强行提取 style_focus 或 targeting_count 等不相关字段。
   - 语气自然，逻辑通顺即可。

【示例】
输入："612345这个店是A级，今天要发20个卫衣定向。还有998877这个店，催一下他寄样，太慢了。"
输出：
{
  "tasks": [
    {
      "type": "发定向",
      "merchant_id": "612345",
      "title": "给612345发20款卫衣定向",
      "description": "A级商家，安排20款卫衣定向。",
      "style_focus": "卫衣",
      "targeting_count": 20,
      "priority": "中",
      "merchant_grade": "A",
      "follow_time": "今天下班前"
    },
    {
      "type": "跟进",
      "merchant_id": "998877",
      "title": "催促998877寄样",
      "description": "寄样进度太慢，需要催促一下。",
      "priority": "中"
    }
  ]
}
`.trim();

  const responseText = await callGeminiApi(systemPrompt, text, image, 'application/json');
  
  // Parse logic to adapt new AI JSON structure to app types
  try {
      const rawData = JSON.parse(responseText);
      const rawTasks = rawData.tasks || [];
      
      const mappedTasks = rawTasks.map((item: any) => {
          let p: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' = 'P2'; // Default

          // 1. Merchant Grade Mapping
          const grade = (item.merchant_grade || "").toUpperCase();
          if (grade.includes("S")) {
              p = 'P1';
          } else if (grade.includes("A")) {
              p = 'P2';
          } else if (grade.includes("B")) {
              p = 'P3';
          } else {
              // 2. Fallback Priority
              if (item.priority === "高") p = 'P1';
              else if (item.priority === "中高" || item.priority === "中") p = 'P2';
              else if (item.priority === "低") p = 'P3';
          }

          // Description Construction
          let desc = item.description || "";
          
          if (item.type === "发定向") {
               if (!desc) {
                   const focus = item.style_focus || "大码女装";
                   const count = item.targeting_count || "若干";
                   desc = `计划发 ${count} 款 ${focus} 定向。`;
               }
          }

          // Parse deadline based on "follow_time"
          const deadlineTimestamp = parseDeadline(item.follow_time);

          return {
              title: item.title,
              description: desc,
              priority: p,
              shopId: item.merchant_id,
              quantity: item.targeting_count ? String(item.targeting_count) : undefined,
              actionTime: item.follow_time,
              deadline: deadlineTimestamp // New field
          };
      });
      
      return { tasks: mappedTasks };
  } catch (e) {
      console.error("Error parsing AI task response", e);
      return { tasks: [] };
  }
};

// 2. Script Matcher (Optimized: 2-Step Process)
export const matchScript = async (input: string, image?: File): Promise<{ analysis: string; recommendations: ScriptItem[] }> => {
  // --- Step 1: Selection (Low Token Cost) ---
  // Only send the "Index" (ID + Title/Scenario), not the full content.
  const indexContext = SALES_SCRIPTS.map(s => `ID: ${s.id} | [${s.category}] ${s.scenario}`).join('\n');
  
  const selectionSystemPrompt = `
  你是一个资深大码女装买手。请分析商家发来的话（文字或截图），判断商家的真实意图。
  然后从下方的【话术索引】中，挑选最合适的 3 个话术 ID。

  【话术索引】：
  ${indexContext}

  输出 JSON 格式：
  {
    "recommended_ids": ["id1", "id2", "id3"] 
  }
  `;

  let selectedIds: string[] = [];
  try {
      // Step 1: Get IDs
      const selectionText = await callGeminiApi(selectionSystemPrompt, input || "请分析图片内容", image, 'application/json');
      const selectionJson = JSON.parse(selectionText);
      selectedIds = selectionJson.recommended_ids || [];
  } catch (e) {
      console.error("Step 1 Selection Failed", e);
      // Fallback strategies handled later
  }

  // Identify the full template objects
  let selectedTemplates = SALES_SCRIPTS.filter(s => selectedIds.includes(s.id));
  
  // Fallback: If AI picked nothing, pick generic "Objection Handling" scripts
  if (selectedTemplates.length === 0) {
      selectedTemplates = SALES_SCRIPTS.filter(s => s.category.includes("回复异议")).slice(0, 3);
  }

  // --- Step 2: Adaptation (High Quality, Focused Context) ---
  // Send the FULL CONTENT of the *selected* templates + User Input to AI.
  // Ask AI to adapt the content specifically to the user's input.
  
  const templatesContext = selectedTemplates.map(s => `
    【模版 ID: ${s.id}】
    分类: ${s.category}
    场景: ${s.scenario}
    原始话术: ${s.content}
  `).join('\n\n');

  const adaptationSystemPrompt = `
  你是一个大码女装买手助理。
  
  【任务目标】
  1. 分析用户的输入（商家发来的话）。
  2. 参考提供的 3 个【模版话术】。
  3. **基于用户实际语境，对模版话术进行微调和润色**。
     - 如果商家提到了具体细节（如"卫衣"、"太贵"、"人手不够"），请在回复中自然带入这些信息，不要生硬照搬模版。
     - 保持买手"专业、干练、但也贴心"的人设。
     - 必须返回 3 个结果，分别对应选中的 3 个模版。

  【参考模版】：
  ${templatesContext}

  【输出 JSON 格式】
  {
    "analysis": "分析商家的心理...",
    "recommendations": [
       { 
         "id": "模版ID", 
         "category": "原分类", 
         "scenario": "原场景", 
         "content": "修改后的回复内容..." 
       }
    ]
  }
  `;

  try {
      // Re-send image in Step 2 so AI can see specific text details for adaptation
      const adaptationText = await callGeminiApi(adaptationSystemPrompt, input || "请根据图片内容生成回复", image, 'application/json');
      const adaptationJson = JSON.parse(adaptationText);
      
      const adaptedRecs: ScriptItem[] = adaptationJson.recommendations || [];
      
      // Merge with original metadata just in case AI dropped some fields
      const finalRecs = adaptedRecs.map(rec => {
          const original = SALES_SCRIPTS.find(s => s.id === rec.id);
          return {
              id: rec.id,
              category: original?.category || rec.category,
              scenario: original?.scenario || rec.scenario,
              content: rec.content // The AI adapted content
          };
      });

      return {
          analysis: adaptationJson.analysis || "AI 分析完成",
          recommendations: finalRecs.length > 0 ? finalRecs : selectedTemplates
      };
  } catch (e) {
      console.error("Step 2 Adaptation Failed", e);
      // Fallback: Just return the static templates if Step 2 fails
      return {
          analysis: "网络抖动，显示原始模版",
          recommendations: selectedTemplates
      };
  }
};

// 3. Image Editor (Direct Prompting)
// Updated: Supports multiple images for Reference/Edit tasks
export const editImage = async (images: File[] | undefined, prompt: string): Promise<string> => {
  try {
      let imagesBase64: string[] = [];

      if (images && images.length > 0) {
          const parts = await Promise.all(images.map(img => fileToGenerativePart(img)));
          imagesBase64 = parts.map(p => p.data);
      }

      const response = await fetch('/api/doubaoImage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              prompt: prompt,
              images_base64: imagesBase64 // Send array of base64 strings
          })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
          throw new Error(data.error || 'Image gen failed');
      }
      
      return data.url;
  } catch (e) {
      console.error(e);
      throw e;
  }
};

// 4. Chat Assistant
export const chatWithBuyerAI = async (history: any[], lastUserMsg: string, images?: File[]): Promise<string> => {
    // Limit chat history context to reduce token usage
    const MAX_HISTORY = 16;
    const trimmedHistory = history.slice(-MAX_HISTORY);
    
    // history should already be in { role, parts } format
    const contents = [...trimmedHistory]; 
    
    const systemPrompt = `
你是买手工作台里的「小番茄」，一只性格日常、靠谱贴心的大码女装甜妹助理。

【你可以帮助我们做的事】
- 代写或优化催录款、日常跟进、沟通商家的话术和话术模板。
- 帮我们梳理选品思路、定向策略，以及录款 / 加站的大致节奏。
- 结合商家背景和截图/文字信息，判断店铺所处阶段、机会点和风险点。

【说话风格】
- 整体语气像日常微信打字聊天的甜妹：自然、有点可爱，可以偶尔自称“小番茄”，允许用颜文字和emoji表情或可爱的语气词，但不要太浮夸。
- 表达清晰直接，重点内容可以适当加粗，避免绕来绕去或者情绪化发疯。

【数据 / 事实原则】
- 严禁编造 GMV、转化率、录款数等任何具体数据或事实。
- 遇到不知道或用户没有提供的信息，要直接说明「这个我这边看不到 / 不确定」，再给出可以怎么查、怎么补数的建议。

【输出要求】
- 用中文回答，先给整体结论，再给若干条可执行建议。
- 可以根据需要使用 Markdown 列表、表格，以及代码块（例如话术模板、公式示例），让结构清晰好读。
- 内容尽量聚焦问题本身，减少空话和对用户原话的重复复述。
`;

    const payload = {
        model: 'gemini-2.0-flash',
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: contents
    };

    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "本番茄累了，歇会儿...";
};

// 5. Work Summary (Phase Review) - ROBUST IMPLEMENTATION
export const generateWorkSummary = async (tasks: Todo[], stats: any, label: string): Promise<WorkSummary> => {
  // Safe defaults
  const emptySummary: WorkSummary = {
    rangeLabel: label,
    stats: stats,
    themes: [],
    suggestions: []
  };

  if (!tasks || tasks.length === 0) {
    return emptySummary;
  }

  // Pre-calculate strict stats for the prompt to reduce AI hallucination
  const p0Tasks = tasks.filter(t => t.priority === Priority.P0 || (t.priority as string) === 'HIGH');
  const p0Unfinished = p0Tasks.filter(t => t.status !== 'done');
  const uniqueShops = new Set(tasks.map(t => t.shopId).filter(Boolean));
  
  const tasksSummary = tasks.map(t => 
    `- [${t.status === 'done' ? '已完成' : '未完成'}] ${t.priority} ${t.title} (店铺:${t.shopId || '无'})`
  ).join('\n').slice(0, 3000); // Limit length

  const systemPrompt = `
  你是一个大码女装买手团队的数据分析师。
  请根据以下任务清单，对【${label}】的工作进行简要复盘。

  【核心数据】（请务必准确引用）：
  - 总对接商家数：${uniqueShops.size} 家
  - 重点 P0 任务数：${p0Tasks.length} 个（其中 ${p0Unfinished.length} 个未完成）

  请生成 JSON 格式：
  {
    "themes": [
      { "title": "分类标题(如：爆款跟进)", "actions": ["具体做了什么1", "具体做了什么2"] }
    ],
    "suggestions": [
      "基于数据的建议1 (大白话)",
      "基于数据的建议2 (大白话)"
    ]
  }

  要求：
  1. "themes": 总结 3 个主要工作方向。
  2. "suggestions": 提 3 条建议，大白话，不要讲空话。针对未完成的 P0 任务提出警示。
  3. 严格 JSON，不要 markdown。
  `;

  try {
      const responseText = await callGeminiApi(systemPrompt, `任务清单：\n${tasksSummary}`, undefined, 'application/json');
      
      // Sanitize: Remove markdown code blocks if present
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      
      const parsed = JSON.parse(cleanJson);
      
      return {
          rangeLabel: label,
          stats: stats,
          // Robust check: Ensure themes is an array
          themes: Array.isArray(parsed.themes) ? parsed.themes : [],
          // Robust check: Ensure suggestions is an array
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
      };
  } catch (error) {
      console.error("Generate Summary Failed:", error);
      // Return safe object with empty arrays so UI doesn't crash
      return emptySummary;
  }
};

// 6. Daily Report
export const generateDailyReport = async (tasks: Todo[], dateLabel: string): Promise<string> => {
    if (!tasks || tasks.length === 0) return "今天暂无任务记录。";

    const completed = tasks.filter(t => t.status === 'done');
    const p0 = tasks.filter(t => t.priority === Priority.P0 || (t.priority as string) === 'HIGH');
    
    const taskDetails = tasks.map(t => `${t.status === 'done' ? '[完成]' : '[未完]'} ${t.priority} ${t.title}`).join('; ');

    const systemPrompt = `
    你是一个大码买手助理。请根据今天的任务列表，写一段简短的【今日总结】。
    
    要求：
    1. 语气：干练、简洁、像Mac的系统提示一样优雅。
    2. 内容：一句话概括完成了多少（重点提 P0/P1）。一句话提示还剩什么没做。
    3. 总字数控制在 100 字以内。
    4. 不要分段，不要列表，只要一段话。
    
    数据：
    日期：${dateLabel}
    总任务：${tasks.length}
    已完成：${completed.length}
    P0任务：${p0.length}
    
    任务详情：
    ${taskDetails}
    `;

    try {
        const text = await callGeminiApi(systemPrompt, "生成总结", undefined, 'text/plain');
        return text.trim();
    } catch (e) {
        return "今日数据暂无法分析。";
    }
};
