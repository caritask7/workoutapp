"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Award, CalendarCheck, ChevronRight, Dumbbell, Flame, Gauge, Hourglass, Layers, Play, Plus, RotateCcw, Timer, Trophy } from "lucide-react";
import { Button, ButtonLink, Card, CardHeader, EmptyState, ErrorState, InlineError, LabelCaps, MetricValue, PageSkeleton, Pill, ProgressBar } from "@/components/ui";
import { PageHeader } from "@/components/layout/page-header";
import { WeekStrip } from "@/components/workout/week-strip";
import { MuscleTags } from "@/components/workout/muscle-tags";
import { MeasurementSheet } from "@/components/body/measurement-sheet";
import { CaloriesRing, MacroBars, RemainingKcal } from "@/components/nutrition/macro-summary";
import { useData } from "@/hooks/use-data";
import { useStartSession } from "@/hooks/use-start-session";
import { useToday } from "@/hooks/use-clock";
import { weightGoalProgress } from "@/lib/domain/body";
import { estimateOneRepMax } from "@/lib/domain/training";
import { formatDayMonth, formatDelta, formatKg, formatInt } from "@/lib/format";
import {
  estimateWorkoutMinutes,
  getRecentRecords,
  getTrainingOverview,
  getWeightOverview,
  totalPlannedSets,
  workoutMuscles,
} from "@/services/insights";

const GOAL_LABEL = {
  muscle_gain: "Phase prise de masse",
  strength: "Phase force",
  fat_loss: "Phase sèche",
  maintenance: "Phase maintien",
} as const;

export function DashboardScreen() {
  const today = useToday();
  if (!today) return <PageSkeleton blocks={4} />;
  return <Dashboard today={today} />;
}

