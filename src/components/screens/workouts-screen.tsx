"use client";

import Link from "next/link";
import { CircleCheck, CirclePlay, CirclePlus, ClipboardList, Clock, Dumbbell, Hourglass, ListOrdered, Play, Sparkles, TrendingUp } from "lucide-react";
import { Button, ButtonLink, Card, CardHeader, EmptyState, ErrorState, IconButton, InlineError, LabelCaps, MetricValue, PageSkeleton, Pill, ProgressBar, SegmentedBar } from "@/components/ui";
import { MuscleCaps } from "@/components/workout/muscle-tags";
import { useData } from "@/hooks/use-data";
import { useToday } from "@/hooks/use-clock";
import { useStartSession } from "@/hooks/use-start-session";
import { WEEKDAY_LONG, WEEKDAY_SHORT, isoDateOf, isoWeekday } from "@/lib/domain/dates";
import { formatTarget } from "@/lib/domain/training";
import { formatDateShort, formatDecimal, formatDelta, formatInt } from "@/lib/format";
import { cn } from "@/lib/cn";
import { estimateWorkoutMinutes, getTrainingOverview, totalPlannedSets, workoutMuscles, type TrainingOverview } from "@/services/insights";
import type { WorkoutSession, WorkoutWithExercises } from "@/types/domain";

export function WorkoutsScreen() {
  const today = useToday();
  if (!today) return <PageSkeleton blocks={4} />;
  return <Workouts today={today} />;
}

