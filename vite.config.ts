import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Configuracion de Vite.
 *
 * `base` se controla con la variable de entorno `BASE_PATH`.
 * - GitHub Pages (proyecto)  -> BASE_PATH=/nombre-del-repo/
 * - Dominio propio / raiz    -> BASE_PATH=/
 *
 * En GitHub Actions el valor se inyecta desde el repositorio (ver
 * `.github/workflows/deploy.yml`), de modo que no hace falta editar el código.
 */
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
});