function Dashboard({ today }: { today: string }) {
  const overview = useData((s) => getTrainingOverview(s, today), [today]);
  const weight = useData((s) => getWeightOverview(s, today), [today]);
  const records = useData((s) => getRecentRecords(s, 1));
  const nutrition = useData((s) => s.nutrition.getDay(today), [today]);
  const { start, pending, error } = useStartSession();
  const [weightSheet, setWeightSheet] = useState(false);

  if (overview.loading || weight.loading) return <PageSkeleton blocks={4} />;
  if (overview.error || !overview.data) return <ErrorState message={overview.error ?? "Chargement impossible."} onRetry={overview.reload} />;

  const o = overview.data;
  const w = weight.data;
  const next = o.nextWorkout;
  const record = records.data?.[0];
  const muscles = next ? workoutMuscles(next) : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={o.program ? "Programme actif" : "Aucun programme actif"}
        aside={GOAL_LABEL[o.profile.goal]}
        title={`Bon retour, ${o.profile.displayName}`}
        subtitle={
          o.program && (
            <span className="flex items-center gap-2">
              <Trophy className="size-4 text-lime" aria-hidden />
              Semaine {o.program.week} • {o.program.program.name} ({o.program.week}/{o.program.program.durationWeeks})
            </span>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {/* Objectif poids */}
          <Card>
            <CardHeader
              icon={<Hourglass />}
              title="Objectif poids"
              aside={w?.monthDeltaKg != null && <Pill tone="lime-soft">{formatDelta(w.monthDeltaKg)} kg ce mois</Pill>}
            />
            {w && <WeightGoal w={w} onLog={() => setWeightSheet(true)} />}
          </Card>

          {/* Séances hebdo */}
          <Card>
            <CardHeader
              icon={<CalendarCheck />}
              title="Séances hebdo"
              aside={
                <span className="font-display text-[13px] font-semibold text-ink-strong tabular">
                  {o.weekCompleted} / {o.weekPlanned} effectuées
                </span>
              }
            />
            <WeekStrip days={o.week} />
          </Card>
        </div>

        {/* Séance du jour */}
        <Card tone="raised" className="flex flex-col">
          {o.activeSession ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <Pill tone="lime" caps>
                  {o.activeSession.status === "paused" ? "En pause" : "En cours"}
                </Pill>
              </div>
              <h2 className="text-headline-lg text-ink-strong uppercase">{o.activeSession.workoutName}</h2>
              <p className="mt-1 mb-6 text-[14px] text-muted">Votre séance est enregistrée au fur et à mesure : reprenez là où vous vous êtes arrêté.</p>
              <ButtonLink href={`/session/${o.activeSession.id}`} size="lg" block className="mt-auto" icon={<RotateCcw className="size-5" />}>
                Reprendre la séance
              </ButtonLink>
            </>
          ) : next && muscles ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <Pill tone="lime" caps>
                  {o.trainedToday ? "Prochaine séance" : o.week.find((d) => d.date === today)?.status === "today" ? "Aujourd'hui" : "Prochaine séance"}
                </Pill>
                {o.program && (
                  <span className="flex items-center gap-1.5 text-label-caps text-lime">
                    <Flame className="size-3.5" aria-hidden />
                    Séance {o.program.completedInProgram + 1}/{o.program.plannedTotal}
                  </span>
                )}
              </div>
              <h2 className="text-headline-lg text-ink-strong uppercase">{next.name}</h2>
              {next.focus && <p className="mt-1 text-label-caps text-lime">{next.focus}</p>}

              <LabelCaps as="p" className="mt-5 mb-2.5">
                Groupes musculaires ciblés
              </LabelCaps>
              <MuscleTags muscles={muscles.primary} />

              <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-card bg-surface-lowest/80 py-4 text-center">
                <Stat icon={<Dumbbell />} value={next.exercises.length} label="Exercices" />
                <Stat icon={<Timer />} value={`~${estimateWorkoutMinutes(next)}`} label="Minutes" />
                <Stat icon={<Layers />} value={totalPlannedSets(next)} label="Séries" />
              </dl>

              <div className="mt-5 flex flex-col gap-3 lg:mt-auto lg:pt-5">
                <InlineError message={error} />
                <Button size="lg" block loading={pending} icon={<Play className="size-5 fill-current" />} onClick={() => void start(next.id)}>
                  Commencer la séance
                </Button>
                <Link href={`/workouts/${next.id}`} className="self-center text-[13px] text-muted underline-offset-4 hover:text-ink-strong hover:underline">
                  Voir le détail de la séance
                </Link>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<Dumbbell />}
              title="Aucun entraînement"
              action={
                <ButtonLink href="/workouts/new" icon={<Plus className="size-4" />}>
                  Créer un entraînement
                </ButtonLink>
              }
            >
              Créez un entraînement pour planifier votre prochaine séance.
            </EmptyState>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Dernier record */}
        {record ? (
          <Link href={`/exercises/${record.record.exerciseId}`} className="group">
            <Card className="flex items-center gap-4 transition-colors group-hover:border-lime/50">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-lime/12 text-lime">
                <Award className="size-7" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-3 text-label-caps text-lime">
                  Record battu le {formatDayMonth(record.record.achievedAt)}
                  {record.previous != null && <span className="tabular">{formatDelta(record.record.value - record.previous)} kg</span>}
                </p>
                <p className="truncate text-headline-md text-ink-strong">{record.exerciseName}</p>
                <p className="text-[15px] text-muted tabular">
                  {formatKg(record.record.weightKg ?? record.record.value)} kg × {record.record.reps} reps
                  {record.record.reps && record.record.weightKg && record.record.reps > 1
                    ? ` (1RM est. : ${formatKg(estimateOneRepMax(record.record.weightKg, record.record.reps))} kg)`
                    : ""}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-subtle" aria-hidden />
            </Card>
          </Link>
        ) : (
          <Card className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-surface-3 text-subtle">
              <Award className="size-7" aria-hidden />
            </span>
            <div>
              <p className="text-label-caps text-muted">Records personnels</p>
              <p className="text-[14px] text-muted">Vos records apparaîtront ici dès votre première séance terminée.</p>
            </div>
          </Card>
        )}

        {/* Nutrition */}
        <Link href="/nutrition" className="group">
          <Card className="h-full transition-colors group-hover:border-lime/50">
            <CardHeader
              icon={<Flame />}
              title="Nutrition & carburant journalier"
              aside={nutrition.data?.goal && <RemainingKcal totals={nutrition.data.totals} goal={nutrition.data.goal} />}
            />
            {nutrition.data?.goal ? (
              <div className="flex items-center gap-5">
                <CaloriesRing totals={nutrition.data.totals} goal={nutrition.data.goal} size={124} />
                <div className="min-w-0 flex-1">
                  <MacroBars totals={nutrition.data.totals} goal={nutrition.data.goal} />
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-muted">Définissez vos objectifs nutritionnels pour suivre vos apports.</p>
            )}
          </Card>
        </Link>
      </div>

      {o.weekVolumeKg > 0 && (
        <Card padding="md" className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-label-caps text-muted">
            <Gauge className="size-4 text-lime" aria-hidden />
            Volume soulevé cette semaine
          </span>
          <MetricValue value={formatInt(o.weekVolumeKg)} unit="kg" size="md" />
        </Card>
      )}

      {weightSheet && <MeasurementSheet open onClose={() => setWeightSheet(false)} weightOnly />}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <span aria-hidden className="text-lime [&>svg]:size-5">
        {icon}
      </span>
      <dd className="text-metric-lg text-ink-strong">{value}</dd>
      <dt className="text-label-caps text-muted">{label}</dt>
    </div>
  );
}

