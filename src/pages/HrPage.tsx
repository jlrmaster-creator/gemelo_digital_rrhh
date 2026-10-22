import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/auth/AuthContext';
import { subscribeReceivedGrants, type SharedProfileGrant } from '@/data/sharing';
import { subscribeMyOrganizations } from '@/data/organizations';
import { formatShortDate } from '@/data/shared';
import type { Organization } from '@/domain/types';

export const HrPage = () => {
  const { user } = useAuth();
  const uid = user?.uid ?? '';

  const [grants, setGrants] = useState<SharedProfileGrant[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeReceivedGrants(
      uid,
      (next) => {
        setGrants(next);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeMyOrganizations(uid, setOrganizations, (err) =>
      setError(err.message),
    );
    return unsubscribe;
  }, [uid]);

  const active = useMemo(() => grants.filter((grant) => !grant.revokedAt), [grants]);
  const revoked = useMemo(() => grants.filter((grant) => grant.revokedAt), [grants]);

  return (
    <AppShell
      title="Recursos Humanos"
      description="Perfiles que las personas de tu organizacion han compartido contigo de forma explicita."
    >
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        {loading ? (
          <Spinner label="Cargando perfiles compartidos..." />
        ) : active.length === 0 ? (
          <EmptyState
            title="No hay perfiles compartidos"
            description="Cuando una persona de tu organizacion comparta su gemelo digital, aparecera aqui."
            icon="◇"
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((grant) => (
              <Card key={`${grant.twinId}-${grant.orgId}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">Perfil profesional compartido</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Organizacion: {grant.orgName} · Concedido el{' '}
                      {formatShortDate(grant.grantedAt)}
                    </p>
                  </div>
                  <Badge tone={grant.scope === 'full' ? 'emerald' : 'sky'}>
                    {grant.scope === 'full' ? 'Perfil completo' : 'Solo resumen'}
                  </Badge>
                </div>
                <Link
                  to={`/rrhh/${grant.twinId}`}
                  className="mt-4 inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                >
                  Consultar perfil
                </Link>
              </Card>
            ))}
          </div>
        )}

        {organizations.length > 0 && (
          <Card>
            <p className="text-sm font-semibold text-slate-800">Mis organizaciones</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {organizations.map((organization) => (
                <Badge key={organization.id} tone="violet">
                  {organization.name}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {revoked.length > 0 && (
          <Card>
            <p className="text-sm font-semibold text-slate-800">Accesos revocados</p>
            <p className="mt-1 text-sm text-slate-500">
              Estas personas han retirado el acceso. Ya no puedes consultar su perfil.
            </p>
            <ul className="mt-3 space-y-2">
              {revoked.map((grant) => (
                <li
                  key={`${grant.twinId}-${grant.orgId}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm text-slate-700">{grant.orgName}</span>
                  <span className="text-xs text-slate-500">
                    Revocado el {formatShortDate(grant.revokedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Alert tone="info" title="Alcance de esta vista">
          Solo puedes consultar los perfiles que las personas han compartido contigo. Esta herramienta
          no calcula puntuaciones de rendimiento ni decisiones automaticas sobre las personas.
        </Alert>
      </div>
    </AppShell>
  );
};
