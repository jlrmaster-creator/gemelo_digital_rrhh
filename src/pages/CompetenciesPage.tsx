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
import { COMPETENCY_CATEGORIES } from '@/domain/actionCatalog';
import { LEVEL_BY_NUMBER } from '@/domain/levels';
import { getCategorySummary, getStrengths } from '@/domain/analytics';
import type { Competency, Level } from '@/domain/types';

interface FormState {
  name: string;
  category: string;
  level: Level;
  description: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  category: COMPETENCY_CATEGORIES[0],
  level: 3,
  description: '',
};

export const CompetenciesPage = () => {
  const { competencies, createCompetency, updateCompetency, removeCompetency } = useTwin();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Competency | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Competency | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<string>('todas');

  const categories = useMemo(() => {
    const set = new Set(competencies.map((competency) => competency.category));
    return ['todas', ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [competencies]);

  const visible = useMemo(
    () =>
      filter === 'todas'
        ? competencies
        : competencies.filter((competency) => competency.category === filter),
    [competencies, filter],
  );

  const strengthNames = useMemo(
    () => new Set(getStrengths(competencies).map((competency) => competency.id)),
    [competencies],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (competency: Competency) => {
    setEditing(competency);
    setForm({
      name: competency.name,
      category: competency.category,
      level: competency.level,
      description: competency.description,
    });
    setFormError(null);
    setOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      setFormError('Escribe un nombre de competencia de al menos 2 caracteres.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateCompetency(editing.id, form);
      } else {
        await createCompetency(form);
      }
      setOpen(false);
    } catch (error) {
      setFormError((error as Error).message || 'No se ha podido guardar la competencia.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await removeCompetency(toDelete.id);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const categorySummary = getCategorySummary(competencies);

  return (
    <AppShell
      title="Competencias"
      description="Registra las competencias de tu perfil y el nivel que consideras que tienes hoy en cada una."
      actions={
        <Button onClick={openCreate}>
          <span aria-hidden="true">+</span> Nueva competencia
        </Button>
      }
    >
      {competencies.length === 0 ? (
        <EmptyState
          title="Todavia no tienes competencias"
          description="Anade tus competencias principales y asigna a cada una el nivel que mejor refleje tu situacion actual."
          icon="◇"
          action={<Button onClick={openCreate}>Anadir competencia</Button>}
        />
      ) : (
        <div className="space-y-5">
          <Card padded={false}>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Filtrar por categoria
              </span>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFilter(category)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === category
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {category === 'todas' ? 'Todas' : category}
                </button>
              ))}
            </div>
          </Card>

          {categorySummary.length > 0 && (
            <Card>
              <p className="text-sm font-semibold text-slate-800">Resumen por categoria</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {categorySummary.map((item) => (
                  <Badge key={item.category} tone="sky">
                    {item.category}: {item.average.toFixed(1)} / 5 ({item.count})
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {visible.length === 0 ? (
            <EmptyState
              title="No hay competencias en esta categoria"
              description="Cambia el filtro o anade una competencia nueva."
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {visible.map((competency) => (
                <li key={competency.id}>
                  <Card className="h-full">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{competency.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{competency.category}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge tone={strengthNames.has(competency.id) ? 'emerald' : 'neutral'}>
                          {competency.level} · {LEVEL_BY_NUMBER[competency.level]?.short}
                        </Badge>
                      </div>
                    </div>
                    {competency.description && (
                      <p className="mt-3 text-sm text-slate-600">{competency.description}</p>
                    )}
                    <p className="mt-3 text-xs text-slate-500">
                      {LEVEL_BY_NUMBER[competency.level]?.description}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(competency)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50"
                        onClick={() => setToDelete(competency)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal
        open={open}
        title={editing ? 'Editar competencia' : 'Nueva competencia'}
        description="Los datos se declaran manualmente: no se infieren ni se completan automaticamente."
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
          <Field label="Nombre de la competencia" htmlFor="name" required>
            <Input
              id="name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Ej. Comunicacion escrita"
              required
            />
          </Field>
          <Field label="Categoria" htmlFor="category">
            <Select
              id="category"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {COMPETENCY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
              {form.category && !COMPETENCY_CATEGORIES.includes(form.category as never) && (
                <option value={form.category}>{form.category}</option>
              )}
            </Select>
          </Field>
          <Field label="Nivel actual" required>
            <LevelPicker
              value={form.level}
              onChange={(level) => setForm({ ...form, level })}
              name="nivel-competencia"
            />
          </Field>
          <Field
            label="Descripcion"
            htmlFor="description"
            hint="Resume tu experiencia real en esta competencia (opcional)."
          >
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
              maxLength={1000}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        title="Eliminar competencia"
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
          Se eliminara <strong>{toDelete?.name}</strong> del perfil. Los objetivos que la referencian
          dejaran de estar vinculados a una competencia. Esta accion no se puede deshacer.
        </p>
      </Modal>
    </AppShell>
  );
};
