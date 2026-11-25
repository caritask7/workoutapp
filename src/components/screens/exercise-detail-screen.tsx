"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Award, ChartLine, ListChecks, Timer, Trash2 } from "lucide-react";
import { Button, Card, CardHeader, ConfirmSheet, EmptyState, ErrorState, InlineError, LabelCaps, PageSkeleton, Pill, SegmentedControl, useToast } from "@/components/ui";
import { PageHeader } from "@/components/layout/page-header";
import { BodyMap, exerciseIntensity } from "@/components/body/body-map";
import { preferredView } from "@/components/body/body-zones";
import { ExerciseDiagram } from "@/components/workout/exercise-diagram";
import { EQUIPMENT_LABEL } from "@/components/workout/exercise-picker";
import { TrendChart } from "@/components/charts/charts";
import { useData, useMutation } from "@/hooks/use-data";
import { MUSCLE_BY_ID } from "@/data/seed/muscles";
import { estimateOneRepMax, formatTarget } from "@/lib/domain/training";
import { isoDateOf } from "@/lib/domain/dates";
import { formatClock, formatDateShort, formatDecimal, formatInt } from "@/lib/format";
import type { Services } from "@/services";
import type { BodyView, RecordType } from "@/types/domain";
import { routes } from "@/lib/routes";

async function loadExercise(s: Services, id: string) {
  const exercise = await s.catalog.getExercise(id);
  if (!exercise) return null;
  const [history, records, workouts] = await Promise.all([s.sessions.exerciseHistory(id, 50), s.sessions.listRecords(id), s.workouts.listWorkouts()]);
  const usage = workouts.flatMap((w) => w.exercises.filter((e) => e.exerciseId === id).map((e) => ({ workout: w, item: e })));
  return { exercise, history, records, usage };
}

const RECORD_LABEL: Partial<Record<RecordType, string>> = {
  max_weight: "Charge max",
  est_1rm: "1RM estimé",
  max_set_volume: "Volume / série",
  max_reps: "Répétitions max",
  max_duration: "Durée max",
};

