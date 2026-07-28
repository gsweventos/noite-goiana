import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Repositório será publicado no GitHub Pages em www.noitegoiana.com.br (domínio próprio via CNAME),
// por isso "base" fica em "/" — se publicar em github.io/<repo> sem domínio próprio, troque para "/<repo>/".
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
