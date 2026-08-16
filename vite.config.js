import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist/app',
    emptyOutDir: true,
    assetsDir: 'assets',
    /* แปลง syntax ให้รองรับเบราว์เซอร์เก่า (Safari 12+, Chrome 70+, Android WebView 2018+) — กันจอขาวเพราะ parse JS ไม่ได้ */
    target: 'es2018',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8321',
    },
  },
});
