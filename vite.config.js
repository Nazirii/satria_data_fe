import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base './' supaya hasil build bisa ditaruh di folder mana pun (atau disajikan FastAPI sebagai static).
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: { port: 5173 },
})
