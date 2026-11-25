"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Columns2, Hand, PersonStanding, SlidersHorizontal, Zap } from "lucide-react";
import { Button, Card, Chip, ErrorState, LabelCaps, PageSkeleton, Pill, ProgressBar, SegmentedControl } from "@/components/ui";
import { PageHeader } from "@/components/layout/page-header";
import { BodyMap, type Intensity } from "@/components/body/body-map";
import { useData } from "@/hooks/use-data";
import { MUSCLE_BY_ID, MUSCLE_GROUPS } from "@/data/seed/muscles";
import { sessionDensity, suggestWorkout } from "@/lib/domain/builder";
import { MUSCLE_IDS, type BodyView, type MuscleId } from "@/types/domain";

const GOAL_PILL = { muscle_gain: "Hypertrophie", strength: "Force", fat_loss: "Sèche", maintenance: "Maintien" } as const;

const ZONE = {
  light: { label: "Séance légère", tone: "neutral" as const },
  target: { label: "Zone visée", tone: "lime-soft" as const },
  high: { label: "Volume élevé", tone: "neutral" as const },
  overload: { label: "Surcharge", tone: "danger" as const },
};

function parseMuscles(raw: string | null): MuscleId[] {
  if (!raw) return [];
  const valid = new Set<string>(MUSCLE_IDS);
  return raw.split(",").filter((m): m is MuscleId => valid.has(m));
}

