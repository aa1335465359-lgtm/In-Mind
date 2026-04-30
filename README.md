# 隐念 (Hidden Thoughts) - 开发者文档

> **⚠️ CRITICAL WARNING / 严正警告**
> 
> **DO NOT MODIFY THE CORE API INTERFACES OR ENCRYPTION LOGIC.**
> **禁止修改核心 API 接口或加密逻辑。**
> 
> 此项目对隐私和连接性有特定要求。任何对 `api/` 目录结构、`services/encryption.ts` 中的加密算法或 Vercel 配置 (`vercel.json`) 的更改，都可能破坏应用程序的隐私保证和 AI 连接。

## 1. 项目概述

**Hidden Thoughts (隐念)** 是一款主打隐私优先的日记应用程序，专为 Vercel 部署设计。它具备客户端加密和阅后即焚聊天功能。

*   **框架**: React (Vite)
*   **部署**: Vercel (前端 + Serverless Functions 无服务器函数)
*   **数据库/实时通信**: Supabase
*   **AI 供应商**: DeepSeek

## 2. 环境变量

为了成功部署此项目，必须在 Vercel 中配置以下环境变量：

### 后端环境 (Vercel Functions)
| 变量名 | 描述 | 是否必需 |
| :--- | :--- | :--- |
| `deepseek` / `DEEPSEEK_API_KEY` | DeepSeek API 密钥。在 `/api/ai` 中使用。 | **是** |

### 前端环境 (Build Time 编译时)
| 变量名 | 描述 | 是否必需 |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase 项目 URL。 | **是** |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名公钥。 | **是** |

## 3. API 接口

后端逻辑非常精简，托管在 `api/` 目录中，主要用于代理连接 AI 供应商的请求，从而避免 CORS 跨域问题并隐藏 API 密钥。

### AI 请求代理接口
*   **路径**: `/api/ai`
*   **方法**: `POST`
*   **运行环境**: Node.js (Vercel Serverless)
*   **上游地址**: `https://api.deepseek.com/chat/completions`
*   **模型**: `deepseek-v4-flash`

**请求体 (Request Body) 格式:**
```json
{
  "messages": [
    { "role": "system", "content": "string" },
    { "role": "user", "content": "string" }
  ],
  "temperature": 0.7, // 可选，默认为 0.7
  "max_tokens": 800   // 可选，默认为 800
}
```

**响应体 (Response) 格式:**
标准的 OpenAI 兼容的对话聊天 JSON 格式。

## 4. 核心功能与逻辑

### A. 安全与加密 (`services/encryption.ts`)
*   **零知识架构 (Zero-Knowledge Architecture)**: 密码绝不会发送到服务器。
*   **ID 生成**: 通过 `SHA-256(password + salt)` 生成用户 ID / 存储密钥。
*   **数据加密**: 采用基于 XOR 的自定义加密以及 Base64 编码。通过 URI component encoding 支持 UTF-8(中文字符)。
*   **存储**: 
    *   **本地**: `localStorage` (首选优先级)。
    *   **云端**: Supabase 的 `encrypted_journals` 数据表 (仅存储加密后的 blob 块)。

### B. AI 集成 (`services/ai.ts`)
该应用支持四种 AI 模式：
1.  **总结 (Summarize)**: 对日记内容进行总结。
2.  **反思/洞察 (Reflect)**: 提供心理学视角的洞察和情绪分析。
3.  **诗歌 (Poetry)**: 根据日记内容生成三行诗。
4.  **预测/建议 (Predict)**: 写作建议及自动补全 (编辑器中的幽灵文本)。

*注意: 前端会处理错误解析。如果 API 返回 HTML(如 Vercel 抛出 404/500)，服务将捕获该错误以防止发生 JSON 解析错误。*

### C. 阅后即焚聊天 (`components/ChatRoom.tsx`)
*   使用 Supabase Realtime Broadcast (实时广播) 频道。
*   **无数据库持久化**: 消息仅存在于传输过程中(内存中)。
*   **特性**: 匿名身份机制、日记分享、“退出即销毁 (Burn on Exit)”逻辑。

## 5. 部署指南

1.  **推送到 GitHub**。
2.  **导入到 Vercel**。
3.  **配置第 2 节中列出的环境变量**。
4.  **点击 Deploy (部署)**。
5.  **重要提示**: 如果你更新了 `vercel.json` 或 `api/` 目录下的文件，可能必须执行一次 **Redeploy (重新部署)** (有时仅仅依靠新提交的代码触发构建是不够的)，以确保路由规则生效。

---
*由核心工程团队维护。在未验证与 DeepSeek API 兼容性之前，请勿重构 `api/ai.ts`。*