function Workouts({ today }: { today: string }) {
  const overview = useData((s) => getTrainingOverview(s, today), [today]);
  const { start, pending, error } = useStartSession();

  if (overview.loading) return <PageSkeleton blocks={4} />;
  if (overview.error || !overview.data) return <ErrorState message={overview.error ?? "Chargement impossible."} onRetry={overview.reload} />;
  const o = overview.data;
  const custom = o.workouts.filter((w) => w.isCustom);
  const nextId = o.activeSession ? null : o.nextWorkout?.id;

  return (
    <div className="flex flex-col gap-5">
      {o.program && (
        <section aria-labelledby="program-title">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-label-caps text-lime">
              <ClipboardList className="size-4" aria-hidden />
              Programme actif
            </p>
            <Pill tone="neutral" caps className="text-ink-strong">
              Semaine {String(o.program.week).padStart(2, "0")} / {o.program.program.durationWeeks}
            </Pill>
          </div>
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 id="program-title" className="truncate text-headline-md text-ink-strong">
                  {o.program.program.name}
                </h1>
                <p className="mt-1 text-[14px] text-muted">
                  Fréquence ×{o.program.program.sessionsPerWeek} • {o.program.program.durationWeeks} semaines • Surcharge progressive
                </p>
              </div>
              <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-lowest text-lime">
                <Dumbbell className="size-6" />
              </span>
            </div>
            <div className="mt-5 mb-2 flex items-center justify-between gap-3 text-label-caps">
              <span className="text-muted">Progression du programme</span>
              <span className="text-ink-strong tabular">
                {o.program.percent}% ({o.program.completedInProgram}/{o.program.plannedTotal} séances)
              </span>
            </div>
            <ProgressBar value={o.program.percent} size="sm" label="Progression du programme" />
          </Card>
        </section>
      )}

      <ButtonLink href="/workouts/muscles" variant="secondary" size="lg" block className="bg-surface" icon={<CirclePlus className="size-5 text-lime" />}>
        Créer un entraînement personnalisé
      </ButtonLink>

      {o.activeSession && (
        <Card tone="active" className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <LabelCaps className="text-lime">Séance {o.activeSession.status === "paused" ? "en pause" : "en cours"}</LabelCaps>
            <p className="truncate text-headline-sm text-ink-strong uppercase">{o.activeSession.workoutName}</p>
          </div>
          <ButtonLink href={`/session/${o.activeSession.id}`} size="md" icon={<Play className="size-4 fill-current" />}>
            Reprendre
          </ButtonLink>
        </Card>
      )}

      <section aria-labelledby="week-title" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="week-title" className="flex items-center gap-2 text-label-caps text-ink">
            <span aria-hidden className="size-2 rounded-full bg-lime" />
            Séances de la semaine
          </h2>
          <span className="text-label-caps text-lime tabular">
            {o.weekCompleted}/{o.weekPlanned} validées
          </span>
        </div>

        <InlineError message={error} />

        <div className="grid gap-4 lg:grid-cols-2">
          {o.rotation.map((w) => (
            <WorkoutCard
              key={w.id}
              workout={w}
              overview={o}
              highlighted={w.id === nextId}
              onStart={() => void start(w.id)}
              starting={pending}
              disabled={Boolean(o.activeSession)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="custom-title" className="flex flex-col gap-4">
        <h2 id="custom-title" className="flex items-center gap-2 text-label-caps text-ink">
          <Sparkles className="size-4 text-lime" aria-hidden />
          Entraînements personnalisés
        </h2>
        {custom.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {custom.map((w) => (
              <WorkoutCard key={w.id} workout={w} overview={o} onStart={() => void start(w.id)} starting={pending} disabled={Boolean(o.activeSession)} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Sparkles />}
            title="Aucun entraînement personnalisé"
            action={
              <ButtonLink href="/workouts/new" variant="secondary" size="md">
                Partir d&apos;une liste vide
              </ButtonLink>
            }
          >
            Ciblez des groupes musculaires avec le sélecteur anatomique ou composez votre séance exercice par exercice.
          </EmptyState>
        )}
      </section>

      <WeeklyTonnage o={o} />
    </div>
  );
}

function plannedDayFor(workoutId: string, o: TrainingOverview) {
  return o.week.find((d) => d.plannedWorkoutId === workoutId);
}

function WorkoutCard({
  workout,
  overview,
  highlighted,
  onStart,
  starting,
  disabled,
}: {
  workout: WorkoutWithExercises;
  overview: TrainingOverview;
  highlighted?: boolean;
  onStart: () => void;
  starting: boolean;
  disabled: boolean;
}) {
  const doneThisWeek: WorkoutSession | undefined = overview.thisWeekByWorkout[workout.id];
  const last = overview.lastByWorkout[workout.id];
  const planned = plannedDayFor(workout.id, overview);
  const day = doneThisWeek ? isoWeekday(isoDateOf(doneThisWeek.startedAt)) : planned?.weekday;
  const muscles = workoutMuscles(workout).primary;
  const rests = workout.exercises.map((e) => e.restSec);
  const restLabel = rests.length ? (Math.min(...rests) === Math.max(...rests) ? `${Math.min(...rests)} s` : `${Math.min(...rests)}-${Math.max(...rests)} s`) : null;
  const sets = totalPlannedSets(workout);

  return (
    <Card padding="none" tone={highlighted ? "raised" : "default"} className={cn("relative overflow-hidden", highlighted && "border-t-4 border-t-lime")}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-label-caps">
              {highlighted && (
                <Pill tone="lime" caps>
                  {planned?.status === "today" ? "À venir aujourd'hui" : "Prochaine séance"}
                </Pill>
              )}
              {day && <span className="text-muted">{WEEKDAY_LONG[day]}</span>}
              {doneThisWeek && (
                <>
                  <span aria-hidden className="text-faint">•</span>
                  <span className="text-lime">Validé</span>
                </>
              )}
            </div>
            <h3 className="text-headline-md text-ink-strong uppercase">
              <Link href={`/workouts/${workout.id}`} className="after:absolute after:inset-0 hover:text-lime">
                {workout.name}
                {day && <span className="text-muted"> — {WEEKDAY_LONG[day]}</span>}
              </Link>
            </h3>
          </div>
          {doneThisWeek ? (
            <CircleCheck className="size-6 shrink-0 text-lime" aria-label="Séance validée cette semaine" />
          ) : (
            <IconButton label={`Démarrer ${workout.name}`} variant="lime" className="relative z-10" onClick={onStart} disabled={starting || disabled}>
              <CirclePlay className="size-5" />
            </IconButton>
          )}
        </div>

        <div className="mt-3">
          <MuscleCaps muscles={muscles} />
        </div>

        <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14px] text-muted">
          <li className="flex items-center gap-1.5">
            <ListOrdered className="size-4" aria-hidden />
            {workout.exercises.length} exercices
          </li>
          <li className="flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />~{estimateWorkoutMinutes(workout)} min
          </li>
          {restLabel && (
            <li className="flex items-center gap-1.5">
              <Hourglass className="size-4" aria-hidden />
              {restLabel}
            </li>
          )}
        </ul>

        <div className="mt-4 rounded-xl bg-surface-lowest/80 p-3.5">
          {highlighted && (
            <div className="mb-2 flex items-center justify-between gap-2 text-label-caps">
              <span className="text-muted">Programme prévisionnel</span>
              <span className="text-lime">{sets} séries</span>
            </div>
          )}
          <ol className={cn("text-[13px] leading-6", highlighted ? "text-ink-strong" : "text-muted line-clamp-2")}>
            {workout.exercises.map((e, i) => (
              <li key={e.id} className="inline">
                <span className={cn(highlighted && i < 4 && "font-semibold text-lime")}>{i + 1}.</span> {e.exercise.name} ({e.sets}×{formatTarget({ ...e, trackingType: e.exercise.trackingType })})
                {i < workout.exercises.length - 1 && <span className="text-faint"> • </span>}
              </li>
            ))}
          </ol>
        </div>

        {highlighted ? (
          <Button size="lg" block className="relative z-10 mt-5" icon={<Play className="size-5 fill-current" />} onClick={onStart} loading={starting} disabled={disabled}>
            Démarrer {workout.name}
          </Button>
        ) : (
          (doneThisWeek ?? last) && (
            <div className="mt-4 flex items-center justify-between text-[14px]">
              <span className="text-muted">
                {doneThisWeek ? "Complété" : "Dernière séance"} {formatDateShort((doneThisWeek ?? last).startedAt)}
              </span>
              <span className="font-display font-bold text-lime tabular">{formatInt((doneThisWeek ?? last).totalVolumeKg ?? 0)} kg</span>
            </div>
          )
        )}
      </div>
    </Card>
  );
}

function WeeklyTonnage({ o }: { o: TrainingOverview }) {
  const trainingDays = o.week.filter((d) => d.status !== "rest" || d.sessions.length);
  const max = Math.max(1, ...trainingDays.map((d) => d.sessions.reduce((s, x) => s + (x.totalVolumeKg ?? 0), 0)));
  const change = o.previousWeekVolumeKg > 0 ? ((o.weekVolumeKg - o.previousWeekVolumeKg) / o.previousWeekVolumeKg) * 100 : null;

  return (
    <Card>
      <CardHeader
        icon={<TrendingUp />}
        title="Tonnage cumulé semaine"
        aside={change !== null && <span className={cn("text-label-caps tabular", change >= 0 ? "text-lime" : "text-danger-soft")}>{formatDelta(change)}% vs S-1</span>}
      />
      <div className="flex items-end justify-between gap-4">
        <MetricValue value={formatInt(o.weekVolumeKg)} unit="kg" size="xl" />
        <div className="text-right">
          <LabelCaps as="p">Semaine précédente</LabelCaps>
          <p className="text-[13px] text-ink-strong tabular">{o.previousWeekVolumeKg ? `${formatInt(o.previousWeekVolumeKg)} kg` : "—"}</p>
        </div>
      </div>
      {trainingDays.length > 0 && (
        <>
          <SegmentedBar
            className="mt-5"
            segments={trainingDays.map((d) => {
              const vol = d.sessions.reduce((s, x) => s + (x.totalVolumeKg ?? 0), 0);
              return vol > 0 ? { value: (vol / max) * 100, tone: "done" } : { value: d.status === "missed" ? 0 : 100, tone: d.status === "missed" ? "empty" : "planned" };
            })}
          />
          <ul className="mt-2 flex gap-1.5">
            {trainingDays.map((d) => {
              const vol = d.sessions.reduce((s, x) => s + (x.totalVolumeKg ?? 0), 0);
              return (
                <li key={d.date} className={cn("flex-1 text-center text-[10.5px] font-display font-semibold uppercase tracking-[0.06em]", vol ? "text-ink-strong" : "text-subtle")}>
                  {WEEKDAY_SHORT[d.weekday]} {vol ? `(${formatDecimal(vol / 1000)}t)` : d.status === "missed" ? "(—)" : "(prévu)"}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {o.weekVolumeKg === 0 && <p className="mt-3 text-[13px] text-subtle">Le tonnage = somme charge × répétitions des séries validées.</p>}
    </Card>
  );
}
