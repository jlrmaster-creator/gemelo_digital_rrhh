import { LEVEL_DEFINITIONS } from '@/domain/levels';
import type { Level } from '@/domain/types';

export interface LevelPickerProps {
  value: Level;
  onChange: (level: Level) => void;
  name?: string;
  compact?: boolean;
}

/**
 * Selector de nivel de competencia.
 *
 * Se implementa como un grupo de botones (radios) para que sea accesible con
 * teclado y lectores de pantalla, y para que la descripcion del nivel este
 * siempre visible.
 */
export const LevelPicker = ({ value, onChange, name = 'nivel', compact = false }: LevelPickerProps) => {
  const active = LEVEL_DEFINITIONS.find((definition) => definition.level === value);

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Nivel de competencia"
        className="grid grid-cols-5 gap-1.5"
      >
        {LEVEL_DEFINITIONS.map((definition) => {
          const isActive = definition.level === value;
          return (
            <label
              key={definition.level}
              className={`cursor-pointer rounded-lg border px-1 py-2 text-center transition-colors focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-1 ${
                isActive
                  ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={definition.level}
                checked={isActive}
                onChange={() => onChange(definition.level)}
                className="sr-only"
              />
              <span className="block text-xs font-semibold">{definition.level}</span>
              {!compact && (
                <span className="mt-0.5 block truncate text-[10px] uppercase tracking-wide">
                  {definition.short}
                </span>
              )}
            </label>
          );
        })}
      </div>
      {active && (
        <p className="mt-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{active.label}:</span> {active.description}
        </p>
      )}
    </div>
  );
};
