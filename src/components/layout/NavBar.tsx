import { NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/auth/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const iconClass = 'h-5 w-5';

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Panel',
    end: true,
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-8 9 8M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    to: '/competencias',
    label: 'Competencias',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 15l3-4 3 2 4-6" />
      </svg>
    ),
  },
  {
    to: '/objetivos',
    label: 'Objetivos',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    ),
  },
  {
    to: '/evolucion',
    label: 'Evolucion',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  {
    to: '/informes',
    label: 'Informes',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13H7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M10 13h6M10 17h6" />
      </svg>
    ),
  },
  {
    to: '/compartir',
    label: 'Compartir',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="17" cy="6" r="2.5" />
        <circle cx="17" cy="18" r="2.5" />
        <path strokeLinecap="round" d="M8.3 10.8l6.4-3.6M8.3 13.2l6.4 3.6" />
      </svg>
    ),
  },
];

const SECONDARY_ITEMS: NavItem[] = [
  {
    to: '/rrhh',
    label: 'RR. HH.',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 19v-2a3 3 0 00-3-3H7a3 3 0 00-3 3v2" />
        <circle cx="10" cy="8" r="3" />
        <path strokeLinecap="round" d="M18 9h3M18 13h3" />
      </svg>
    ),
  },
  {
    to: '/perfil',
    label: 'Perfil',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a16 16 0 000 16" />
      </svg>
    ),
  },
];

const linkBase =
  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors';

export const NavBar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/acceso', { replace: true });
  };

  const renderLink = (item: NavItem, mobile = false) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `${linkBase} ${
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        } ${mobile ? 'flex-1 flex-col gap-0.5 px-1 py-1.5 text-[11px]' : ''}`
      }
    >
      {item.icon}
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white"
          >
            GD
          </span>
          <span className="hidden text-sm font-semibold text-slate-900 sm:block">
            Gemelo Digital del Talento
          </span>
        </NavLink>

        <nav aria-label="Navegacion principal" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => renderLink(item))}
        </nav>

        <div className="flex items-center gap-2">
          {user?.email && (
            <span className="hidden max-w-[180px] truncate text-xs text-slate-500 lg:block">
              {user.email}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Salir
          </button>
        </div>
      </div>

      <nav
        aria-label="Navegacion secundaria"
        className="mx-auto hidden max-w-6xl items-center gap-1 border-t border-slate-100 px-4 py-2 md:flex"
      >
        {SECONDARY_ITEMS.map((item) => renderLink(item))}
      </nav>

      <nav
        aria-label="Navegacion movil"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/98 backdrop-blur md:hidden"
      >
        {NAV_ITEMS.map((item) => renderLink(item, true))}
      </nav>
    </header>
  );
};
