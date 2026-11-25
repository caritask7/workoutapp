"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDecimal, formatDayMonth } from "@/lib/format";

/**
 * Graphiques à une série (accent lime unique, pas de légende : le titre de la
 * carte nomme la série). Grille et axes discrets, infobulle avec réticule.
 */
const AXIS = { stroke: "transparent", tick: { fill: "#8e92a0", fontSize: 11, fontFamily: "var(--font-space-grotesk)" } };
const GRID = "#292a2c";

export interface Point {
  date: string;
  value: number;
}

interface TipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown; payload?: unknown }>;
  unit: string;
}

function ChartTooltip({ active, payload, unit }: TipProps) {
  const p = payload?.[0];
  if (!active || !p) return null;
  const point = p.payload as Point & { label?: string };
  return (
    <div className="rounded-xl border border-line-strong bg-[#222326] px-3 py-2 shadow-xl">
      <p className="font-display text-[16px] font-bold text-ink-strong tabular">
        {formatDecimal(Number(p.value))} <span className="text-[12px] text-muted">{unit}</span>
      </p>
      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <span aria-hidden className="inline-block h-0.5 w-3 rounded bg-lime" />
        {point.label ?? formatDayMonth(point.date)}
      </p>
    </div>
  );
}

/** Courbe d'évolution (poids, charge max…) avec ligne de cible optionnelle. */
export function TrendChart({
  data,
  unit,
  target,
  targetLabel,
  height = 200,
  ariaLabel,
}: {
  data: Point[];
  unit: string;
  target?: number | null;
  targetLabel?: string;
  height?: number;
  ariaLabel: string;
}) {
  const values = data.map((d) => d.value).concat(target != null ? [target] : []);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(0.5, (max - min) * 0.15);
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 18, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a3fa00" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#a3fa00" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d: string) => formatDayMonth(d)} {...AXIS} minTickGap={24} tickMargin={8} />
          <YAxis domain={[Math.floor(min - pad), Math.ceil(max + pad)]} {...AXIS} width={44} tickFormatter={(v: number) => formatDecimal(v)} />
          {target != null && (
            <ReferenceLine
              y={target}
              stroke="#c7c6ce"
              strokeDasharray="4 4"
              label={{ value: targetLabel ?? `Cible ${formatDecimal(target)} ${unit}`, position: "insideTopLeft", fill: "#c7c6ce", fontSize: 10, fontFamily: "var(--font-space-grotesk)" }}
            />
          )}
          <Tooltip content={(props) => <ChartTooltip active={props.active} payload={props.payload} unit={unit} />} cursor={{ stroke: "#5e6168", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#a3fa00"
            strokeWidth={2}
            fill="url(#trend-fill)"
            dot={{ r: 4, fill: "#a3fa00", stroke: "#1b1c1e", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#a3fa00", stroke: "#1b1c1e", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barres (volume hebdomadaire, séances par semaine). */
export function BarsChart({ data, unit, height = 160, ariaLabel }: { data: (Point & { label: string })[]; unit: string; height?: number; ariaLabel: string }) {
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barCategoryGap="22%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" tickMargin={8} />
          <YAxis {...AXIS} width={44} allowDecimals={false} tickFormatter={(v: number) => (v >= 1000 ? `${formatDecimal(v / 1000)}t` : String(v))} />
          <Tooltip content={(props) => <ChartTooltip active={props.active} payload={props.payload} unit={unit} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" fill="#a3fa00" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
