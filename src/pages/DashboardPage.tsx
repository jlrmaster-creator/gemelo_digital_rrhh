import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import { CategoryChart, CompetencyRadar, LevelComparisonChart } from '@/components/charts';
import { useTwin } from '@/app/TwinContext';
import { buildRadarData, buildTwinSummary } from '@/domain/analytics';
import {
  getCategorySummary,
  getGoalStatusSummary,
  getImprovementAreas,
  getStrengths,
  goalProgress,
} from '@/domain/analytics';
import { GOAL_STATUS_LABELS } from '@/domain/levels';

export const DashboardPage = () => {
  const { twin, profile, competencies, goals, history, loading } = useTwin();

  if (loading && competencies.length === 0 && goals.length === 0) {
    return (
      <AppShell title="Panel del gemelo digital">
        <Spinner label="Cargando tu gemelo digital..." />
      </AppShell>
    );
  }

  const summary = buildTwinSummary(competencies, goals);
  const strengths = getStrengths(competencies);
  const improvement = getImprovementAreas(competencies);
  const status = getGoalStatusSummary(goals);
  const radarData = buildRadarData(competencies);
  const categoryData = getCategorySummary(competencies);
  const displayName = profile?.displayName || 'Tu gemelo digital';

  return (
    <AppShell
      title={`Hola, ${displayName}`}
      description={
        twin?.headline ||
        'Tu gemelo digital muestra tus competencias, tus objetivos y como evoluciona tu perfil.'
      }
      actions={
        <Link
          to="/competencias"
          className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Actualizar competencias
        </Link>
      }
    >
      {competencies.length === 0 ? (
        <EmptyState
          title="Tu gemelo digital aun esta vacio"
          description="Registra tus competencias con su nivel actual para empezar a construir tu mapa de habilidades."
          icon="◇"
          action={
            <Link
              to="/competencias"
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Anadir mi primera competencia
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          {/* Indicadores principales */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Competencias
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.competencyCount}</p>
              <p className="text-xs text-slate-500">
                Nivel medio {summary.averageLevel.toFixed(1)} / 5
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Fortalezas
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-700">{summary.strengthsCount}</p>
              <p className="text-xs text-slate-500">Nivel 4 o superior</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Objetivos</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.goalCount}</p>
              <p className="text-xs text-slate-500">
                {status.completed} completados · {status.in_progress} en curso
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Progreso global
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.overallProgress}%</p>
              <ProgressBar value={summary.overallProgress} className="mt-2" />
            </Card>
          </div>

          {/* Graficos */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Mapa de competencias"
                description="Nivel actual declarado, escala de 1 a 5."
              />
              <CompetencyRadar data={radarData} />
            </Card>

            <Card>
              <CardHeader
                title="Nivel actual frente a nivel objetivo"
                description="Objetivo inferred o asociado a tus objetivos profesionales."
              />
              <LevelComparisonChart competencies={competencies} goals={goals} />
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Nivel medio por categoria" />
              <CategoryChart data={categoryData} />
            </Card>

            <Card>
              <CardHeader title="Puntos de partida" description="Donde puede marcar la diferencia." />
              {strengths.length === 0 && improvement.length === 0 ? (
                <EmptyState title="Sin datos suficientes todavia" />
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Fortalezas principales
                    </p>
                    {strengths.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Todavia no tienes competencias en nivel Avanzado o Referente.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {strengths.slice(0, 5).map((competency) => (
                          <li
                            key={competency.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800">
                                {competency.name}
                              </p>
                              <p className="text-xs text-slate-500">{competency.category}</p>
                            </div>
                            <LevelBadge level={competency.level} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      A desarrollar
                    </p>
                    {improvement.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Todas tus competencias estan en nivel Autonomo o superior.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {improvement.slice(0, 5).map((competency) => (
                          <li
                            key={competency.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800">
                                {competency.name}
                              </p>
                              <p className="text-xs text-slate-500">{competency.category}</p>
                            </div>
                            <LevelBadge level={competency.level} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Objetivos y evolucion */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Objetivos profesionales"
                action={
                  <Link to="/objetivos" className="text-sm font-medium text-brand-700 hover:underline">
                    Gestionar
                  </Link>
                }
              />
              {goals.length === 0 ? (
                <EmptyState
                  title="Sin objetivos definidos"
                  description="Define un objetivo concreto para convertir una brecha en un plan."
                />
              ) : (
                <ul className="space-y-3">
                  {goals.slice(0, 4).map((goal) => (
                    <li key={goal.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-slate-800">{goal.title}</p>
                        <Badge tone={goal.status === 'completed' ? 'emerald' : 'sky'}>
                          {GOAL_STATUS_LABELS[goal.status]}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {goal.competencyName || 'Sin competencia asociada'} · nivel {goal.currentLevel} →{' '}
                        {goal.targetLevel}
                      </p>
                      <ProgressBar
                        value={goalProgress(goal)}
                        className="mt-2"
                        showValue
                        tone={goal.status === 'completed' ? 'brand' : 'sky'}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Ultimos eventos de evolucion"
                action={
                  <Link to="/evolucion" className="text-sm font-medium text-brand-700 hover:underline">
                    Ver linea temporal
                  </Link>
                }
              />
              {history.length === 0 ? (
                <EmptyState
                  title="Sin eventos registrados"
                  description="Cada vez que anadas o actualices una competencia se guardara aqui."
                />
              ) : (
                <ol className="space-y-3">
                  {history.slice(0, 5).map((event) => (
                    <li key={event.id} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{event.title}</p>
                        <p className="text-xs text-slate-500">
                          {event.createdAt
                            ? new Intl.DateTimeFormat('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              }).format(event.createdAt.toDate())
                            : 'Sin fecha'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
};
