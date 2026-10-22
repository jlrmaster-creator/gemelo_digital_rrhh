import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export const Card = ({ children, padded = true, className = '', ...rest }: CardProps) => (
  <div
    className={`rounded-xl border border-slate-200 bg-white shadow-sm ${padded ? 'p-5' : ''} ${className}`}
    {...rest}
  >
    {children}
  </div>
);

export interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export const CardHeader = ({ title, description, action }: CardHeaderProps) => (
  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
    </div>
    {action}
  </div>
);
