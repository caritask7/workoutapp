"use client";

import { Award, ChartNoAxesColumnIncreasing, Clock, Dumbbell, House, Layers, Weight } from "lucide-react";
import { ButtonLink, Card, CardHeader, ErrorState, PageSkeleton, Pill } from "@/components/ui";
import { PageHeader } from "@/components/layout/page-header";
import { useData } from "@/hooks/use-data";
import { formatDateLong, formatDecimal, formatDuration, formatInt } from "@/lib/format";
import { totalVolume } from "@/lib/domain/training";
import type { Services } from "@/services";
import type { RecordType } from "@/types/domain";

const RECORD_LABEL: Record<RecordType, string> = {
  max_weight: "Charge max",
  est_1rm: "1RM estimé",
  max_set_volume: "Volume / série",
  max_reps: "Répétitions",
  max_duration: "Durée",
};

const recordUnit = (t: RecordType) => (t === "max_reps" ? "reps" : t === "max_duration" ? "s" : "kg");

async function loadSummary(s: Services, id: string) {
  const session = await s.sessions.getSession(id);
  if (!session) return null;
  const [sets, records] = await Promise.all([s.sessions.listSets(id), s.sessions.listRecords()]);
  return { session, sets, records: records.filter((r) => r.sessionId === id) };
}

export function SessionSummaryScreen({ id }: { id: string }) {
  const state = useData((s) => loadSummary(s, id), [id]);
  if (state.loading) return <PageSkeleton blocks={3} />;
  if (!state.data) return <ErrorState message={state.error ?? "Séance introuvable."} />;
  const { session, sets, records } = state.data;
  if (session.status !== "completed") {
    return (
      <div className="flex flex-col items-center gap-4">
        <ErrorState message="Cette séance n'est pas encore terminée." />
        <ButtonLink href={`/session/${id}`}>Reprendre la séance</ButtonLink>
      </div>
    );
  }

  const stats = [
    { icon: <Clock />, label: "Durée", value: formatDuration(session.durationSec ?? 0) },
    { icon: <Weight />, label: "Volume", value: `${formatInt(session.totalVolumeKg ?? 0)} kg` },
    { icon: <Layers />, label: "Séries", value: formatInt(session.totalSets ?? 0) },
    { icon: <Dumbbell />, label: "Exercices", value: formatInt(new Set(sets.filter((s) => s.completed).map((s) => s.planIndex)).size) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Séance terminée" title={session.workoutName.toUpperCase()} subtitle={formatDateLong(session.startedAt)} />

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-card border border-line/70 bg-surface p-4">
            <dt className="flex items-center gap-2 text-label-caps text-muted">
              <span aria-hidden className="text-lime [&>svg]:size-4">
                {s.icon}
              </span>
              {s.label}
            </dt>
            <dd className="mt-2 text-metric-lg text-ink-strong">{s.value}</dd>
          </div>
        ))}
      </dl>

      <Card tone={records.length ? "active" : "default"}>
        <CardHeader icon={<Award />} title={records.length ? `${records.length} record${records.length > 1 ? "s" : ""} personnel${records.length > 1 ? "s" : ""}` : "Records personnels"} />
        {records.length ? (
          <ul className="flex flex-col gap-2.5">
            {records.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] text-ink-strong">{session.plan.find((p) => p.exerciseId === r.exerciseId)?.exerciseName}</span>
                  <span className="text-[12px] text-muted">{RECORD_LABEL[r.type]}</span>
                </span>
                <Pill tone="lime">
                  {formatDecimal(r.value)} {recordUnit(r.type)}
                </Pill>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted">Pas de nouveau record cette fois-ci. La régularité paie : continuez la surcharge progressive.</p>
        )}
      </Card>

      <Card padding="none">
        <h2 className="px-5 pt-5 pb-2 text-label-caps text-ink">Détail des exercices</h2>
        <ul className="divide-y divide-line">
          {session.plan.map((p, i) => {
            const own = sets.filter((s) => s.planIndex === i && s.completed);
            return (
              <li key={`${p.exerciseId}-${i}`} className="px-5 py-3.5">
                <div className="flex justify-between gap-3">
                  <span className="truncate text-[15px] font-semibold text-ink-strong">{p.exerciseName}</span>
                  <span className="shrink-0 text-[13px] text-lime tabular">{own.length ? `${formatInt(totalVolume(own))} kg` : "—"}</span>
                </div>
                <p className="mt-0.5 text-[13px] text-muted tabular">
                  {own.length
                    ? own.map((s) => (s.durationSec ? `${s.durationSec} s` : s.weightKg != null ? `${formatDecimal(s.weightKg)}×${s.reps}` : `${s.reps} reps`)).join("  ·  ")
                    : "Non réalisé"}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <ButtonLink href="/" size="lg" icon={<House className="size-5" />}>
          Retour à l&apos;accueil
        </ButtonLink>
        <ButtonLink href="/progress" size="lg" variant="secondary" icon={<ChartNoAxesColumnIncreasing className="size-5" />}>
          Voir la progression
        </ButtonLink>
      </div>
    </div>
  );
}
