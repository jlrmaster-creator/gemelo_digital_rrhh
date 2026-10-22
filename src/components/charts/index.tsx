import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildLevelComparison } from '@/domain/analytics';
import { LEVEL_DEFINITIONS } from '@/domain/levels';
import type { Competency, Goal, Level } from '@/domain/types';

const AXIS_COLOR = '#64748b';
const GRID_COLOR = '#e2e8f0';

/** Grafico radar con las competencias mas relevantes del perfil. */
export const CompetencyRadar = ({
  data,
  height = 260,
}: {
  data: { competency: string; nivel: number; maximo: number }[];
  height?: number;
}) => (
  <div style={{ width: '100%', height }}>
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke={GRID_COLOR} />
        <PolarAngleAxis dataKey="competency" tick={{ fill: AXIS_COLOR, fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 5]} tick={{ fill: AXIS_COLOR, fontSize: 10 }} tickCount={6} />
        <Radar
          name="Nivel actual"
          dataKey="nivel"
          stroke="#059669"
          fill="#10B981"
          fillOpacity={0.35}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          formatter={(value) => [String(value), 'Nivel']}
        />
      </RadarChart>
    </ResponsiveContainer>
  </div>
);

/** Comparacion entre el nivel actual y el nivel objetivo de cada competencia. */
export const LevelComparisonChart = ({
  competencies,
  goals,
  height = 280,
}: {
  competencies: Competency[];
  goals: Goal[];
  height?: number;
}) => {
  const data = buildLevelComparison(competencies, goals).slice(0, 12).map((item) => ({
    name: item.name,
    Actual: item.current,
    Objetivo: item.target,
  }));

  if (data.length === 0) return null;

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
          <XAxis type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: AXIS_COLOR, fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fill: AXIS_COLOR, fontSize: 11 }}
            interval={0}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            formatter={(value, name) => [
              `${String(value)} (${LEVEL_DEFINITIONS.find((d) => d.level === Number(value))?.short ?? ''})`,
              String(name),
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Actual" fill="#10B981" radius={[0, 4, 4, 0]} barSize={10} />
          <Bar dataKey="Objetivo" fill="#CBD5E1" radius={[0, 4, 4, 0]} barSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Nivel medio por categoria de competencia. */
export const CategoryChart = ({
  data,
  height = 220,
}: {
  data: { category: string; average: number; count: number }[];
  height?: number;
}) => {
  if (data.length === 0) return null;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="category" tick={{ fill: AXIS_COLOR, fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
          <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: AXIS_COLOR, fontSize: 11 }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            formatter={(value, _name, item) => [
              `${String(value)} (${item?.payload?.count ?? 0} competencias)`,
              'Nivel medio',
            ]}
          />
          <Bar dataKey="average" fill="#0EA5E9" radius={[4, 4, 0, 0]} barSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Evidencia visual del nivel de una competencia (1-5 marcas). */
export const LevelDots = ({ level, max = 5 }: { level: Level; max?: number }) => (
  <span className="inline-flex items-center gap-1" aria-label={`Nivel ${level} de ${max}`}>
    {Array.from({ length: max }).map((_, index) => (
      <span
        key={index}
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${
          index < level ? 'bg-brand-500' : 'bg-slate-200'
        }`}
      />
    ))}
  </span>
);
