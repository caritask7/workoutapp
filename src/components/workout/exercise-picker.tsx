"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Button, Chip, Field, InlineError, Input, NumberInput, PageSkeleton, Select, Sheet, Textarea } from "@/components/ui";
import { useData, useMutation } from "@/hooks/use-data";
import { MUSCLE_BY_ID, MUSCLE_GROUPS } from "@/data/seed/muscles";
import { normalizeText } from "@/services/data/query";
import { customExerciseSchema, fieldErrors, type CustomExerciseInput } from "@/lib/validation/schemas";
import { cn } from "@/lib/cn";
import type { Equipment, ExerciseWithMuscles, MuscleId, TrackingType } from "@/types/domain";

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: "Barre",
  dumbbell: "Haltères",
  machine: "Machine",
  cable: "Poulie",
  bodyweight: "Poids du corps",
  kettlebell: "Kettlebell",
  other: "Autre",
};

const TRACKING_LABEL: Record<TrackingType, string> = {
  weight_reps: "Charge × répétitions",
  reps: "Répétitions seules",
  duration: "Durée (secondes)",
};

/** Feuille de choix d'un exercice : recherche, filtre musculaire, création. */
export function ExercisePicker({
  open,
  onClose,
  onPick,
  excluded = [],
  title = "Ajouter un exercice",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exercise: ExerciseWithMuscles) => void;
  excluded?: string[];
  title?: string;
}) {
  const catalog = useData((s) => s.catalog.listExercises());
  const [term, setTerm] = useState("");
  const [muscle, setMuscle] = useState<MuscleId | null>(null);
  const [creating, setCreating] = useState(false);

  const results = useMemo(() => {
    const t = normalizeText(term);
    return (catalog.data ?? []).filter(
      (e) =>
        (!t || normalizeText(e.name).includes(t)) &&
        (!muscle || e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle)),
    );
  }, [catalog.data, term, muscle]);

  return (
    <Sheet open={open} onClose={onClose} title={creating ? "Nouvel exercice" : title} size="lg">
      {creating ? (
        <CustomExerciseForm
          initialName={term}
          onCancel={() => setCreating(false)}
          onCreated={(e) => {
            setCreating(false);
            onPick(e);
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <label className="relative block">
            <span className="sr-only">Rechercher un exercice</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Rechercher (squat, curl…)" className="pl-10" autoFocus />
          </label>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Filtrer par muscle">
            {MUSCLE_GROUPS.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={muscle === m.id}
                onClick={() => setMuscle(muscle === m.id ? null : m.id)}
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-label-caps transition-colors",
                  muscle === m.id ? "bg-lime text-on-lime" : "bg-surface-3 text-ink hover:bg-surface-4",
                )}
              >
                {m.shortName}
              </button>
            ))}
          </div>

          {catalog.loading ? (
            <PageSkeleton blocks={2} />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {results.map((e) => {
                const already = excluded.includes(e.id);
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onPick(e)}
                      className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-surface-3/40"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] text-ink-strong">
                          {e.name}
                          {e.ownerId && <span className="ml-2 text-label-caps text-lime">Perso</span>}
                        </span>
                        <span className="block truncate text-[12px] text-muted">
                          {EQUIPMENT_LABEL[e.equipment]} · {e.primaryMuscles.map((m) => MUSCLE_BY_ID[m].name).join(", ")}
                        </span>
                      </span>
                      {already ? (
                        <Check className="size-4 shrink-0 text-lime" aria-label="Déjà dans la séance" />
                      ) : (
                        <Plus className="size-4 shrink-0 text-subtle" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
              {!results.length && <li className="py-6 text-center text-[14px] text-muted">Aucun exercice ne correspond.</li>}
            </ul>
          )}

          <Button variant="secondary" block icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Créer un exercice personnalisé
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function MuscleChoice({ value, onChange, exclude = [] }: { value: MuscleId[]; onChange: (v: MuscleId[]) => void; exclude?: MuscleId[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {MUSCLE_GROUPS.filter((m) => !exclude.includes(m.id)).map((m) => (
        <Chip key={m.id} selected={value.includes(m.id)} onToggle={() => onChange(value.includes(m.id) ? value.filter((x) => x !== m.id) : [...value, m.id])}>
          {m.shortName}
        </Chip>
      ))}
    </div>
  );
}

function CustomExerciseForm({
  initialName,
  onCancel,
  onCreated,
}: {
  initialName: string;
  onCancel: () => void;
  onCreated: (e: ExerciseWithMuscles) => void;
}) {
  const [form, setForm] = useState<CustomExerciseInput>({
    name: initialName,
    equipment: "dumbbell",
    trackingType: "weight_reps",
    primaryMuscles: [],
    secondaryMuscles: [],
    description: "",
    instructions: [],
    defaultRestSec: 90,
  });
  const [instructions, setInstructions] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation((s, input: CustomExerciseInput) => s.catalog.createCustomExercise(input), { onSuccess: onCreated });
  const set = <K extends keyof CustomExerciseInput>(k: K, v: CustomExerciseInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const parsed = customExerciseSchema.safeParse({
      ...form,
      instructions: instructions
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    void create.run(parsed.data);
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Nom" error={errors.name}>
        {(p) => <Input value={form.name} maxLength={60} onChange={(e) => set("name", e.target.value)} {...p} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Matériel">
          {(p) => (
            <Select value={form.equipment} onChange={(e) => set("equipment", e.target.value as Equipment)} {...p}>
              {Object.entries(EQUIPMENT_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Mesure">
          {(p) => (
            <Select value={form.trackingType} onChange={(e) => set("trackingType", e.target.value as TrackingType)} {...p}>
              {Object.entries(TRACKING_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-label-caps text-muted">Muscles principaux</legend>
        <MuscleChoice value={form.primaryMuscles} onChange={(v) => set("primaryMuscles", v)} />
        {errors.primaryMuscles && <p className="mt-1.5 text-[12px] text-danger-soft">{errors.primaryMuscles}</p>}
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-label-caps text-muted">Muscles secondaires</legend>
        <MuscleChoice value={form.secondaryMuscles} onChange={(v) => set("secondaryMuscles", v)} exclude={form.primaryMuscles} />
      </fieldset>
      <Field label="Repos par défaut (s)" error={errors.defaultRestSec}>
        {(p) => <NumberInput value={form.defaultRestSec} onValueChange={(v) => set("defaultRestSec", v ?? 0)} {...p} />}
      </Field>
      <Field label="Description" error={errors.description}>
        {(p) => <Textarea value={form.description} maxLength={500} onChange={(e) => set("description", e.target.value)} {...p} />}
      </Field>
      <Field label="Consignes (une par ligne)" error={errors.instructions}>
        {(p) => <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} {...p} />}
      </Field>
      <InlineError message={create.error} />
      <div className="flex gap-3">
        <Button variant="secondary" block onClick={onCancel}>
          Retour
        </Button>
        <Button block onClick={submit} loading={create.pending}>
          Créer et ajouter
        </Button>
      </div>
    </div>
  );
}
