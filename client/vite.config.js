import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: true,
  },
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
});
