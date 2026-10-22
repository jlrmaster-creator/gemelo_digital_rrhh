import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { useAuth } from '@/auth/AuthContext';
import { useTwin } from '@/app/TwinContext';
import { formatShortDate } from '@/data/shared';

export const ProfilePage = () => {
  const { user } = useAuth();
  const { profile, twin, saveProfile, saveTwinData } = useTwin();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTwin, setSavingTwin] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? user?.displayName ?? '');
    setJobTitle(profile?.jobTitle ?? '');
  }, [profile, user]);

  useEffect(() => {
    setHeadline(twin?.headline ?? '');
    setSummary(twin?.summary ?? '');
  }, [twin]);

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage(null);
    try {
      await saveProfile({ displayName, jobTitle });
      setMessage({ tone: 'success', text: 'Perfil actualizado.' });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: (error as Error).message || 'No se ha podido actualizar el perfil.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTwinSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSavingTwin(true);
    setMessage(null);
    try {
      await saveTwinData({ headline, summary });
      setMessage({ tone: 'success', text: 'Resumen del gemelo digital actualizado.' });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: (error as Error).message || 'No se ha podido actualizar el gemelo digital.',
      });
    } finally {
      setSavingTwin(false);
    }
  };

  return (
    <AppShell
      title="Mi perfil"
      description="Datos basicos de tu cuenta y presentacion de tu gemelo digital."
    >
      <div className="space-y-5">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}

        <Card>
          <CardHeader
            title="Datos de la cuenta"
            description="Solo se guardan los datos minimos necesarios. No hay datos personales adicionales."
          />
          <form onSubmit={handleProfileSubmit}>
            <Field label="Nombre visible" htmlFor="profileName" required>
              <Input
                id="profileName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </Field>
            <Field label="Puesto profesional" htmlFor="profileJob" hint="Opcional.">
              <Input
                id="profileJob"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="Ej. Analista de datos"
              />
            </Field>
            <Field label="Correo electronico" htmlFor="profileEmail" hint="Gestionado por Firebase Authentication.">
              <Input id="profileEmail" value={user?.email ?? ''} disabled readOnly />
            </Field>
            <Button type="submit" loading={savingProfile}>
              Guardar perfil
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader
            title="Presentacion del gemelo digital"
            description="Una frase que resuma tu perfil y un resumen breve de tu trayectoria."
          />
          <form onSubmit={handleTwinSubmit}>
            <Field label="Titular" htmlFor="twinHeadline" hint="Ej. Tecnica de soporte con foco en datos.">
              <Input
                id="twinHeadline"
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                maxLength={140}
              />
            </Field>
            <Field label="Resumen" htmlFor="twinSummary" hint="Opcional.">
              <Textarea
                id="twinSummary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={5}
                maxLength={2000}
              />
            </Field>
            <Button type="submit" loading={savingTwin}>
              Guardar presentacion
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Informacion de la cuenta" />
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Creada el</dt>
              <dd className="text-sm font-medium text-slate-800">
                {formatShortDate(profile?.createdAt ?? null)}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Ultima actualizacion</dt>
              <dd className="text-sm font-medium text-slate-800">
                {formatShortDate(profile?.updatedAt ?? twin?.updatedAt ?? null)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Privacidad y eliminacion de datos"
            description="Puedes revocar los accesos compartidos y eliminar tu perfil cuando quieras."
          />
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              En la seccion <strong>Compartir</strong> puedes retirar el acceso de tu gemelo digital a
              cualquier persona o organizacion. Al retirar un permiso, la persona deja de poder leer
              tus datos en ese momento.
            </p>
            <p className="text-sm text-slate-600">
              Para eliminar toda tu informacion, borra el proyecto en tu consola de Firebase o ponte en
              contacto con la persona responsable de la organizacion. La documentacion del
              repositorio detalla el procedimiento completo.
            </p>
            <Button variant="outline" onClick={() => navigate('/compartir')}>
              Gestionar accesos compartidos
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
};
