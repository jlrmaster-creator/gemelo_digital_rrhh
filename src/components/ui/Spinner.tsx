export interface SpinnerProps {
  label?: string;
  className?: string;
}

export const Spinner = ({ label = 'Cargando', className = '' }: SpinnerProps) => (
  <div className={`flex items-center justify-center gap-3 py-10 text-sm text-slate-500 ${className}`}>
    <span
      aria-hidden="true"
      className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
    />
    <span>{label}</span>
  </div>
);
