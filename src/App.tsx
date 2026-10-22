import { AuthProvider } from '@/auth/AuthContext';
import { TwinProvider } from '@/app/TwinContext';
import { AppRouter } from '@/app/router';

export const App = () => (
  <AuthProvider>
    <TwinProvider>
      <AppRouter />
    </TwinProvider>
  </AuthProvider>
);
