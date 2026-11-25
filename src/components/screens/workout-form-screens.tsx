"use client";

import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ErrorState, PageSkeleton } from "@/components/ui";
import { PageHeader } from "@/components/layout/page-header";
import { WorkoutEditor } from "@/components/workout/workout-editor";
import { useData } from "@/hooks/use-data";
import { suggestWorkout } from "@/lib/domain/builder";
import { MUSCLE_BY_ID } from "@/data/seed/muscles";
import { MUSCLE_IDS, type MuscleId } from "@/types/domain";

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-label-caps text-muted hover:text-ink-strong">
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Link>
  );
}

/** Création : liste vide ou brouillon issu du sélecteur anatomique (?muscles=…). */
export function NewWorkoutScreen() {
  const params = useSearchParams();
  const raw = params.get("muscles") ?? "";
  const valid = new Set<string>(MUSCLE_IDS);
  const muscles = raw.split(",").filter((m): m is MuscleId => valid.has(m));
  const catalog = useData((s) => s.catalog.listExercises());

  if (catalog.loading) return <PageSkeleton blocks={3} />;
  if (catalog.error || !catalog.data) return <ErrorState message={catalog.error ?? "Chargement impossible."} onRetry={catalog.reload} />;

  const draft = suggestWorkout(muscles, catalog.data);
  const focus = muscles
    .slice(0, 3)
    .map((m) => MUSCLE_BY_ID[m].shortName)
    .join(" · ");

  return (
    <div className="flex flex-col gap-5">
      <BackLink href={muscles.length ? `/workouts/muscles?muscles=${muscles.join(",")}` : "/workouts"} label={muscles.length ? "Modifier le ciblage" : "Entraînements"} />
      <PageHeader
        eyebrow="Nouvel entraînement"
        title="Composer la séance"
        subtitle={muscles.length ? `${draft.length} exercices proposés pour les groupes ciblés. Ajustez librement.` : "Ajoutez des exercices et réglez séries, répétitions et repos."}
      />
      <WorkoutEditor key={raw} catalog={catalog.data} initial={{ name: "", focus, exercises: draft }} />
    </div>
  );
}

export function EditWorkoutScreen({ id }: { id: string }) {
  const workout = useData((s) => s.workouts.getWorkout(id), [id]);
  const catalog = useData((s) => s.catalog.listExercises());

  if (workout.loading || catalog.loading) return <PageSkeleton blocks={3} />;
  if (!workout.data) return <ErrorState message={workout.error ?? "Entraînement introuvable."} />;
  if (catalog.error || !catalog.data) return <ErrorState message={catalog.error ?? "Chargement impossible."} onRetry={catalog.reload} />;

  const w = workout.data;
  return (
    <div className="flex flex-col gap-5">
      <BackLink href={`/workouts/${id}`} label={w.name} />
      <PageHeader eyebrow="Modifier l'entraînement" title={w.name} />
      <WorkoutEditor
        workoutId={id}
        catalog={catalog.data}
        initial={{
          name: w.name,
          focus: w.focus,
          exercises: w.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            sets: e.sets,
            repsMin: e.repsMin,
            repsMax: e.repsMax,
            durationMinSec: e.durationMinSec,
            durationMaxSec: e.durationMaxSec,
            restSec: e.restSec,
            targetWeightKg: e.targetWeightKg,
            notes: e.notes,
          })),
        }}
      />
    </div>
  );
}
