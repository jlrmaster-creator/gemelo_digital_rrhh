import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

type Mode = 'signIn' | 'signUp' | 'reset';

const MODE_COPY: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  signIn: {
    title: 'Accede a tu gemelo digital',
    subtitle: 'Consulta tu perfil profesional, tus objetivos y tu evolucion.',
    submit: 'Entrar',
  },
  signUp: {
    title: 'Crea tu cuenta',
    subtitle: 'Solo pedimos un correo electronico, una contrasena y un nombre visible.',
    submit: 'Crear cuenta',
  },
  reset: {
    title: 'Recupera tu contrasena',
    subtitle: 'Te enviaremos un correo con un enlace para establecer una nueva contrasena.',
    submit: 'Enviar correo',
  },
};

export const AuthPage = () => {
  const { signIn, signUp, signInWithGoogle, resetPassword, error, clearError, mode } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    clearError();
    setLocalError(null);
    setNotice(null);
  }, [view, clearError]);

  const copy = MODE_COPY[view];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    setNotice(null);
    try {
      if (view === 'signIn') {
        await signIn(email, password);
        navigate('/', { replace: true });
      } else if (view === 'signUp') {
        await signUp(email, password, displayName);
        navigate('/', { replace: true });
      } else {
        await resetPassword(email);
        setNotice(
          'Si existe una cuenta con ese correo, le enviaremos un mensaje para restablecer la contrasena.',
        );
      }
    } catch {
      // El mensaje ya esta disponible en `error` a traves del contexto.
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setLocalError(null);
    try {
      await signInWithGoogle();
      navigate('/', { replace: true });
    } catch {
      // Mensaje gestionado por el contexto de autenticacion.
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'local') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
              GD
            </span>
            <h1 className="text-xl font-bold text-slate-900">Gemelo Digital del Talento</h1>
          </div>
          <Alert tone="warning" title="Firebase no esta configurado">
            <p>
              Añade las variables <code className="font-mono text-xs">VITE_FIREBASE_*</code> en un
              archivo <code className="font-mono text-xs">.env.local</code> (consulta{' '}
              <code className="font-mono text-xs">.env.example</code>) para poder registrarte e
              iniciar sesion.
            </p>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            GD
          </span>
          <h1 className="text-xl font-bold text-slate-900">{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
          {localError && (
            <div className="mb-4">
              <Alert tone="error">{localError}</Alert>
            </div>
          )}
          {notice && (
            <div className="mb-4">
              <Alert tone="success">{notice}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {view === 'signUp' && (
              <>
                <Field label="Nombre visible" htmlFor="displayName" required>
                  <Input
                    id="displayName"
                    name="name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="name"
                    placeholder="Ej. Ana Garcia"
                    required
                  />
                </Field>
                <Field label="Puesto profesional (opcional)" htmlFor="jobTitle">
                  <Input
                    id="jobTitle"
                    name="jobTitle"
                    value={jobTitle}
                    onChange={(event) => setJobTitle(event.target.value)}
                    autoComplete="organization-title"
                    placeholder="Ej. Tecnica de soporte"
                  />
                </Field>
              </>
            )}

            <Field label="Correo electronico" htmlFor="email" required>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </Field>

            {view !== 'reset' && (
              <Field label="Contrasena" htmlFor="password" required>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={view === 'signUp' ? 'new-password' : 'current-password'}
                  minLength={6}
                  required
                />
              </Field>
            )}

            <Button type="submit" loading={submitting} fullWidth size="lg">
              {copy.submit}
            </Button>
          </form>

          {view !== 'reset' && (
            <>
              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-xs uppercase tracking-wide text-slate-400">o</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <Button variant="outline" fullWidth onClick={handleGoogle} disabled={submitting}>
                Continuar con Google
              </Button>
            </>
          )}

          <div className="mt-5 space-y-1.5 text-center text-sm">
            {view === 'signIn' && (
              <>
                <p>
                  <button
                    type="button"
                    className="font-medium text-brand-700 hover:underline"
                    onClick={() => setView('signUp')}
                  >
                    Crear una cuenta nueva
                  </button>
                </p>
                <p>
                  <button
                    type="button"
                    className="text-slate-600 hover:underline"
                    onClick={() => setView('reset')}
                  >
                    He olvidado mi contrasena
                  </button>
                </p>
              </>
            )}
            {view === 'signUp' && (
              <p>
                <button
                  type="button"
                  className="font-medium text-brand-700 hover:underline"
                  onClick={() => setView('signIn')}
                >
                  Ya tengo cuenta
                </button>
              </p>
            )}
            {view === 'reset' && (
              <p>
                <button
                  type="button"
                  className="font-medium text-brand-700 hover:underline"
                  onClick={() => setView('signIn')}
                >
                  Volver al acceso
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Tus datos se guardan en tu proyecto de Firebase. Puedes revocar el acceso compartido y
          eliminar tu perfil en cualquier momento.
        </p>
      </div>
    </div>
  );
};
