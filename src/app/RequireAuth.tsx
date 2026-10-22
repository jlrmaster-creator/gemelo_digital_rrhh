import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Protege las rutas que requieren identificacion.
 *
 * Esta proteccion es solo de interfaz: la seguridad real de los datos la
 * aplican las Security Rules de Firestore, que bloquean cualquier lectura o
 * escritura no autorizada aunque alguien manipule el frontend.
 */
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner label="Comprobando la sesion..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/acceso" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
