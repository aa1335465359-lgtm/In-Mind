import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/ai", async (req, res) => {
    try {
      const { messages, temperature, max_tokens } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "API Key missing in environment" });
      }

      // We will use Gemini API via the OpenAI compatibility layer
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: messages || [],
          temperature: temperature ?? 0.7,
          max_tokens: max_tokens || 800,
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Gemini API Error:", data);
        return res.status(response.status).json(data);
      }

      return res.json(data);
    } catch (e: any) {
      console.error("/api/ai error:", e);
      return res.status(500).json({ error: e.message || "Unknown error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
