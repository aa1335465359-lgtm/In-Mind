
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 这是一个占位代理，防止本地开发时 /api 请求回落到 index.html
      // 如果您想在本地测试 API，需要配置 target 指向本地运行的后端端口
      '/api': {
        target: 'http://localhost:3000', 
        changeOrigin: true,
        secure: false,
        // 如果没有后端运行，让它直接报错，而不是返回 HTML 迷惑开发者
        bypass: (req, res) => {
          if (req.headers.accept?.includes('html')) {
            return '/index.html';
          }
        }
      }
    }
  }
})
