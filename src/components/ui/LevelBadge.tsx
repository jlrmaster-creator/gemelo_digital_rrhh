import { LEVEL_BY_NUMBER } from '@/domain/levels';
import type { Level } from '@/domain/types';

export interface LevelBadgeProps {
  level: Level;
  showLabel?: boolean;
}

const TONE_BY_LEVEL: Record<Level, 'rose' | 'amber' | 'sky' | 'brand' | 'violet'> = {
  1: 'rose',
  2: 'amber',
  3: 'sky',
  4: 'brand',
  5: 'violet',
};

/** Distintivo compacto con el nivel numerico y su etiqueta. */
export const LevelBadge = ({ level, showLabel = true }: LevelBadgeProps) => {
  const definition = LEVEL_BY_NUMBER[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        {
          rose: 'bg-rose-50 text-rose-700 ring-rose-200',
          amber: 'bg-amber-50 text-amber-800 ring-amber-200',
          sky: 'bg-sky-50 text-sky-800 ring-sky-200',
          brand: 'bg-brand-50 text-brand-700 ring-brand-200',
          violet: 'bg-violet-50 text-violet-700 ring-violet-200',
        }[TONE_BY_LEVEL[level]]
      }`}
      title={definition?.description}
    >
      <span className="font-bold tabular-nums">{level}</span>
      {showLabel && <span>{definition?.short}</span>}
    </span>
  );
};
