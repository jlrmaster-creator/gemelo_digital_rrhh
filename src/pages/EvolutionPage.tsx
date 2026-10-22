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
import { useTwin } from '@/app/TwinContext';
import { HISTORY_EVENT_LABELS } from '@/domain/types';
import { levelLabel } from '@/domain/levels';
import type { HistoryEventType, Level } from '@/domain/types';

const EVENT_TYPE_TONES: Record<HistoryEventType, 'brand' | 'sky' | 'violet' | 'amber' | 'emerald' | 'neutral'> = {
  competency_added: 'brand',
  level_updated: 'sky',
  training_completed: 'violet',
  goal_completed: 'emerald',
  experience_added: 'amber',
  goal_created: 'neutral',
  goal_updated: 'neutral',
  note: 'neutral',
};

interface FormState {
  type: HistoryEventType;
  title: string;
  description: string;
  competencyId: string;
  fromLevel: Level;
  toLevel: Level;
  withLevels: boolean;
}

const EMPTY_FORM: FormState = {
  type: 'training_completed',
  title: '',
  description: '',
  competencyId: '',
  fromLevel: 1,
  toLevel: 2,
  withLevels: false,
};

export const EvolutionPage = () => {
  const { history, competencies, recordEvent, removeEvent } = useTwin();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof history>();
    history.forEach((event) => {
      const date = event.createdAt ? event.createdAt.toDate() : null;
      const key = date ? date.toISOString().slice(0, 10) : 'sin-fecha';
      const bucket = map.get(key) ?? [];
      bucket.push(event);
      map.set(key, bucket);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [history]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length < 3) {
      setFormError('Describe el evento con al menos 3 caracteres.');
      return;
    }
    const competency = competencies.find((item) => item.id === form.competencyId);
    setSaving(true);
    setFormError(null);
    try {
      await recordEvent({
        type: form.type,
        title: form.title,
        description: form.description,
        competencyId: form.competencyId || null,
        competencyName: competency?.name ?? '',
        fromLevel: form.withLevels ? form.fromLevel : null,
        toLevel: form.withLevels ? form.toLevel : null,
      });
      setForm(EMPTY_FORM);
      setOpen(false);
    } catch (error) {
      setFormError((error as Error).message || 'No se ha podido registrar el evento.');
    } finally {
      setSaving(false);
    }
  };

  const formatDay = (key: string) => {
    if (key === 'sin-fecha') return 'Sin fecha';
    const date = new Date(`${key}T00:00:00`);
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  return (
    <AppShell
      title="Evolucion del perfil"
      description="Linea temporal de los cambios relevantes de tu gemelo digital. El historial se conserva y no se sobrescribe."
      actions={
        <Button onClick={() => setOpen(true)}>
          <span aria-hidden="true">+</span> Registrar evento
        </Button>
      }
    >
      {history.length === 0 ? (
        <EmptyState
          title="Todavia no hay eventos registrados"
          description="Registra formaciones, cambios de nivel, nuevas experiencias o hitos de tus objetivos."
          icon="○"
          action={<Button onClick={() => setOpen(true)}>Registrar el primero</Button>}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, events]) => (
            <div key={day}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {formatDay(day)}
              </p>
              <ol className="relative space-y-3 border-l-2 border-slate-200 pl-5">
                {events.map((event) => (
                  <li key={event.id} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[27px] top-4 h-3 w-3 rounded-full border-2 border-white bg-brand-500"
                    />
                    <Card>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <Badge tone={EVENT_TYPE_TONES[event.type]}>
                              {HISTORY_EVENT_LABELS[event.type]}
                            </Badge>
                            {event.competencyName && (
                              <Badge tone="violet">{event.competencyName}</Badge>
                            )}
                            {event.fromLevel && event.toLevel && (
                              <Badge tone="sky">
                                {levelLabel(event.fromLevel)} → {levelLabel(event.toLevel)}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-slate-900">{event.title}</p>
                          {event.description && (
                            <p className="mt-1 text-sm text-slate-600">{event.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => setToDelete(event.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title="Registrar evento de evolucion"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              Guardar evento
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
          <Field label="Tipo de evento" htmlFor="eventType" required>
            <Select
              id="eventType"
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value as HistoryEventType })
              }
            >
              {Object.entries(HISTORY_EVENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Titulo" htmlFor="eventTitle" required>
            <Input
              id="eventTitle"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Ej. Formacion de comunicacion no verbal"
              required
            />
          </Field>

          <Field label="Descripcion" htmlFor="eventDescription" hint="Opcional.">
            <Textarea
              id="eventDescription"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
              maxLength={1000}
            />
          </Field>

          <Field label="Competencia relacionada" htmlFor="eventCompetency" hint="Opcional.">
            <Select
              id="eventCompetency"
              value={form.competencyId}
              onChange={(event) => setForm({ ...form, competencyId: event.target.value })}
            >
              <option value="">Sin competencia relacionada</option>
              {competencies.map((competency) => (
                <option key={competency.id} value={competency.id}>
                  {competency.name}
                </option>
              ))}
            </Select>
          </Field>

          <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.withLevels}
              onChange={(event) => setForm({ ...form, withLevels: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Indicar cambio de nivel
          </label>

          {form.withLevels && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nivel anterior">
                <LevelPicker
                  value={form.fromLevel}
                  onChange={(level) => setForm({ ...form, fromLevel: level })}
                  name="nivel-anterior"
                  compact
                />
              </Field>
              <Field label="Nivel nuevo">
                <LevelPicker
                  value={form.toLevel}
                  onChange={(level) => setForm({ ...form, toLevel: level })}
                  name="nivel-nuevo"
                  compact
                />
              </Field>
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        title="Eliminar evento"
        onClose={() => setToDelete(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (toDelete) await removeEvent(toDelete);
                setToDelete(null);
              }}
            >
              Si, eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          El evento se eliminara de la linea temporal. Esta accion no se puede deshacer.
        </p>
      </Modal>
    </AppShell>
  );
};
