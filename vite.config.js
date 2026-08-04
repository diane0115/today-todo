import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://260804-wheat.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