function WeightGoal({
  w,
  onLog,
}: {
  w: { startKg: number | null; currentKg: number | null; currentDate: string | null; targetMinKg: number | null; targetMaxKg: number | null };
  onLog: () => void;
}) {
  const current = w.currentKg ?? w.startKg;
  const target = w.targetMinKg ?? w.targetMaxKg;
  const progress = w.startKg != null && current != null && target != null ? weightGoalProgress(w.startKg, current, target) : null;
  const remaining = current != null && target != null ? target - current : null;
  const targetLabel =
    w.targetMinKg != null && w.targetMaxKg != null && w.targetMinKg !== w.targetMaxKg
      ? `${formatKg(w.targetMinKg)}–${formatKg(w.targetMaxKg)} kg`
      : target != null
        ? `${formatKg(target)} kg`
        : "—";

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          {current != null ? <MetricValue value={formatKg(current)} unit="kg" size="hero" /> : <MetricValue value="—" size="hero" />}
          <p className="mt-1 text-[12px] text-subtle">
            {w.currentDate ? `Pesée du ${formatDayMonth(w.currentDate)}` : "Poids de départ déclaré · aucune pesée enregistrée"}
          </p>
        </div>
        <div className="text-right">
          <LabelCaps as="p">Cible : {targetLabel}</LabelCaps>
          {remaining != null && (
            <p className="mt-1 font-display text-[14px] font-semibold text-lime tabular">
              {remaining > 0 ? `+${formatKg(remaining)} kg restants` : "Objectif atteint"}
            </p>
          )}
        </div>
      </div>
      {progress != null && (
        <>
          <ProgressBar value={progress} className="mt-5" label="Progression vers le poids cible" />
          <div className="mt-2.5 flex items-center justify-between text-[12px] font-display font-semibold tabular">
            <span className="text-muted">Départ : {w.startKg != null ? `${formatKg(w.startKg)} kg` : "—"}</span>
            <span className="text-lime">{progress}% complété</span>
            <span className="text-muted">{target != null ? `${formatKg(target)} kg` : ""}</span>
          </div>
        </>
      )}
      <Button variant="secondary" size="sm" className="mt-4" icon={<Plus className="size-3.5" />} onClick={onLog}>
        Enregistrer mon poids
      </Button>
    </>
  );
}
