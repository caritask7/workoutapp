"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ChevronRight, Copy, Layers, ListOrdered, Pencil, Play, Timer, Trash2 } from "lucide-react";
import { Button, ButtonLink, Card, CardHeader, ConfirmSheet, ErrorState, InlineError, PageSkeleton, SegmentedControl, useToast } from "@/components/ui";
import { PageHeader } from "@/components/layout/page-header";
import { BodyMap, setsToIntensity, type Intensity } from "@/components/body/body-map";
import { MuscleTags } from "@/components/workout/muscle-tags";
import { useData, useMutation } from "@/hooks/use-data";
import { useStartSession } from "@/hooks/use-start-session";
import { formatTarget } from "@/lib/domain/training";
import { formatClock, formatDateShort, formatInt } from "@/lib/format";
import { estimateWorkoutMinutes, totalPlannedSets, workoutMuscles } from "@/services/insights";
import type { BodyView, MuscleId } from "@/types/domain";

export function WorkoutDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const workout = useData((s) => s.workouts.getWorkout(id), [id]);
  const active = useData((s) => s.sessions.getActiveSession());
  const history = useData(async (s) => (await s.sessions.listCompletedSessions()).filter((x) => x.workoutId === id).slice(0, 5), [id]);
  const { start, pending, error } = useStartSession();
  const [view, setView] = useState<BodyView>("front");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const duplicate = useMutation((s) => s.workouts.duplicateWorkout(id), {
    onSuccess: (w) => {
      toast("Entraînement dupliqué");
      router.push(`/workouts/${w.id}`);
    },
  });
  const remove = useMutation((s) => s.workouts.deleteWorkout(id), {
    onSuccess: () => {
      toast("Entraînement supprimé");
      router.push("/workouts");
    },
  });

  if (workout.loading) return <PageSkeleton blocks={3} />;
  if (!workout.data) return <ErrorState message={workout.error ?? "Entraînement introuvable."} />;
  const w = workout.data;
  const muscles = workoutMuscles(w);
  const intensity: Partial<Record<MuscleId, Intensity>> = {};
  for (const m of muscles.secondary) intensity[m as MuscleId] = 1;
  for (const [m, sets] of muscles.setsByMuscle) intensity[m as MuscleId] = Math.max(2, setsToIntensity(sets)) as Intensity;
  const busy = Boolean(active.data);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/workouts" className="inline-flex items-center gap-1.5 text-label-caps text-muted hover:text-ink-strong">
        <ArrowLeft className="size-4" aria-hidden />
        Entraînements
      </Link>
      <PageHeader eyebrow={w.isCustom ? "Entraînement personnalisé" : "Programme"} title={w.name.toUpperCase()} subtitle={w.focus} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-3 divide-x divide-line rounded-card border border-line/70 bg-surface py-4 text-center">
            {[
              { icon: <ListOrdered />, value: w.exercises.length, label: "Exercices" },
              { icon: <Layers />, value: totalPlannedSets(w), label: "Séries" },
              { icon: <Timer />, value: `~${estimateWorkoutMinutes(w)}`, label: "Minutes" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <span aria-hidden className="text-lime [&>svg]:size-5">
                  {s.icon}
                </span>
                <dd className="text-metric-lg text-ink-strong">{s.value}</dd>
                <dt className="text-label-caps text-muted">{s.label}</dt>
              </div>
            ))}
          </dl>

          <Card padding="none">
            <ol className="divide-y divide-line">
              {w.exercises.map((e, i) => (
                <li key={e.id}>
                  <Link href={`/exercises/${e.exerciseId}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2">
                    <span className="font-display text-[18px] font-bold text-lime tabular">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink-strong">{e.exercise.name}</span>
                      <span className="block text-[13px] text-muted tabular">
                        {e.sets} × {formatTarget({ ...e, trackingType: e.exercise.trackingType })} · repos {formatClock(e.restSec)}
                        {e.targetWeightKg ? ` · ${e.targetWeightKg} kg` : ""}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
          </Card>

          <InlineError message={error ?? duplicate.error ?? remove.error} />
          <Button size="lg" block icon={<Play className="size-5 fill-current" />} loading={pending} disabled={busy} onClick={() => void start(w.id)}>
            {busy ? "Une séance est déjà en cours" : `Démarrer ${w.name}`}
          </Button>
          {busy && active.data && (
            <ButtonLink href={`/session/${active.data.id}`} variant="secondary" block>
              Reprendre la séance en cours
            </ButtonLink>
          )}
          <div className="grid grid-cols-3 gap-3">
            <ButtonLink href={`/workouts/${w.id}/edit`} variant="secondary" icon={<Pencil className="size-4" />}>
              Modifier
            </ButtonLink>
            <Button variant="secondary" icon={<Copy className="size-4" />} loading={duplicate.pending} onClick={() => void duplicate.run()}>
              Dupliquer
            </Button>
            <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
              Supprimer
            </Button>
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Muscles sollicités" />
            <SegmentedControl
              label="Vue anatomique"
              value={view}
              onChange={setView}
              options={[
                { value: "front", label: "Face" },
                { value: "back", label: "Dos" },
              ]}
            />
            <BodyMap view={view} intensity={intensity} title={`Muscles sollicités par ${w.name}`} className="mt-4 max-w-[200px]" />
            <MuscleTags muscles={muscles.primary} max={10} className="mt-4 flex flex-wrap gap-2" />
          </Card>
          <Card>
            <CardHeader title="Dernières séances" />
            {history.data?.length ? (
              <ul className="flex flex-col gap-2.5 text-[14px]">
                {history.data.map((h) => (
                  <li key={h.id} className="flex justify-between gap-3">
                    <span className="text-muted">{formatDateShort(h.startedAt)}</span>
                    <span className="font-display font-semibold text-lime tabular">{formatInt(h.totalVolumeKg ?? 0)} kg</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-muted">Pas encore réalisé.</p>
            )}
          </Card>
        </aside>
      </div>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void remove.run()}
        loading={remove.pending}
        danger
        title={`Supprimer « ${w.name} » ?`}
        description={
          w.isCustom
            ? "L'historique des séances déjà réalisées est conservé."
            : "Cet entraînement sera retiré de la rotation du programme. L'historique des séances déjà réalisées est conservé."
        }
        confirmLabel="Supprimer"
      />
    </div>
  );
}