/** Fiche exercice : exécution, muscles, consignes, prescriptions et historique des charges. */
export function ExerciseDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const state = useData((s) => loadExercise(s, id), [id]);
  const [view, setView] = useState<BodyView | null>(null);
  const [confirm, setConfirm] = useState(false);
  const remove = useMutation((s) => s.catalog.deleteCustomExercise(id), {
    onSuccess: () => {
      toast("Exercice supprimé");
      router.push("/workouts");
    },
  });

  if (state.loading) return <PageSkeleton blocks={4} />;
  if (!state.data) return <ErrorState message={state.error ?? "Exercice introuvable."} />;
  const { exercise, history, records, usage } = state.data;
  const shownView = view ?? preferredView(exercise.primaryMuscles);
  const best = new Map<RecordType, (typeof records)[number]>();
  for (const r of records) if (!best.has(r.type) || best.get(r.type)!.value < r.value) best.set(r.type, r);
  const chart = history
    .filter((h) => h.bestWeightKg != null)
    .map((h) => ({ date: isoDateOf(h.session.startedAt), value: h.bestWeightKg as number }))
    .reverse();

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1.5 self-start text-label-caps text-muted hover:text-ink-strong">
        <ArrowLeft className="size-4" aria-hidden />
        Retour
      </button>
      <PageHeader
        eyebrow={EQUIPMENT_LABEL[exercise.equipment]}
        aside={exercise.ownerId ? <Pill tone="lime-soft">Personnalisé</Pill> : undefined}
        title={exercise.name}
        subtitle={exercise.description || undefined}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <ExerciseDiagram pattern={exercise.pattern} equipment={exercise.equipment} restSec={exercise.defaultRestSec} />

          <Card>
            <CardHeader icon={<ListChecks />} title="Consignes d'exécution" />
            {exercise.instructions.length ? (
              <ol className="flex flex-col gap-3">
                {exercise.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-6 text-ink">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-lime/15 font-display text-[12px] font-bold text-lime">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[14px] text-muted">Aucune consigne renseignée.</p>
            )}
            <p className="mt-4 text-[12px] text-subtle">Repères techniques généraux : ils ne remplacent pas l&apos;avis d&apos;un coach ou d&apos;un professionnel de santé.</p>
          </Card>

          <Card>
            <CardHeader icon={<Timer />} title="Séries · répétitions · repos" />
            {usage.length ? (
              <ul className="flex flex-col gap-2.5">
                {usage.map(({ workout, item }) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 text-[14px]">
                    <Link href={routes.workout(workout.id)} className="truncate text-ink-strong hover:text-lime">
                      {workout.name}
                    </Link>
                    <span className="shrink-0 text-muted tabular">
                      {item.sets} × {formatTarget({ ...item, trackingType: exercise.trackingType })} · repos {formatClock(item.restSec)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-muted">Utilisé dans aucun entraînement · repos conseillé {formatClock(exercise.defaultRestSec)}.</p>
            )}
          </Card>

          <Card>
            <CardHeader icon={<ChartLine />} title="Historique des charges" />
            {chart.length >= 2 && <TrendChart data={chart} unit="kg" ariaLabel={`Charge maximale par séance : ${exercise.name}`} height={180} />}
            {history.length ? (
              <ul className="mt-4 flex flex-col divide-y divide-line">
                {history.map((h) => (
                  <li key={h.session.id} className="py-2.5">
                    <div className="flex justify-between gap-3 text-[13px]">
                      <span className="text-muted">
                        {formatDateShort(h.session.startedAt)} · {h.session.workoutName}
                      </span>
                      {h.volumeKg > 0 && <span className="font-semibold text-lime tabular">{formatInt(h.volumeKg)} kg</span>}
                    </div>
                    <p className="mt-0.5 text-[14px] text-ink-strong tabular">
                      {h.sets.map((s) => (s.durationSec ? `${s.durationSec} s` : s.weightKg != null ? `${formatDecimal(s.weightKg)}×${s.reps}` : `${s.reps} reps`)).join("  ·  ")}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<ChartLine />} title="Pas encore de performance">
                Vos séries validées en séance apparaîtront ici.
              </EmptyState>
            )}
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Muscles sollicités" />
            <SegmentedControl
              label="Vue anatomique"
              value={shownView}
              onChange={setView}
              options={[
                { value: "front", label: "Face" },
                { value: "back", label: "Dos" },
              ]}
            />
            <BodyMap view={shownView} intensity={exerciseIntensity(exercise.primaryMuscles, exercise.secondaryMuscles)} title={`Muscles sollicités : ${exercise.name}`} className="mt-4 max-w-[200px]" />
            <dl className="mt-4 flex flex-col gap-3">
              <div>
                <LabelCaps as="dt">Principal</LabelCaps>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {exercise.primaryMuscles.map((m) => (
                    <Pill key={m} tone="lime">
                      {MUSCLE_BY_ID[m].name}
                    </Pill>
                  ))}
                </dd>
              </div>
              {exercise.secondaryMuscles.length > 0 && (
                <div>
                  <LabelCaps as="dt">Secondaires</LabelCaps>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {exercise.secondaryMuscles.map((m) => (
                      <Pill key={m} tone="lime-soft">
                        {MUSCLE_BY_ID[m].name}
                      </Pill>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader icon={<Award />} title="Records personnels" />
            {best.size ? (
              <ul className="flex flex-col gap-2.5">
                {[...best.entries()].map(([type, r]) => (
                  <li key={type} className="flex items-center justify-between gap-3">
                    <span className="text-[14px] text-muted">{RECORD_LABEL[type]}</span>
                    <span className="text-right">
                      <span className="font-display text-[16px] font-bold text-ink-strong tabular">
                        {formatDecimal(r.value)} {type === "max_reps" ? "reps" : type === "max_duration" ? "s" : "kg"}
                      </span>
                      <span className="block text-[11px] text-subtle">
                        {type === "max_weight" && r.reps ? `${r.reps} reps · ` : ""}
                        {formatDateShort(r.achievedAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-muted">Aucun record enregistré.</p>
            )}
            {best.get("max_weight")?.reps && best.get("max_weight")!.reps! > 1 && (
              <p className="mt-3 text-[11px] text-subtle">
                1RM estimé par la formule d&apos;Epley ({formatDecimal(estimateOneRepMax(best.get("max_weight")!.weightKg ?? 0, best.get("max_weight")!.reps!))} kg pour la meilleure charge) — estimation indicative.
              </p>
            )}
          </Card>

          {exercise.ownerId && (
            <>
              <InlineError message={remove.error} />
              <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirm(true)}>
                Supprimer l&apos;exercice
              </Button>
            </>
          )}
        </aside>
      </div>

      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void remove.run()}
        loading={remove.pending}
        danger
        title={`Supprimer « ${exercise.name} » ?`}
        description="Impossible si l'exercice est utilisé dans un entraînement ou un historique."
        confirmLabel="Supprimer"
      />
    </div>
  );
}
