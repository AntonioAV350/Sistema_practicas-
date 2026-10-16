import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    // El backend corre en :3000; con el proxy el navegador ve todo en el mismo
    // origen y no hace falta CORS.
    proxy: {
      '/api': process.env.API_PROXY || 'http://localhost:3000',
    },
  },
});
