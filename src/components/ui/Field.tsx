import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

const BASE_FIELD =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-50 disabled:text-slate-500';

export const Label = ({ className = '', ...rest }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={`mb-1.5 block text-sm font-medium text-slate-700 ${className}`}
    {...rest}
  />
);

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export const Field = ({ label, htmlFor, hint, error, required, children }: FieldProps) => (
  <div className="mb-4">
    <Label htmlFor={htmlFor}>
      {label}
      {required && (
        <span className="ml-1 text-rose-600" aria-hidden="true">
          *
        </span>
      )}
    </Label>
    {children}
    {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    {error && (
      <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
        {error}
      </p>
    )}
  </div>
);

export const Input = ({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={`${BASE_FIELD} ${className}`} {...rest} />
);

export const Textarea = ({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={`${BASE_FIELD} min-h-[96px] resize-y ${className}`} {...rest} />
);

export const Select = ({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={`${BASE_FIELD} ${className}`} {...rest}>
    {children}
  </select>
);
