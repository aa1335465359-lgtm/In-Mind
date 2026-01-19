# 隐念 (Hidden Thoughts) - Developer Documentation

> **⚠️ CRITICAL WARNING / 严正警告**
> 
> **DO NOT MODIFY THE CORE API INTERFACES OR ENCRYPTION LOGIC.**
> **禁止修改核心 API 接口或加密逻辑。**
> 
> This project is designed with specific privacy and connectivity requirements. Any changes to the `api/` directory structure, the encryption algorithms in `services/encryption.ts`, or the Vercel configuration (`vercel.json`) may break the application's privacy guarantees and AI connectivity.

## 1. Project Overview

**Hidden Thoughts** is a privacy-first journaling application designed for deployment on Vercel. It features client-side encryption and ephemeral chat capabilities.

*   **Framework**: React (Vite)
*   **Deployment**: Vercel (Frontend + Serverless Functions)
*   **Database/Realtime**: Supabase
*   **AI Provider**: Volcengine (DeepSeek V3)

## 2. Environment Variables

To deploy this project successfully, the following environment variables must be configured in Vercel:

### Backend (Vercel Functions)
| Variable | Description | Required |
| :--- | :--- | :--- |
| `ARK_API_KEY` | API Key for Volcengine (DeepSeek model). Used in `/api/ai`. | **YES** |

### Frontend (Build Time)
| Variable | Description | Required |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase Project URL. | **YES** |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Public Key. | **YES** |

## 3. API Interfaces

The backend logic is minimal and hosted in `api/` to proxy requests to AI providers, avoiding CORS issues and hiding API keys.

### AI Completion Proxy
*   **Path**: `/api/ai`
*   **Method**: `POST`
*   **Runtime**: Node.js (Vercel Serverless)
*   **Upstream**: `https://ark.cn-beijing.volces.com/api/v3/chat/completions`
*   **Model**: `deepseek-v3-250324`

**Request Body Schema:**
```json
{
  "messages": [
    { "role": "system", "content": "string" },
    { "role": "user", "content": "string" }
  ],
  "temperature": 0.7, // Optional, defaults to 0.7
  "max_tokens": 800   // Optional, defaults to 800
}
```

**Response Schema:**
Standard OpenAI-compatible chat completion JSON.

## 4. Core Features & Logic

### A. Security & Encryption (`services/encryption.ts`)
*   **Zero-Knowledge Architecture**: Passwords are never sent to the server.
*   **ID Generation**: `SHA-256(password + salt)` generates the user ID / Storage Key.
*   **Data Encryption**: Custom XOR-based encryption with Base64 encoding. Supports UTF-8 (Chinese characters) via URI component encoding.
*   **Storage**: 
    *   **Local**: `localStorage` (First priority).
    *   **Cloud**: Supabase `encrypted_journals` table (Encrypted blob only).

### B. AI Integration (`services/ai.ts`)
The app supports four AI modes:
1.  **Summarize**: Summarizes journal entries.
2.  **Reflect**: Provides psychological insights/mood analysis.
3.  **Poetry**: Generates a 3-line poem based on the entry.
4.  **Predict**: Autocomplete/writing suggestions (Ghost text in editor).

*Note: The frontend handles error parsing. If the API returns HTML (Vercel 404/500), the service catches this to prevent JSON parse errors.*

### C. Ephemeral Chat (`components/ChatRoom.tsx`)
*   Uses Supabase Realtime Broadcast channels.
*   **No Database Persistence**: Messages exist only in transit (RAM).
*   **Features**: Anonymous identities, journal sharing, "Burn on Exit" logic.

## 5. Deployment Guide

1.  **Push to GitHub**.
2.  **Import to Vercel**.
3.  **Set Environment Variables** listed in Section 2.
4.  **Deploy**.
5.  **Important**: If updating `vercel.json` or `api/` files, you must perform a **Redeploy** (not just a new commit build sometimes) to ensure routing rules apply.

---
*Maintained by the Core Engineering Team. Do not refactor `api/ai.ts` without verifying Volcengine compatibility.*