import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

/**
 * Configuracion separada para las pruebas de reglas de seguridad.
 *
 * Estas pruebas necesitan el Firebase Emulator Suite en marcha
 * (Authentication + Firestore). Se ejecutan con:
 *
 *   npm run test:emulator
 *
 * El script `test:emulator` de package.json usa `firebase emulators:exec`,
 * que levanta los emuladores, ejecuta Vitest y los apaga al terminar.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/emulator/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    // La aplicacion se conecta siempre al emulador: nunca al proyecto real.
    env: {
      VITE_USE_EMULATOR: 'true',
      VITE_FIREBASE_PROJECT_ID: 'demo-gemelo-digital',
      VITE_FIREBASE_API_KEY: 'emulador-local',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-gemelo-digital.firebaseapp.com',
      VITE_FIREBASE_STORAGE_BUCKET: 'demo-gemelo-digital.firebasestorage.app',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
      VITE_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
    },
  },
});
