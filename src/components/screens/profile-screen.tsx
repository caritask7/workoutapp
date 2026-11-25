"use client";

import { useState } from "react";
import { Database, LogOut, RotateCcw, Save } from "lucide-react";
import { Button, Card, CardHeader, ConfirmSheet, ErrorState, Field, InlineError, Input, NumberInput, PageSkeleton, Select, Switch, Textarea, useToast } from "@/components/ui";
import { PageHeader } from "@/components/layout/page-header";
import { useData, useMutation } from "@/hooks/use-data";
import { useDataContext } from "@/providers/data-provider";
import { WEEKDAY_SHORT } from "@/lib/domain/dates";
import { fieldErrors, profileSchema, type ProfileInput } from "@/lib/validation/schemas";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Services } from "@/services";
import type { FitnessGoal, FitnessLevel, Profile, Weekday, WorkoutProgram } from "@/types/domain";

const LEVELS: Record<FitnessLevel, string> = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Confirmé" };
const GOALS: Record<FitnessGoal, string> = {
  muscle_gain: "Prise de muscle et de volume",
  strength: "Force",
  fat_loss: "Perte de gras",
  maintenance: "Maintien",
};
const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

async function loadProfile(s: Services) {
  const [profile, program] = await Promise.all([s.profile.getProfile(), s.workouts.getActiveProgram()]);
  return { profile, program };
}

export function ProfileScreen() {
  const state = useData(loadProfile);
  if (state.loading) return <PageSkeleton blocks={4} />;
  if (!state.data?.profile) return <ErrorState message={state.error ?? "Profil introuvable."} onRetry={state.reload} />;
  return <ProfileForm profile={state.data.profile} program={state.data.program} />;
}