/** Sélecteur anatomique (maquette muscle.png) → brouillon d'entraînement. */
export function MuscleSelectorScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [selected, setSelected] = useState<MuscleId[]>(() => parseMuscles(params.get("muscles")));
  const [view, setView] = useState<BodyView>("front");
  const catalog = useData((s) => s.catalog.listExercises());
  const profile = useData((s) => s.profile.getProfile());

  const draft = useMemo(() => (catalog.data ? suggestWorkout(selected, catalog.data) : []), [selected, catalog.data]);
  const byId = useMemo(() => new Map((catalog.data ?? []).map((e) => [e.id, e])), [catalog.data]);
  const density = sessionDensity(draft, byId);
  const minutes = Math.round(draft.reduce((sum, d) => sum + d.sets * (40 + d.restSec), 0) / 60 + draft.length);

  if (catalog.loading) return <PageSkeleton blocks={3} />;
  if (catalog.error) return <ErrorState message={catalog.error} onRetry={catalog.reload} />;

  const toggle = (m: MuscleId) => setSelected((list) => (list.includes(m) ? list.filter((x) => x !== m) : [...list, m]));
  const intensity: Partial<Record<MuscleId, Intensity>> = Object.fromEntries(selected.map((m) => [m, 3]));
  const labels = selected
    .filter((m) => MUSCLE_BY_ID[m].views.includes(view))
    .map((m) => ({ muscle: m, text: `${MUSCLE_BY_ID[m].shortName}${density.setsByMuscle[m] ? ` · ${density.setsByMuscle[m]}` : ""}` }));
  const unselected = MUSCLE_GROUPS.filter((m) => !selected.includes(m.id));
  const totalPct = Math.min(100, (density.totalSets / 28) * 100);

  const confirm = () => router.push(`/workouts/new?muscles=${selected.join(",")}`);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Créateur de séance"
        aside={profile.data && <Pill tone="outline">{GOAL_PILL[profile.data.goal]}</Pill>}
        title="CIBLAGE ANATOMIQUE"
        subtitle="Sélectionnez les groupes musculaires prioritaires : la séance proposée et son volume s'ajustent en direct."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <SegmentedControl
            label="Vue anatomique"
            size="lg"
            value={view}
            onChange={setView}
            options={[
              { value: "front", label: "Vue de face", icon: <PersonStanding /> },
              { value: "back", label: "Vue de dos", icon: <Columns2 /> },
            ]}
          />

          <Card padding="none" className="relative overflow-hidden bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:22px_22px] px-2 pt-6 pb-4">
            <BodyMap view={view} intensity={intensity} onToggle={toggle} labels={labels} className="max-w-[420px]" />
            <p className="mx-3 mt-3 flex items-center gap-3 rounded-full bg-surface-3/80 px-4 py-2.5 text-[13px] text-ink">
              <Hand className="size-4 shrink-0 text-lime" aria-hidden />
              <span>
                Touchez un groupe pour basculer son activation
                <span className="block text-[11px] text-subtle">Chiffre affiché = séries prévues</span>
              </span>
            </p>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <section aria-labelledby="selected-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="selected-title" className="text-label-caps text-muted">
                Groupes sélectionnés ({selected.length})
              </h2>
              {selected.length > 0 && (
                <button type="button" onClick={() => setSelected([])} className="text-label-caps text-lime hover:underline">
                  Réinitialiser
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.map((m) => (
                <Chip key={m} selected onToggle={() => toggle(m)}>
                  {MUSCLE_BY_ID[m].name}
                </Chip>
              ))}
              {unselected.map((m) => (
                <Chip key={m.id} selected={false} onToggle={() => toggle(m.id)}>
                  {m.name}
                </Chip>
              ))}
            </div>
          </section>

          <Card>
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="flex items-center gap-3 text-headline-md text-ink-strong uppercase">
                <SlidersHorizontal className="size-5 text-lime" aria-hidden />
                Densité de séance estimée
              </h2>
              {density.totalSets > 0 && <Pill tone={ZONE[density.zone].tone}>{ZONE[density.zone].label}</Pill>}
            </div>
            <div className="mb-2 flex items-baseline justify-between gap-3 text-[14px] text-muted">
              <span>Volume de travail planifié</span>
              <span>
                <span className="text-metric-lg text-ink-strong">{density.totalSets}</span> séries totales
              </span>
            </div>
            <ProgressBar value={totalPct} label="Volume planifié" />
            <div className="mt-2 flex justify-between text-[11px] font-display font-semibold tracking-[0.04em] tabular">
              <span className="text-muted">Min (12)</span>
              <span className="text-lime">Zone visée (12-22)</span>
              <span className="text-muted">Surcharge (26+)</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-card bg-surface-2 p-3.5">
                <LabelCaps as="p">Ratio push / pull</LabelCaps>
                <p className="mt-1 text-metric-lg text-ink-strong">{density.pushPct !== null ? `${density.pushPct} : ${density.pullPct}` : "—"}</p>
              </div>
              <div className="rounded-card bg-surface-2 p-3.5">
                <LabelCaps as="p">Durée estimée</LabelCaps>
                <p className="mt-1 text-metric-lg text-lime">{draft.length ? `~${minutes} min` : "—"}</p>
              </div>
            </div>
            {draft.length > 0 && (
              <ol className="mt-4 flex flex-col gap-1.5 text-[13px] text-muted">
                {draft.map((d, i) => (
                  <li key={d.exerciseId} className="flex justify-between gap-3">
                    <span className="truncate">
                      <span className="text-lime">{i + 1}.</span> {byId.get(d.exerciseId)?.name}
                    </span>
                    <span className="shrink-0 text-ink-strong tabular">
                      {d.sets} × {d.durationMinSec ? `${d.durationMinSec}-${d.durationMaxSec} s` : `${d.repsMin}-${d.repsMax}`}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-4 text-[12px] text-subtle">Repères de volume indicatifs. Vous pourrez tout ajuster à l&apos;étape suivante.</p>
          </Card>

          <Button
            size="lg"
            block
            disabled={!selected.length}
            onClick={confirm}
            icon={<Zap className="size-5" />}
          >
            {selected.length ? `Confirmer la sélection (${selected.length} groupe${selected.length > 1 ? "s" : ""})` : "Sélectionnez un groupe"}
          </Button>
          {selected.length > 0 && (
            <p className="-mt-2 flex items-center justify-center gap-1.5 text-[12px] text-subtle">
              <Check className="size-3.5 text-lime" aria-hidden />
              Ouvre l&apos;éditeur avec {draft.length} exercice{draft.length > 1 ? "s" : ""} proposé{draft.length > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
