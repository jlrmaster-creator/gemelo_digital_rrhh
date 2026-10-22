import { useMemo, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { LevelPicker } from '@/components/ui/LevelPicker';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTwin } from '@/app/TwinContext';
import { suggestActions } from '@/domain/actionCatalog';
import { GOAL_STATUS_LABELS, levelLabel } from '@/domain/levels';
import { getGoalStatusSummary, goalProgress } from '@/domain/analytics';
import { createId } from '@/data/shared';
import type { Goal, GoalAction, GoalStatus, Level } from '@/domain/types';

interface FormState {
  title: string;
  description: string;
  competencyId: string;
  currentLevel: Level;
  targetLevel: Level;
  targetDate: string;
  status: GoalStatus;
  actions: GoalAction[];
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  competencyId: '',
  currentLevel: 2,
  targetLevel: 4,
  targetDate: '',
  status: 'pending',
  actions: [],
};

export const GoalsPage = () => {
  const { goals, competencies, createGoal, updateGoal, removeGoal, saveGoal } = useTwin();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'todas' | GoalStatus>('todas');

  const summary = getGoalStatusSummary(goals);

  const visible = useMemo(
    () => (statusFilter === 'todas' ? goals : goals.filter((goal) => goal.status === statusFilter)),
    [goals, statusFilter],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setForm({
      title: goal.title,
      description: goal.description,
      competencyId: goal.competencyId ?? '',
      currentLevel: goal.currentLevel,
      targetLevel: goal.targetLevel,
      targetDate: goal.targetDate,
      status: goal.status,
      actions: goal.actions,
    });
    setFormError(null);
    setOpen(true);
  };

  const handleCompetencyChange = (competencyId: string) => {
    const competency = competencies.find((item) => item.id === competencyId);
    setForm((current) => ({
      ...current,
      competencyId,
      currentLevel: competency ? competency.level : current.currentLevel,
    }));
  };

  const applySuggestions = () => {
    const competency = competencies.find((item) => item.id === form.competencyId);
    if (!competency) {
      setFormError('Selecciona una competencia para sugerir acciones.');
      return;
    }
    const suggestions = suggestActions(competency, form.targetLevel);
    setForm((current) => ({
      ...current,
      actions: [
        ...current.actions,
        ...suggestions
          .filter(
            (template) =>
              !current.actions.some((action) => action.title === template.title),
          )
          .map((template) => ({ id: createId(), title: template.title, done: false })),
      ],
    }));
    setFormError(null);
  };

  const addAction = () => {
    setForm((current) => ({
      ...current,
      actions: [...current.actions, { id: createId(), title: '', done: false }],
    }));
  };

  const updateAction = (id: string, title: string) => {
    setForm((current) => ({
      ...current,
      actions: current.actions.map((action) =>
        action.id === id ? { ...action, title } : action,
      ),
    }));
  };

  const removeAction = (id: string) => {
    setForm((current) => ({
      ...current,
      actions: current.actions.filter((action) => action.id !== id),
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length < 3) {
      setFormError('Escribe un titulo de objetivo de al menos 3 caracteres.');
      return;
    }
    if (form.targetLevel < form.currentLevel) {
      setFormError('El nivel objetivo no puede ser inferior al nivel actual.');
      return;
    }
    const competency = competencies.find((item) => item.id === form.competencyId);
    const payload = {
      title: form.title,
      description: form.description,
      competencyId: form.competencyId || null,
      competencyName: competency?.name ?? '',
      currentLevel: form.currentLevel,
      targetLevel: form.targetLevel,
      targetDate: form.targetDate,
      status: form.status,
      actions: form.actions.filter((action) => action.title.trim().length > 0),
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateGoal(editing.id, payload);
      } else {
        await createGoal(payload);
      }
      setOpen(false);
    } catch (error) {
      setFormError((error as Error).message || 'No se ha podido guardar el objetivo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await removeGoal(toDelete.id);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const toggleAction = async (goal: Goal, actionId: string) => {
    const actions = goal.actions.map((action) =>
      action.id === actionId ? { ...action, done: !action.done } : action,
    );
    await saveGoal(
      goal.id,
      {
        title: goal.title,
        description: goal.description,
        competencyId: goal.competencyId,
        competencyName: goal.competencyName,
        currentLevel: goal.currentLevel,
        targetLevel: goal.targetLevel,
        targetDate: goal.targetDate,
        status: goal.status,
        actions,
      },
    );
  };

  return (
    <AppShell
      title="Objetivos y plan de desarrollo"
      description="Define que quieres conseguir, con que nivel y con que acciones concretas vas a trabajarlo."
      actions={
        <Button onClick={openCreate}>
          <span aria-hidden="true">+</span> Nuevo objetivo
        </Button>
      }
    >
      {goals.length === 0 ? (
        <EmptyState
          title="Todavia no tienes objetivos"
          description="Un objetivo combina una competencia, un nivel actual, un nivel objetivo y un plan de acciones."
          icon="◎"
          action={<Button onClick={openCreate}>Crear mi primer objetivo</Button>}
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pendientes</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.pending}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">En curso</p>
              <p className="mt-1 text-2xl font-bold text-sky-700">{summary.in_progress}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Completados</p>
              <p className="mt-1 text-2xl font-bold text-brand-700">{summary.completed}</p>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['todas', 'pending', 'in_progress', 'completed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status === 'todas' ? 'Todos' : GOAL_STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState title="No hay objetivos en este estado" />
          ) : (
            <ul className="space-y-3">
              {visible.map((goal) => (
                <li key={goal.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{goal.title}</p>
                        {goal.description && (
                          <p className="mt-1 text-sm text-slate-600">{goal.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge
                            tone={
                              goal.status === 'completed'
                                ? 'emerald'
                                : goal.status === 'in_progress'
                                  ? 'sky'
                                  : 'neutral'
                            }
                          >
                            {GOAL_STATUS_LABELS[goal.status]}
                          </Badge>
                          {goal.competencyName && (
                            <Badge tone="violet">{goal.competencyName}</Badge>
                          )}
                          <Badge tone="neutral">
                            {levelLabel(goal.currentLevel)} → {levelLabel(goal.targetLevel)}
                          </Badge>
                          {goal.targetDate && (
                            <Badge tone="amber">Fecha: {goal.targetDate}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(goal)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => setToDelete(goal)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <ProgressBar
                        value={goalProgress(goal)}
                        showValue
                        tone={goal.status === 'completed' ? 'brand' : 'sky'}
                        label="Progreso del objetivo"
                      />
                    </div>

                    {goal.actions.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Plan de desarrollo
                        </p>
                        <ul className="space-y-1.5">
                          {goal.actions.map((action) => (
                            <li key={action.id}>
                              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={action.done}
                                  onChange={() => toggleAction(goal, action.id)}
                                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                />
                                <span className={action.done ? 'text-slate-400 line-through' : ''}>
                                  {action.title}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal
        open={open}
        title={editing ? 'Editar objetivo' : 'Nuevo objetivo'}
        description="Las acciones sugeridas provienen de un catalogo de reglas predefinidas, no de un modelo de IA."
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        {formError && (
          <div className="mb-4">
            <Alert tone="error">{formError}</Alert>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <Field label="Titulo del objetivo" htmlFor="goalTitle" required>
            <Input
              id="goalTitle"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Ej. Mejorar mi comunicacion en reuniones"
              required
            />
          </Field>

          <Field label="Descripcion" htmlFor="goalDescription" hint="Opcional.">
            <Textarea
              id="goalDescription"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
              maxLength={1000}
            />
          </Field>

          <Field label="Competencia relacionada" htmlFor="goalCompetency">
            <Select
              id="goalCompetency"
              value={form.competencyId}
              onChange={(event) => handleCompetencyChange(event.target.value)}
            >
              <option value="">Sin competencia relacionada</option>
              {competencies.map((competency) => (
                <option key={competency.id} value={competency.id}>
                  {competency.name} (nivel {competency.level})
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nivel actual" required>
              <LevelPicker
                value={form.currentLevel}
                onChange={(level) => setForm({ ...form, currentLevel: level })}
                name="nivel-actual"
                compact
              />
            </Field>
            <Field label="Nivel objetivo" required>
              <LevelPicker
                value={form.targetLevel}
                onChange={(level) => setForm({ ...form, targetLevel: level })}
                name="nivel-objetivo"
                compact
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha prevista" htmlFor="targetDate" hint="Opcional.">
              <Input
                id="targetDate"
                type="date"
                value={form.targetDate}
                onChange={(event) => setForm({ ...form, targetDate: event.target.value })}
              />
            </Field>
            <Field label="Estado" htmlFor="goalStatus">
              <Select
                id="goalStatus"
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as GoalStatus })
                }
              >
                <option value="pending">Pendiente</option>
                <option value="in_progress">En curso</option>
                <option value="completed">Completado</option>
              </Select>
            </Field>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Acciones recomendadas</p>
            <Button variant="outline" size="sm" onClick={applySuggestions}>
              Sugerir acciones
            </Button>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Puedes EDITAR o quitar cualquier accion. Las sugerencias se generan con reglas
            sencillas segun la categoria y el salto de nivel.
          </p>

          <ul className="mb-3 space-y-2">
            {form.actions.map((action) => (
              <li key={action.id} className="flex items-center gap-2">
                <Input
                  value={action.title}
                  onChange={(event) => updateAction(action.id, event.target.value)}
                  placeholder="Accion concreta"
                  aria-label="Accion"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-rose-600 hover:bg-rose-50"
                  onClick={() => removeAction(action.id)}
                  aria-label="Quitar accion"
                >
                  ×
                </Button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" onClick={addAction}>
            + Anadir accion manual
          </Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        title="Eliminar objetivo"
        onClose={() => setToDelete(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Si, eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Se eliminara el objetivo <strong>{toDelete?.title}</strong> y su plan de desarrollo. Esta
          accion no se puede deshacer.
        </p>
      </Modal>
    </AppShell>
  );
};
