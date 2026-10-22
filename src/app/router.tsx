import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { AuthPage } from '@/pages/AuthPage';
import { CompetenciesPage } from '@/pages/CompetenciesPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EvolutionPage } from '@/pages/EvolutionPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { HrPage } from '@/pages/HrPage';
import { HrProfilePage } from '@/pages/HrProfilePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SharingPage } from '@/pages/SharingPage';

/**
 * Enrutado de la aplicacion.
 *
 * Se usa `HashRouter` porque la aplicacion se publica como contenido estatico
 * en GitHub Pages, donde no se puede depender de un servidor que resuelva las
 * rutas (no existe un `404.html` con reescritura en todas las paginas).
 * El hash garantiza que cualquier URL copiada funcione sin configuracion
 * adicional.
 */
export const AppRouter = () => (
  <HashRouter>
    <Routes>
      <Route path="/acceso" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/competencias"
        element={
          <RequireAuth>
            <CompetenciesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/objetivos"
        element={
          <RequireAuth>
            <GoalsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/evolucion"
        element={
          <RequireAuth>
            <EvolutionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/informes"
        element={
          <RequireAuth>
            <ReportsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/compartir"
        element={
          <RequireAuth>
            <SharingPage />
          </RequireAuth>
        }
      />
      <Route
        path="/perfil"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/rrhh"
        element={
          <RequireAuth>
            <HrPage />
          </RequireAuth>
        }
      />
      <Route
        path="/rrhh/:twinId"
        element={
          <RequireAuth>
            <HrProfilePage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </HashRouter>
);
