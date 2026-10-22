import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<Tone, { wrapper: string; icon: string }> = {
  info: { wrapper: 'bg-sky-50 text-sky-900 border-sky-200', icon: 'text-sky-600' },
  success: { wrapper: 'bg-emerald-50 text-emerald-900 border-emerald-200', icon: 'text-emerald-600' },
  warning: { wrapper: 'bg-amber-50 text-amber-900 border-amber-200', icon: 'text-amber-600' },
  error: { wrapper: 'bg-rose-50 text-rose-900 border-rose-200', icon: 'text-rose-600' },
};

const ICONS: Record<Tone, string> = {
  info: 'i',
  success: '✓',
  warning: '!',
  error: '×',
};

export interface AlertProps {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
}

export const Alert = ({ tone = 'info', title, children, onDismiss }: AlertProps) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${TONES[tone].wrapper}`}
  >
    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/70 text-xs font-bold ${TONES[tone].icon}`}
    >
      {ICONS[tone]}
    </span>
    <div className="flex-1">
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? 'mt-0.5' : ''}>{children}</div>
    </div>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar aviso"
        className="rounded p-0.5 text-current/70 transition-colors hover:bg-white/60"
      >
        ×
      </button>
    )}
  </div>
);
