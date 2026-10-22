import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { useTwin } from '@/app/TwinContext';
import { downloadPersonalReport } from '@/pdf/personalReport';
import { buildTwinSummary } from '@/domain/analytics';

export const ReportsPage = () => {
  const { twin, profile, competencies, goals, history } = useTwin();
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const summary = buildTwinSummary(competencies, goals);

  const handleDownload = () => {
    setGenerating(true);
    setMessage(null);
    // Se difiere el render para que el boton muestre el estado de carga.
    window.setTimeout(() => {
      try {
        const fileName = downloadPersonalReport({
          twin,
          profile,
          competencies,
          goals,
          history,
        });
        setMessage({
          tone: 'success',
          text: `Informe generado correctamente (${fileName}).`,
        });
      } catch (error) {
        setMessage({
          tone: 'error',
          text:
            (error as Error).message ||
            'No se ha podido generar el informe en este navegador.',
        });
      } finally {
        setGenerating(false);
      }
    }, 50);
  };

  return (
    <AppShell
      title="Informes"
      description="Genera documentos PDF en tu navegador. Ningun dato sale de tu dispositivo ni se envia por correo."
    >
      <div className="space-y-5">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}

        <Card>
          <CardHeader
            title="Informe personal: «Mi Gemelo Digital»"
            description="Resumen del perfil, competencias, fortalezas, objetivos, plan de desarrollo y evolucion registrada."
          />
          <ul className="mb-5 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <li>· Resumen del perfil y nivel medio</li>
            <li>· Competencias actuales con grafico de barras</li>
            <li>· Fortalezas y competencias a mejorar</li>
            <li>· Objetivos profesionales con progreso</li>
            <li>· Plan de desarrollo (acciones)</li>
            <li>· Evolucion registrada</li>
          </ul>
          <Button onClick={handleDownload} loading={generating} size="lg">
            Descargar informe PDF
          </Button>
        </Card>

        <Card>
          <CardHeader
            title="Informe profesional compartido"
            description="Lo genera el personal de RR. HH. autorizado, con los datos que la persona ha compartido y el alcance permitido."
          />
          <p className="text-sm text-slate-600">
            El informe compartido se genera desde la seccion <strong>RR. HH.</strong> y respeta el
            alcance elegido por cada persona (resumen o perfil completo). No se envia automaticamente
            ni se publica en ningun sitio.
          </p>
        </Card>

        <Card>
          <CardHeader title="Resumen de lo que se incluira" />
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Competencias</dt>
              <dd className="text-lg font-bold text-slate-900">{summary.competencyCount}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Objetivos</dt>
              <dd className="text-lg font-bold text-slate-900">{summary.goalCount}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Eventos de evolucion</dt>
              <dd className="text-lg font-bold text-slate-900">{history.length}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </AppShell>
  );
};
