"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus, Plus, Save, Trash2 } from "lucide-react";
import { Button, Card, Field, IconButton, InlineError, Input, LabelCaps, NumberInput, Pill, useToast } from "@/components/ui";
import { MuscleCaps } from "./muscle-tags";
import { ExercisePicker } from "./exercise-picker";
import { useMutation } from "@/hooks/use-data";
import { sessionDensity, targetsFor } from "@/lib/domain/builder";
import { fieldErrors, workoutSchema, type WorkoutExerciseInput, type WorkoutInput } from "@/lib/validation/schemas";
import { formatClock } from "@/lib/format";
import type { ExerciseWithMuscles } from "@/types/domain";

const REST_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 150, 180, 240, 300];

/** Éditeur d'entraînement : création ou modification (séries, répétitions, repos, ordre). */
export function WorkoutEditor({
  workoutId,
  initial,
  catalog,
}: {
  workoutId?: string;
  initial: WorkoutInput;
  catalog: ExerciseWithMuscles[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<WorkoutInput>(initial);
  const [picker, setPicker] = useState<{ replaceIndex: number | null } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState<ExerciseWithMuscles[]>([]);
  const byId = useMemo(() => new Map([...catalog, ...extra].map((e) => [e.id, e])), [catalog, extra]);
  const density = sessionDensity(form.exercises, byId);

  const save = useMutation((s, input: WorkoutInput) => s.workouts.saveWorkout(input, workoutId), {
    onSuccess: (w) => {
      toast(workoutId ? "Entraînement mis à jour" : "Entraînement créé");
      router.push(`/workouts/${w.id}`);
    },
  });

  const update = (index: number, patch: Partial<WorkoutExerciseInput>) =>
    setForm((f) => ({ ...f, exercises: f.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)) }));
  const move = (index: number, delta: number) =>
    setForm((f) => {
      const list = [...f.exercises];
      const [item] = list.splice(index, 1);
      list.splice(index + delta, 0, item);
      return { ...f, exercises: list };
    });
  const remove = (index: number) => setForm((f) => ({ ...f, exercises: f.exercises.filter((_, i) => i !== index) }));

  const pick = (exercise: ExerciseWithMuscles) => {
    if (!byId.has(exercise.id)) setExtra((x) => [...x, exercise]);
    const item = targetsFor(exercise, 3);
    setForm((f) => {
      if (picker?.replaceIndex != null) {
        return { ...f, exercises: f.exercises.map((e, i) => (i === picker.replaceIndex ? { ...item, sets: e.sets } : e)) };
      }
      return { ...f, exercises: [...f.exercises, item] };
    });
    setPicker(null);
  };

  const submit = () => {
    const parsed = workoutSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast("Vérifiez les champs signalés", "error");
      return;
    }
    setErrors({});
    void save.run(parsed.data);
  };

  return (
    <div className="flex flex-col gap-5 pb-24 lg:pb-0">
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom de l'entraînement" error={errors.name}>
          {(p) => <Input value={form.name} maxLength={60} placeholder="Full Body D" onChange={(e) => setForm({ ...form, name: e.target.value })} {...p} />}
        </Field>
        <Field label="Objectif / focus" error={errors.focus}>
          {(p) => <Input value={form.focus} maxLength={60} placeholder="Hypertrophie · Haut du corps" onChange={(e) => setForm({ ...form, focus: e.target.value })} {...p} />}
        </Field>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-label-caps text-ink">Exercices ({form.exercises.length})</h2>
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <span className="tabular">{density.totalSets} séries</span>
          {density.pushPct !== null && <Pill tone="neutral">Push/Pull {density.pushPct}:{density.pullPct}</Pill>}
        </div>
      </div>
      {errors.exercises && <InlineError message={errors.exercises} />}

      <ol className="flex flex-col gap-3">
        {form.exercises.map((item, index) => {
          const exercise = byId.get(item.exerciseId);
          const duration = exercise?.trackingType === "duration";
          const err = (k: string) => errors[`exercises.${index}.${k}`];
          return (
            <li key={`${item.exerciseId}-${index}`}>
              <Card padding="md">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 font-display text-[18px] font-bold text-lime tabular">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => setPicker({ replaceIndex: index })} className="text-left text-headline-sm text-ink-strong hover:text-lime">
                      {exercise?.name ?? "Exercice introuvable"}
                    </button>
                    {exercise && (
                      <div className="mt-1.5">
                        <MuscleCaps muscles={exercise.primaryMuscles} max={3} />
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton label="Monter" size="sm" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton label="Descendre" size="sm" variant="ghost" disabled={index === form.exercises.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <IconButton label="Retirer l'exercice" size="sm" variant="ghost" className="text-danger-soft" onClick={() => remove(index)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="flex flex-col gap-1.5">
                    <LabelCaps>Séries</LabelCaps>
                    <div className="flex h-12 items-center justify-between rounded-field border border-line bg-surface-lowest px-1">
                      <IconButton label="Retirer une série" size="sm" variant="ghost" disabled={item.sets <= 1} onClick={() => update(index, { sets: item.sets - 1 })}>
                        <Minus className="size-4" />
                      </IconButton>
                      <span className="font-display text-[18px] font-bold text-ink-strong tabular" aria-live="polite">
                        {item.sets}
                      </span>
                      <IconButton label="Ajouter une série" size="sm" variant="ghost" disabled={item.sets >= 10} onClick={() => update(index, { sets: item.sets + 1 })}>
                        <Plus className="size-4" />
                      </IconButton>
                    </div>
                  </div>
                  {duration ? (
                    <>
                      <Field label="Durée min (s)" error={err("durationMinSec")}>
                        {(p) => <NumberInput value={item.durationMinSec} onValueChange={(v) => update(index, { durationMinSec: v })} {...p} />}
                      </Field>
                      <Field label="Durée max (s)" error={err("durationMaxSec")}>
                        {(p) => <NumberInput value={item.durationMaxSec} onValueChange={(v) => update(index, { durationMaxSec: v })} {...p} />}
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label="Reps min" error={err("repsMin")}>
                        {(p) => <NumberInput value={item.repsMin} onValueChange={(v) => update(index, { repsMin: v })} {...p} />}
                      </Field>
                      <Field label="Reps max" error={err("repsMax")}>
                        {(p) => <NumberInput value={item.repsMax} onValueChange={(v) => update(index, { repsMax: v })} {...p} />}
                      </Field>
                    </>
                  )}
                  <Field label="Repos" error={err("restSec")}>
                    {(p) => (
                      <select
                        value={item.restSec}
                        onChange={(e) => update(index, { restSec: Number(e.target.value) })}
                        className="h-12 w-full rounded-field border border-line bg-surface-lowest px-3 text-[15px] text-ink-strong tabular focus:border-lime focus:outline-none"
                        {...p}
                      >
                        {[...new Set([...REST_OPTIONS, item.restSec])].sort((a, b) => a - b).map((s) => (
                          <option key={s} value={s}>
                            {formatClock(s)}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </div>
                {exercise?.trackingType === "weight_reps" && (
                  <Field label="Charge de départ (kg, optionnelle)" error={err("targetWeightKg")} className="mt-3 sm:max-w-[240px]">
                    {(p) => <NumberInput decimals={1} value={item.targetWeightKg} onValueChange={(v) => update(index, { targetWeightKg: v })} placeholder="Reprise de la dernière séance" {...p} />}
                  </Field>
                )}
              </Card>
            </li>
          );
        })}
      </ol>

      <Button variant="secondary" size="lg" block icon={<Plus className="size-5 text-lime" />} onClick={() => setPicker({ replaceIndex: null })} disabled={form.exercises.length >= 20}>
        Ajouter un exercice
      </Button>

      <InlineError message={save.error} />

      <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 border-t border-line glass-bar px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex max-w-6xl gap-3">
          <Button variant="secondary" size="lg" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button size="lg" block loading={save.pending} onClick={submit} icon={<Save className="size-5" />}>
            {workoutId ? "Enregistrer" : "Créer l'entraînement"}
          </Button>
        </div>
      </div>

      {picker && (
        <ExercisePicker
          open
          title={picker.replaceIndex != null ? "Remplacer l'exercice" : "Ajouter un exercice"}
          onClose={() => setPicker(null)}
          onPick={pick}
          excluded={form.exercises.map((e) => e.exerciseId)}
        />
      )}
    </div>
  );
}
