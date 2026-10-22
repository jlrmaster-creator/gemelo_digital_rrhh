/**
 * Inicializacion de Firebase (Authentication + Firestore).
 *
 * La configuracion se lee de variables de entorno publicas (`VITE_FIREBASE_*`).
 * Estos valores son publicos por diseno: la seguridad real la proporcionan las
 * Security Rules de Firestore y la lista de dominios autorizados del
 * proveedor de identidad. Nunca se incluyen credenciales privadas en el
 * frontend.
 *
 * Si faltan las variables de entorno la aplicacion arranca en "modo local":
 * la interfaz funciona por completo, pero sin identificacion ni datos
 * remotos. Esto permite desarrollar y demostrar la aplicacion antes de
 * conectar el proyecto de Firebase.
 */

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  type Auth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** Indica si hay configuracion suficiente para inicializar Firebase. */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? (getApps()[0] as FirebaseApp) : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  // Persistencia local: la sesion sobrevive a recargas sin servidor propio.
  void setPersistence(authInstance, browserLocalPersistence).catch(() => undefined);

  // Modo emulador (desarrollo local). Se activa con VITE_USE_EMULATOR=true y
  // conecta con los emuladores locales de Firebase: ningun dato sale del
  // ordenador y nunca se toca el proyecto real.
  if (import.meta.env.VITE_USE_EMULATOR === 'true') {
    connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
  }
}

/** Proveedor de acceso con cuenta de Google. */
export const googleProvider = new GoogleAuthProvider();

/** Instancia de la app de Firebase (null en modo local). */
export const firebaseApp = app;
/** Instancia de Authentication (null en modo local). */
export const auth = authInstance;
/** Instancia de Firestore (null en modo local). */
export const db = dbInstance;

/** Lanza un error explicativo si Firebase no esta configurado. */
export const requireFirebase = (): { auth: Auth; db: Firestore } => {
  if (!auth || !db) {
    throw new Error(
      'Firebase no esta configurado en este entorno. Copia .env.example a .env.local y completa las variables VITE_FIREBASE_*.',
    );
  }
  return { auth, db };
};

export { firebaseConfig };
