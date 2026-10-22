export interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: 'brand' | 'sky' | 'amber' | 'rose';
  label?: string;
  showValue?: boolean;
  className?: string;
}

const TONES = {
  brand: 'bg-brand-600',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
} as const;

export const ProgressBar = ({
  value,
  max = 100,
  tone = 'brand',
  label,
  showValue = false,
  className = '',
}: ProgressBarProps) => {
  const safeMax = max <= 0 ? 100 : max;
  const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100));
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
          {label && <span className="font-medium">{label}</span>}
          {showValue && <span className="tabular-nums">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progreso'}
      >
        <div
          className={`h-full rounded-full transition-all ${TONES[tone]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
