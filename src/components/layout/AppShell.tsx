import type { ReactNode } from 'react';
import { NavBar } from './NavBar';

export interface AppShellProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const AppShell = ({ children, title, description, actions }: AppShellProps) => (
  <div className="min-h-screen bg-slate-50">
    <NavBar />
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-12">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </main>
    <footer className="mx-auto max-w-6xl px-4 pb-24 text-center text-xs text-slate-400 md:pb-8">
      Gemelo Digital del Talento · Herramienta de reflexion profesional. No realiza decisiones
      automaticas sobre las personas.
    </footer>
  </div>
);
