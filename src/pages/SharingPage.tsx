import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/auth/AuthContext';
import {
  createOrganization,
  findInvite,
  getOrganizationMembers,
  joinOrganization,
  subscribeMyOrganizations,
  type InviteInfo,
} from '@/data/organizations';
import {
  revokeSharingMember,
  shareWithOrganization,
  subscribeSharingGrants,
} from '@/data/sharing';
import type { Organization, OrganizationMember, SharingGrant, SharingScope } from '@/domain/types';

export const SharingPage = () => {
  const { user } = useAuth();
  const uid = user?.uid ?? '';

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [membersByOrg, setMembersByOrg] = useState<Record<string, OrganizationMember[]>>({});
  const [grants, setGrants] = useState<SharingGrant[]>([]);
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(
    null,
  );

  const [shareOrg, setShareOrg] = useState<Organization | null>(null);
  const [scope, setScope] = useState<SharingScope>('full');
  const [sharing, setSharing] = useState(false);

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeMyOrganizations(uid, setOrganizations, (error) =>
      setMessage({ tone: 'error', text: error.message }),
    );
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeSharingGrants(uid, setGrants, (error) =>
      setMessage({ tone: 'error', text: error.message }),
    );
    return unsubscribe;
  }, [uid]);

  // Miembros de cada organizacion: permiten identificar a quien se ha dado acceso.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        organizations.map(async (organization) => {
          const members = await getOrganizationMembers(organization.id);
          return [organization.id, members] as const;
        }),
      );
      if (cancelled) return;
      setMembersByOrg(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [organizations]);

  const grantsByOrg = useMemo(() => {
    const map = new Map<string, SharingGrant[]>();
    grants.forEach((grant) => {
      const bucket = map.get(grant.orgId) ?? [];
      bucket.push(grant);
      map.set(grant.orgId, bucket);
    });
    return map;
  }, [grants]);

  const handleShare = async () => {
    if (!shareOrg) return;
    setSharing(true);
    try {
      const members = await getOrganizationMembers(shareOrg.id);
      await shareWithOrganization(
        uid,
        shareOrg.id,
        shareOrg.name,
        scope,
        members.map((member) => member.uid),
      );
      setMessage({
        tone: 'success',
        text: `Perfil compartido con ${shareOrg.name}. Los miembros autorizados ya pueden consultarlo.`,
      });
      setShareOrg(null);
    } catch (error) {
      setMessage({
        tone: 'error',
        text: (error as Error).message || 'No se ha podido compartir el perfil.',
      });
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async (grant: SharingGrant) => {
    try {
      await revokeSharingMember(uid, grant.memberUid);
      setMessage({
        tone: 'info',
        text: `Acceso retirado a ${grant.orgName}.`,
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: (error as Error).message || 'No se ha podido retirar el acceso.',
      });
    }
  };

  const handleFindInvite = async (event: FormEvent) => {
    event.preventDefault();
    setJoinError(null);
    try {
      const found = await findInvite(joinCode);
      if (!found) {
        setJoinError('El codigo no es valido. Comprueba que lo has copiado correctamente.');
        setInvite(null);
        return;
      }
      setInvite(found);
    } catch (error) {
      setJoinError((error as Error).message || 'No se ha podido validar el codigo.');
    }
  };

  const handleJoin = async () => {
    if (!invite) return;
    setJoining(true);
    setJoinError(null);
    try {
      await joinOrganization(uid, user?.email ?? '', invite);
      setMessage({
        tone: 'success',
        text: `Te has unido a ${invite.orgName}.`,
      });
      setJoinOpen(false);
      setJoinCode('');
      setInvite(null);
    } catch (error) {
      setJoinError((error as Error).message || 'No se ha podido completar la incorporacion.');
    } finally {
      setJoining(false);
    }
  };

  const handleCreateOrg = async (event: FormEvent) => {
    event.preventDefault();
    if (orgName.trim().length < 3) {
      setMessage({ tone: 'error', text: 'El nombre debe tener al menos 3 caracteres.' });
      return;
    }
    setCreating(true);
    try {
      const result = await createOrganization(uid, orgName, user?.email ?? '');
      setInviteCode(result.inviteCode);
      setCreateOpen(false);
      setOrgName('');
      setMessage({
        tone: 'success',
        text: `Organizacion creada. Comparte el codigo ${result.inviteCode} con las personas de RR. HH. que quieras incorporar.`,
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: (error as Error).message || 'No se ha podido crear la organizacion.',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell
      title="Compartir y permisos"
      description="Decide con quien compartes tu gemelo digital. Solo las personas que autorices pueden leerlo."
      actions={
        <>
          <Button variant="outline" onClick={() => setJoinOpen(true)}>
            Unirme con un codigo
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <span aria-hidden="true">+</span> Crear organizacion
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {message && (
          <Alert tone={message.tone === 'info' ? 'info' : message.tone} onDismiss={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {inviteCode && (
          <Alert tone="success" title="Codigo de invitacion">
            <p>
              Comparte este codigo con las personas de RR. HH. que quieres incorporar en{' '}
              <strong>{inviteCode}</strong>. Podran entrar con la opcion «Unirme con un codigo».
            </p>
          </Alert>
        )}

        <Card>
          <CardHeader
            title="Mis organizaciones"
            description="Comparte tu gemelo digital con una organizacion de la que formes parte."
          />
          {organizations.length === 0 ? (
            <EmptyState
              title="No perteneces a ninguna organizacion"
              description="Crea una organizacion para gestionar los accesos de tu equipo, o unete con el codigo que te hayan facilitado."
              icon="⌂"
            />
          ) : (
            <ul className="space-y-3">
              {organizations.map((organization) => {
                const orgGrants = grantsByOrg.get(organization.id) ?? [];
                const active = orgGrants.filter((grant) => !grant.revokedAt);
                return (
                  <li key={organization.id}>
                    <Card className="bg-slate-50/60">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{organization.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {active.length === 0
                              ? 'Perfil no compartido'
                              : `Compartido con ${active.length} persona${active.length === 1 ? '' : 's'}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {active.length > 0 && (
                            <Badge tone="emerald">Compartido</Badge>
                          )}
                          <Button
                            size="sm"
                            variant={active.length > 0 ? 'outline' : 'primary'}
                            onClick={() => {
                              setShareOrg(organization);
                              setScope('full');
                            }}
                          >
                            {active.length > 0 ? 'Actualizar permisos' : 'Compartir perfil'}
                          </Button>
                        </div>
                      </div>

                      {active.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {active.map((grant) => {
                            const member = (membersByOrg[organization.id] ?? []).find(
                              (item) => item.uid === grant.memberUid,
                            );
                            return (
                              <li
                                key={grant.memberUid}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800">
                                    {member?.email || `Miembro de ${grant.orgName}`}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Alcance: {grant.scope === 'full' ? 'Perfil completo' : 'Solo resumen'}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-rose-600 hover:bg-rose-50"
                                  onClick={() => handleRevoke(grant)}
                                >
                                  Retirar acceso
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Como funciona la comparticion" />
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
            <li>Cada persona de RR. HH. recibe un permiso explicito, registrado y revocable.</li>
            <li>Puedes elegir entre compartir un resumen o el perfil completo.</li>
            <li>Al retirar el acceso, la persona deja de poder leer tus datos de inmediato.</li>
            <li>Nadie accede a tu perfil sin tu consentimiento: las reglas de seguridad lo bloquean.</li>
          </ul>
        </Card>
      </div>

      <Modal
        open={Boolean(shareOrg)}
        title={`Compartir con ${shareOrg?.name ?? ''}`}
        description="Se creara un permiso individual para cada miembro de la organizacion."
        onClose={() => setShareOrg(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShareOrg(null)}>
              Cancelar
            </Button>
            <Button onClick={handleShare} loading={sharing}>
              Compartir
            </Button>
          </>
        }
      >
        <Field label="Alcance de los datos compartidos" htmlFor="scope">
          <Select
            id="scope"
            value={scope}
            onChange={(event) => setScope(event.target.value as SharingScope)}
          >
            <option value="summary">Solo resumen: perfil basico y competencias</option>
            <option value="full">Perfil completo: incluye objetivos, plan y evolucion</option>
          </Select>
        </Field>
        <Alert tone="info">
          Puedes cambiar el alcance o retirar el acceso en cualquier momento desde esta misma pagina.
        </Alert>
      </Modal>

      <Modal
        open={joinOpen}
        title="Unirme a una organizacion"
        description="Introduce el codigo de invitacion que te ha facilitado la persona administradora."
        onClose={() => {
          setJoinOpen(false);
          setInvite(null);
          setJoinError(null);
        }}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setJoinOpen(false);
                setInvite(null);
                setJoinError(null);
              }}
            >
              Cerrar
            </Button>
            {invite ? (
              <Button onClick={handleJoin} loading={joining}>
                Unirme a {invite.orgName}
              </Button>
            ) : (
              <Button onClick={handleFindInvite}>Validar codigo</Button>
            )}
          </>
        }
      >
        {joinError && (
          <div className="mb-4">
            <Alert tone="error">{joinError}</Alert>
          </div>
        )}
        {!invite ? (
          <form onSubmit={handleFindInvite}>
            <Field label="Codigo de invitacion" htmlFor="inviteCode" required>
              <Input
                id="inviteCode"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="EJEMPLO123456"
                required
              />
            </Field>
          </form>
        ) : (
          <Alert tone="success" title="Codigo valido">
            Te uniras a la organizacion <strong>{invite.orgName}</strong> con permisos de consulta de
            los perfiles compartidos.
          </Alert>
        )}
      </Modal>

      <Modal
        open={createOpen}
        title="Crear organizacion"
        description="Seras la persona administradora y podras incorporar al resto de miembros con un codigo."
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOrg} loading={creating}>
              Crear
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateOrg}>
          <Field label="Nombre de la organizacion" htmlFor="orgName" required>
            <Input
              id="orgName"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder="Ej. equipo de RR. HH. de_logloss"
              required
            />
          </Field>
        </form>
      </Modal>
    </AppShell>
  );
};
