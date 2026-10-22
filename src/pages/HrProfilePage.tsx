import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { Spinner } from '@/components/ui/Spinner';
import { getCompetencies } from '@/data/competencies';
import { getGoals } from '@/data/goals';
import { getHistory } from '@/data/history';
import { getTwin } from '@/data/twins';
import { getUserProfile } from '@/data/users';
import { subscribeReceivedGrants } from '@/data/sharing';
import { useAuth } from '@/auth/AuthContext';
import { getStrengths, goalProgress } from '@/domain/analytics';
import { GOAL_STATUS_LABELS, levelLabel } from '@/domain/levels';
import { downloadSharedReport } from '@/pdf/sharedReport';
import type {
  Competency,
  DigitalTwin,
  Goal,
  HistoryEvent,
  SharingScope,
  UserProfile,
} from '@/domain/types';

interface SharedState {
  twin: DigitalTwin | null;
  profile: UserProfile | null;
  competencies: Competency[];
  goals: Goal[];
  history: HistoryEvent[];
  scope: SharingScope;
  orgName: string;
}

export const HrProfilePage = () => {
  const { twinId } = useParams<{ twinId: string }>();
  const { user } = useAuth();
  const uid = user?.uid ?? '';

  const [data, setData] = useState<SharedState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!uid || !twinId) return;
    let cancelled = false;

    // El permiso se comprueba en el servidor: las reglas de seguridad
    // bloquean la lectura si la persona no ha compartido su perfil con
    // esta usuaria de RR. HH.
    const unsubscribe = subscribeReceivedGrants(
      uid,
      async (grants) => {
        const grant = grants.find((item) => item.twinId === twinId && !item.revokedAt);
        if (!grant) {
          if (!cancelled) {
            setError('No tienes permiso para consultar este perfil.');
            setLoading(false);
          }
          return;
        }
        try {
          const [twin, profile, competencies, goals, history] = await Promise.all([
            getTwin(twinId),
            getUserProfile(twinId),
            getCompetencies(twinId),
            getGoals(twinId),
            grant.scope === 'full' ? getHistory(twinId) : Promise.resolve([]),
          ]);
          if (cancelled) return;
          setData({
            twin,
            profile,
            competencies,
            goals,
            history,
            scope: grant.scope,
            orgName: grant.orgName,
          });
          setLoading(false);
        } catch (err) {
          if (!cancelled) {
            setError((err as Error).message || 'No se ha podido cargar el perfil.');
            setLoading(false);
          }
        }
      },
      (err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid, twinId]);

  const handleDownload = () => {
    if (!data) return;
    setGenerating(true);
    window.setTimeout(() => {
      try {
        downloadSharedReport({
          twin: data.twin,
          ownerName: data.profile?.displayName || 'Persona',
          ownerJobTitle: data.profile?.jobTitle || '',
          competencies: data.competencies,
          goals: data.goals,
          history: data.history,
          scope: data.scope,
          organizationName: data.orgName,
        });
      } finally {
        setGenerating(false);
      }
    }, 50);
  };

  if (loading) {
    return (
      <AppShell title="Perfil compartido">
        <Spinner label="Cargando perfil..." />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Perfil compartido">
        <Alert tone="error">{error ?? 'No se ha podido cargar el perfil.'}</Alert>
        <div className="mt-4">
          <Link to="/rrhh" className="text-sm font-medium text-brand-700 hover:underline">
            Volver a la lista de perfiles
          </Link>
        </div>
      </AppShell>
    );
  }

  const strengths = getStrengths(data.competencies);
  const ownerName = data.profile?.displayName || 'Persona';

  return (
    <AppShell
      title={`Perfil de ${ownerName}`}
      description={
        data.scope === 'full'
          ? 'Perfil completo autorizado por la persona.'
          : 'Resumen autorizado: solo datos basicos y competencias.'
      }
      actions={
        <>
          <Link
            to="/rrhh"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Volver
          </Link>
          <Button onClick={handleDownload} loading={generating}>
            Descargar informe PDF
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Card>
          <CardHeader title="Datos basicos" />
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Nombre</dt>
              <dd className="text-sm font-medium text-slate-800">{ownerName}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Puesto</dt>
              <dd className="text-sm font-medium text-slate-800">
                {data.profile?.jobTitle || 'No indicado'}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Alcance</dt>
              <dd className="text-sm font-medium text-slate-800">
                {data.scope === 'full' ? 'Perfil completo' : 'Solo resumen'}
              </dd>
            </div>
          </dl>
          {data.scope === 'full' && data.twin?.summary && (
            <p className="mt-4 text-sm text-slate-600">{data.twin.summary}</p>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Competencias compartidas"
            description={`${data.competencies.length} competencias declaradas.`}
          />
          {data.competencies.length === 0 ? (
            <EmptyState title="No hay competencias compartidas" />
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {data.competencies.map((competency) => (
                <li
                  key={competency.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{competency.name}</p>
                    <p className="text-xs text-slate-500">{competency.category}</p>
                  </div>
                  <LevelBadge level={competency.level} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {data.scope === 'full' && (
          <>
            <Card>
              <CardHeader title="Fortalezas declaradas" />
              {strengths.length === 0 ? (
                <EmptyState title="No hay competencias en nivel Avanzado o Referente" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {strengths.map((competency) => (
                    <Badge key={competency.id} tone="emerald">
                      {competency.name} · {competency.level}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Objetivos profesionales" />
              {data.goals.length === 0 ? (
                <EmptyState title="No hay objetivos compartidos" />
              ) : (
                <ul className="space-y-2">
                  {data.goals.map((goal) => (
                    <li key={goal.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800">{goal.title}</p>
                        <Badge
                          tone={goal.status === 'completed' ? 'emerald' : 'sky'}
                        >
                          {GOAL_STATUS_LABELS[goal.status]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {goal.competencyName || 'Sin competencia'} · {levelLabel(goal.currentLevel)} →{' '}
                        {levelLabel(goal.targetLevel)} · {goalProgress(goal)}%
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Evolucion compartida" />
              {data.history.length === 0 ? (
                <EmptyState title="No hay eventos de evolucion compartidos" />
              ) : (
                <ol className="space-y-2">
                  {data.history.slice(0, 15).map((event) => (
                    <li key={event.id} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{event.title}</p>
                        {event.createdAt && (
                          <p className="text-xs text-slate-500">
                            {event.createdAt.toDate().toLocaleDateString('es-ES')}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </>
        )}

        <Alert tone="info">
          Los datos proceden de la declaracion de la persona y se comparten bajo su autorizacion
          expresa. Esta vista no genera puntuaciones de rendimiento ni decisiones automaticas.
        </Alert>
      </div>
    </AppShell>
  );
};
