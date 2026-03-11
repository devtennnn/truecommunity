import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        lessons: resolve(__dirname, 'lessons.html'),
        vip: resolve(__dirname, 'vip.html'),
        settings: resolve(__dirname, 'settings.html'),
        admin: resolve(__dirname, 'admin.html'),
        signals: resolve(__dirname, 'signals.html'),
      },
    },
  },
})