function ProfileForm({ profile, program }: { profile: Profile; program: WorkoutProgram | null }) {
  const toast = useToast();
  const { mode, email, signOut, resetDemo } = useDataContext();
  const [form, setForm] = useState<ProfileInput>({
    displayName: profile.displayName,
    age: profile.age,
    heightCm: profile.heightCm,
    startWeightKg: profile.startWeightKg,
    targetWeightMinKg: profile.targetWeightMinKg,
    targetWeightMaxKg: profile.targetWeightMaxKg,
    level: profile.level,
    goal: profile.goal,
    goalNotes: profile.goalNotes,
    trainingDays: profile.trainingDays,
    preferences: profile.preferences,
  });
  const [startDate, setStartDate] = useState(program?.startDate ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmReset, setConfirmReset] = useState(false);

  const save = useMutation(
    async (s, input: ProfileInput) => {
      await s.profile.updateProfile(input);
      if (program) await s.workouts.updateProgram(program.id, { sessionsPerWeek: input.trainingDays.length, startDate: startDate || program.startDate });
    },
    { onSuccess: () => toast("Profil enregistré") },
  );

  const set = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setPref = <K extends keyof ProfileInput["preferences"]>(k: K, v: ProfileInput["preferences"][K]) =>
    setForm((f) => ({ ...f, preferences: { ...f.preferences, [k]: v } }));
  const toggleDay = (d: Weekday) =>
    set("trainingDays", form.trainingDays.includes(d) ? form.trainingDays.filter((x) => x !== d) : [...form.trainingDays, d].sort((a, b) => a - b));

  const submit = () => {
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast("Vérifiez les champs signalés", "error");
      return;
    }
    if (!startDate) {
      setErrors({ startDate: "Date de début requise." });
      return;
    }
    setErrors({});
    void save.run(parsed.data);
  };

  const num = (k: "age" | "heightCm" | "startWeightKg" | "targetWeightMinKg" | "targetWeightMaxKg", label: string, decimals = 1) => (
    <Field label={label} error={errors[k]}>
      {(p) => <NumberInput decimals={decimals} value={form[k]} onValueChange={(v) => set(k, v)} {...p} />}
    </Field>
  );

  return (
    <div className="flex flex-col gap-5 pb-24 lg:pb-0">
      <PageHeader eyebrow="Profil" title={form.displayName || "Profil"} subtitle={`${LEVELS[form.level]} · ${GOALS[form.goal]}`} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Identité & mensurations" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom" error={errors.displayName} className="col-span-2">
              {(p) => <Input value={form.displayName} maxLength={40} onChange={(e) => set("displayName", e.target.value)} {...p} />}
            </Field>
            {num("age", "Âge (ans)", 0)}
            {num("heightCm", "Taille (cm)")}
            {num("startWeightKg", "Poids de départ (kg)")}
            <Field label="Niveau">
              {(p) => (
                <Select value={form.level} onChange={(e) => set("level", e.target.value as FitnessLevel)} {...p}>
                  {Object.entries(LEVELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <p className="mt-3 text-[12px] text-subtle">Le poids actuel provient de vos pesées (écran Progression).</p>
        </Card>

        <Card>
          <CardHeader title="Objectifs" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Objectif principal" className="col-span-2">
              {(p) => (
                <Select value={form.goal} onChange={(e) => set("goal", e.target.value as FitnessGoal)} {...p}>
                  {Object.entries(GOALS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {num("targetWeightMinKg", "Poids cible min (kg)")}
            {num("targetWeightMaxKg", "Poids cible max (kg)")}
            <Field label="Notes" error={errors.goalNotes} className="col-span-2">
              {(p) => <Textarea value={form.goalNotes} maxLength={280} onChange={(e) => set("goalNotes", e.target.value)} {...p} />}
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Planning d'entraînement" />
          <fieldset>
            <legend className="mb-2 text-label-caps text-muted">Jours d&apos;entraînement ({form.trainingDays.length}/semaine)</legend>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = form.trainingDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(d)}
                    className={cn("h-11 rounded-xl text-label-caps transition-colors", on ? "bg-lime text-on-lime" : "bg-surface-3 text-muted hover:text-ink-strong")}
                  >
                    {WEEKDAY_SHORT[d]}
                  </button>
                );
              })}
            </div>
            {errors.trainingDays && <p className="mt-1.5 text-[12px] text-danger-soft">{errors.trainingDays}</p>}
          </fieldset>
          {program && (
            <Field label={`Début du programme (${program.durationWeeks} semaines)`} error={errors.startDate} className="mt-4">
              {(p) => <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} {...p} />}
            </Field>
          )}
        </Card>

        <Card>
          <CardHeader title="Préférences de séance" />
          <Field label="Repos par défaut des exercices ajoutés">
            {(p) => (
              <Select value={form.preferences.defaultRestSec} onChange={(e) => setPref("defaultRestSec", Number(e.target.value))} {...p}>
                {[45, 60, 75, 90, 120, 150, 180].map((s) => (
                  <option key={s} value={s}>
                    {formatClock(s)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="mt-2 divide-y divide-line">
            <Switch checked={form.preferences.autoStartRestTimer} onChange={(v) => setPref("autoStartRestTimer", v)} label="Repos automatique" description="Lance le minuteur à chaque série validée" />
            <Switch checked={form.preferences.restTimerSound} onChange={(v) => setPref("restTimerSound", v)} label="Signal sonore" description="Bip à la fin du repos" />
            <Switch checked={form.preferences.restTimerVibration} onChange={(v) => setPref("restTimerVibration", v)} label="Vibration" description="Sur les appareils compatibles" />
          </div>
        </Card>
      </div>

      <InlineError message={save.error} />

      <Card>
        <CardHeader icon={<Database />} title="Compte & données" />
        {mode === "demo" ? (
          <>
            <p className="text-[14px] text-muted">
              Mode démo : vos données sont enregistrées dans ce navigateur (IndexedDB), sans compte. Configurez Supabase pour la synchronisation multi-appareils (voir README).
            </p>
            <Button variant="danger" className="mt-4" icon={<RotateCcw className="size-4" />} onClick={() => setConfirmReset(true)}>
              Réinitialiser la démo
            </Button>
          </>
        ) : (
          <>
            <p className="text-[14px] text-muted">Connecté{email ? ` en tant que ${email}` : ""}. Données synchronisées (Supabase).</p>
            <Button variant="secondary" className="mt-4" icon={<LogOut className="size-4" />} onClick={() => void signOut()}>
              Se déconnecter
            </Button>
          </>
        )}
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 border-t border-line glass-bar px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto max-w-6xl">
          <Button size="lg" block loading={save.pending} onClick={submit} icon={<Save className="size-5" />}>
            Enregistrer le profil
          </Button>
        </div>
      </div>

      <ConfirmSheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => void resetDemo()}
        danger
        title="Réinitialiser la démo ?"
        description="Toutes les séances, mesures, photos et repas enregistrés dans ce navigateur seront supprimés. Le profil et le programme de démonstration seront rechargés."
        confirmLabel="Tout effacer"
      />
    </div>
  );
}
