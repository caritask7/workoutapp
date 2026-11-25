"use client";

import { useState } from "react";
import { Button, Field, Input, InlineError, NumberInput, Sheet, Textarea, useToast } from "@/components/ui";
import { useMutation } from "@/hooks/use-data";
import { toIsoDate } from "@/lib/domain/dates";
import { fieldErrors, measurementSchema, type MeasurementInput } from "@/lib/validation/schemas";
import type { BodyMeasurement } from "@/types/domain";

const EMPTY: MeasurementInput = {
  date: "",
  weightKg: null,
  chestCm: null,
  armCm: null,
  waistCm: null,
  thighCm: null,
  bodyFatPct: null,
  notes: "",
};

/**
 * Saisie d'une mesure corporelle. `weightOnly` affiche uniquement le poids
 * (saisie rapide depuis le tableau de bord).
 */
export function MeasurementSheet({
  open,
  onClose,
  initial,
  weightOnly,
}: {
  open: boolean;
  onClose: () => void;
  initial?: BodyMeasurement | null;
  weightOnly?: boolean;
}) {
  const toast = useToast();
  const [form, setForm] = useState<MeasurementInput>(() => (initial ? { ...EMPTY, ...initial } : { ...EMPTY, date: toIsoDate() }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation((s, input: MeasurementInput) => s.body.saveMeasurement(input, initial?.id), {
    onSuccess: () => {
      toast("Mesure enregistrée");
      onClose();
    },
  });

  const set = <K extends keyof MeasurementInput>(key: K, value: MeasurementInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    const parsed = measurementSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    void save.run(parsed.data);
  };

  const num = (key: "weightKg" | "chestCm" | "armCm" | "waistCm" | "thighCm" | "bodyFatPct", label: string, unit: string) => (
    <Field label={`${label} (${unit})`} error={errors[key]}>
      {(p) => <NumberInput decimals={1} value={form[key]} onValueChange={(v) => set(key, v)} placeholder="—" {...p} />}
    </Field>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={weightOnly ? "Enregistrer mon poids" : initial ? "Modifier la mesure" : "Nouvelle mesure"}
      description="Les champs vides sont ignorés. Une seule mesure par jour : une nouvelle saisie complète celle du jour."
      footer={
        <Button block size="lg" onClick={submit} loading={save.pending}>
          Enregistrer
        </Button>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Date" error={errors.date}>
          {(p) => <Input type="date" value={form.date} max={toIsoDate()} onChange={(e) => set("date", e.target.value)} {...p} />}
        </Field>
        {num("weightKg", "Poids", "kg")}
        {!weightOnly && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {num("chestCm", "Tour de poitrine", "cm")}
              {num("armCm", "Tour de bras", "cm")}
              {num("waistCm", "Tour de taille", "cm")}
              {num("thighCm", "Tour de cuisse", "cm")}
            </div>
            {num("bodyFatPct", "Masse grasse", "%")}
            <Field label="Notes" error={errors.notes}>
              {(p) => <Textarea value={form.notes} maxLength={280} onChange={(e) => set("notes", e.target.value)} {...p} />}
            </Field>
          </>
        )}
        <InlineError message={save.error} />
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
