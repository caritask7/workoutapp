"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { Card, CardHeader, EmptyState, PageSkeleton, SegmentedControl } from "@/components/ui";
import { BodyMap, setsToIntensity, type Intensity } from "./body-map";
import { useData } from "@/hooks/use-data";
import { muscleSetCounts } from "@/lib/domain/training";
import { formatDecimal } from "@/lib/format";
import { MUSCLE_BY_ID } from "@/data/seed/muscles";
import type { BodyView, MuscleId } from "@/types/domain";

const LEGEND: { level: Intensity; label: string; swatch: string }[] = [
  { level: 1, label: "1-3", swatch: "bg-lime/25" },
  { level: 2, label: "4-7", swatch: "bg-lime/65" },
  { level: 3, label: "8+", swatch: "bg-lime" },
];

/**
 * Carte de chaleur musculaire (DESIGN.md › Anatomical Muscle Heatmap Pods) :
 * séries validées par semaine et par muscle sur la période.
 */
export function MuscleHeatmap({ from, weeks }: { from: string; weeks: number }) {
  const [view, setView] = useState<BodyView>("front");
  const data = useData(
    async (s) => {
      const sessions = await s.sessions.listCompletedSessions({ from });
      const [sets, exercises] = await Promise.all([s.sessions.completedSetsFor(sessions.map((x) => x.id)), s.catalog.listExercises()]);
      return muscleSetCounts(sets, new Map(exercises.map((e) => [e.id, e])));
    },
    [from],
  );

  if (data.loading) return <PageSkeleton blocks={1} />;
  const counts = data.data ?? {};
  const perWeek = Object.fromEntries(Object.entries(counts).map(([m, n]) => [m, n / Math.max(1, weeks)])) as Partial<Record<MuscleId, number>>;
  const intensity: Partial<Record<MuscleId, Intensity>> = Object.fromEntries(
    Object.entries(perWeek).map(([m, n]) => [m, setsToIntensity(n ?? 0)]),
  );
  const ranked = (Object.entries(perWeek) as [MuscleId, number][]).sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <CardHeader icon={<Activity />} title="Répartition musculaire" aside={<span className="text-label-caps text-muted">séries / semaine</span>} />
      {ranked.length === 0 ? (
        <EmptyState icon={<Activity />} title="Aucune série sur la période">
          Les muscles travaillés s&apos;illumineront au fil de vos séances.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-4">
          <div>
            <SegmentedControl
              label="Vue anatomique"
              value={view}
              onChange={setView}
              options={[
                { value: "front", label: "Face" },
                { value: "back", label: "Dos" },
              ]}
            />
            <BodyMap view={view} intensity={intensity} title="Carte de chaleur des muscles travaillés" className="mt-3 max-w-[180px]" />
            <ul className="mt-3 flex justify-center gap-3" aria-label="Légende">
              {LEGEND.map((l) => (
                <li key={l.level} className="flex items-center gap-1.5 text-[11px] text-muted">
                  <span aria-hidden className={`size-3 rounded ${l.swatch}`} />
                  {l.label}
                </li>
              ))}
            </ul>
          </div>
          <ol className="flex flex-col gap-2 text-[13px]">
            {ranked.slice(0, 10).map(([m, n]) => (
              <li key={m} className="flex items-center justify-between gap-2">
                <span className="truncate text-ink">{MUSCLE_BY_ID[m]?.name ?? m}</span>
                <span className="shrink-0 font-display font-semibold text-ink-strong tabular">{formatDecimal(Math.round(n * 10) / 10)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="mt-4 text-[11px] text-subtle">Muscle principal = 1 série, secondaire = ½ série. Moyenne hebdomadaire sur la période.</p>
    </Card>
  );
}
