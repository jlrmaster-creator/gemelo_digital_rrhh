/**
 * Contexto de autenticacion basado en Firebase Authentication.
 *
 * Expone el estado de sesion y las acciones de acceso. Todos los errores se
 * traducen a mensajes en castellano para que la interfaz no muestre codigos
 * tecnicos.
 *
 * Cuando Firebase no esta configurado (`mode === 'local'`) las acciones
 * devuelven un error explicito en lugar de fallar en silencio.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/firebase/client';

export type AuthMode = 'firebase' | 'local';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  mode: AuthMode;
  error: string | null;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Traduce los codigos de error de Firebase a mensajes comprensibles. */
export const translateAuthError = (error: unknown): string => {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'El correo electronico no tiene un formato valido.';
    case 'auth/missing-password':
      return 'Introduce una contrasena.';
    case 'auth/weak-password':
      return 'La contrasena debe tener al menos 6 caracteres.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con ese correo electronico.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'El correo electronico o la contrasena no son correctos.';
    case 'auth/popup-closed-by-user':
      return 'Has cerrado la ventana de acceso sin completar la operacion.';
    case 'auth/popup-blocked':
      return 'El navegador ha bloqueado la ventana emergente. Permite las ventanas emergentes e intentalo de nuevo.';
    case 'auth/network-request-failed':
      return 'No se ha podido conectar con el servicio de identificacion. Revisa tu conexion.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos antes de reintentar.';
    case 'auth/operation-not-allowed':
      return 'Ese metodo de acceso no esta habilitado en la consola de Firebase (Authentication -> Sign-in method).';
    case 'auth/unauthorized-domain':
      return 'Este dominio no esta autorizado en Firebase Authentication. Anadelo en Authentication -> Settings -> Authorized domains.';
    case 'auth/account-exists-with-different-credential':
      return 'Ya existe una cuenta con ese correo electronico usando otro metodo de acceso.';
    case 'auth/missing-email':
      return 'Introduce el correo electronico de la cuenta.';
    default:
      return (error as { message?: string })?.message ?? 'Ha ocurrido un error inesperado.';
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      },
      () => {
        setUser(null);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const requireAuth = useCallback(() => {
    if (!auth) {
      throw new Error(
        'Firebase Authentication no esta configurado en este entorno. Copia .env.example a .env.local y completa las variables VITE_FIREBASE_*.',
      );
    }
    return auth;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setError(null);
      try {
        const instance = requireAuth();
        const credential = await createUserWithEmailAndPassword(instance, email, password);
        if (displayName) {
          await updateProfile(credential.user, { displayName });
        }
      } catch (err) {
        setError(translateAuthError(err));
        throw err;
      }
    },
    [requireAuth],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const instance = requireAuth();
        await signInWithEmailAndPassword(instance, email, password);
      } catch (err) {
        setError(translateAuthError(err));
        throw err;
      }
    },
    [requireAuth],
  );

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const instance = requireAuth();
      await signInWithPopup(instance, googleProvider);
    } catch (err) {
      setError(translateAuthError(err));
      throw err;
    }
  }, [requireAuth]);

  const resetPassword = useCallback(
    async (email: string) => {
      setError(null);
      try {
        const instance = requireAuth();
        await sendPasswordResetEmail(instance, email);
      } catch (err) {
        setError(translateAuthError(err));
        throw err;
      }
    },
    [requireAuth],
  );

  const signOut = useCallback(async () => {
    setError(null);
    try {
      const instance = requireAuth();
      await firebaseSignOut(instance);
    } catch (err) {
      setError(translateAuthError(err));
      throw err;
    }
  }, [requireAuth]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      mode: isFirebaseConfigured ? 'firebase' : 'local',
      error,
      isAuthenticated: Boolean(user),
      signUp,
      signIn,
      signInWithGoogle,
      resetPassword,
      signOut,
      clearError,
    }),
    [user, loading, error, signUp, signIn, signInWithGoogle, resetPassword, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** Acceso al contexto de autenticacion. */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
