import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Caminho relativo: os arquivos gerados (JS/CSS) são referenciados de forma
// relativa ao próprio index.html, então o site funciona tanto na raiz de um
// domínio (www.noitegoiana.com.br/) quanto numa subpasta
// (gsweventos.github.io/noite-goiana/) sem precisar trocar essa configuração.
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      // Precisa espelhar o "paths" do tsconfig.json — o TypeScript só valida tipos,
      // quem decide como os arquivos são de fato resolvidos no build é o Vite/Rollup.
      '@': path.resolve(__dirname, './src'),
    },
  },
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
