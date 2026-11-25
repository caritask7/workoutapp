"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  CircleCheckBig,
  EllipsisVertical,
  History,
  Info,
  ListChecks,
  Pause,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button, ConfirmSheet, ErrorState, IconButton, InlineError, LabelCaps, PageSkeleton, ProgressBar, SegmentedControl, Sheet, StatusDot, useToast } from "@/components/ui";
import { BodyMap, exerciseIntensity } from "@/components/body/body-map";
import { preferredView } from "@/components/body/body-zones";
import { ExerciseDiagram } from "@/components/workout/exercise-diagram";
import { ExercisePicker, EQUIPMENT_LABEL } from "@/components/workout/exercise-picker";
import { SetRow, type RowState } from "@/components/session/set-row";
import { RestTimer } from "@/components/session/rest-timer";
import { useData, useMutation } from "@/hooks/use-data";
import { useNow } from "@/hooks/use-clock";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { MUSCLE_BY_ID } from "@/data/seed/muscles";
import { sessionElapsedSec, totalVolume } from "@/lib/domain/training";
import { formatClock, formatDateShort, formatDecimal, formatInt } from "@/lib/format";
import { primeAudio, restFinishedAlert } from "@/lib/alerts";
import { cn } from "@/lib/cn";
import type { Services } from "@/services";
import type { ExerciseWithMuscles, WorkoutSet } from "@/types/domain";
import { routes } from "@/lib/routes";

async function loadSession(s: Services, id: string) {
  const session = await s.sessions.getSession(id);
  if (!session) return null;
  const ids = session.plan.map((p) => p.exerciseId);
  const [sets, exercises, previous, profile] = await Promise.all([
    s.sessions.listSets(id),
    s.catalog.getExercisesByIds(ids),
    s.sessions.previousPerformance(ids),
    s.profile.getProfile(),
  ]);
  return { session, sets, exercises, previous, preferences: profile?.preferences };
}

/** Mode entraînement (maquette active.png), utilisable d'une main. */
export function SessionScreen({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const state = useData((s) => loadSession(s, id), [id]);
  const now = useNow();
  const [visual, setVisual] = useState<"diagram" | "muscles">("diagram");
  const [menu, setMenu] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const alerted = useRef<string | null>(null);
  useWakeLock(state.data?.session.status === "in_progress");

  const act = useMutation(async (s, fn: (s: Services) => Promise<unknown>) => fn(s));
  const finish = useMutation((s) => s.sessions.finishSession(id), {
    onSuccess: () => router.replace(routes.sessionSummary(id)),
  });
  const discard = useMutation((s) => s.sessions.discardSession(id), {
    onSuccess: () => {
      toast("Séance abandonnée");
      router.replace("/workouts");
    },
  });

  const data = state.data;
  const session = data?.session;
  const restEndsAt = session?.restEndsAt ?? null;
  const remaining = restEndsAt && now ? Math.max(0, Math.round((new Date(restEndsAt).getTime() - now) / 1000)) : null;

  // Fin du repos : alerte unique puis effacement du minuteur persistant.
  useEffect(() => {
    if (!restEndsAt || remaining === null || remaining > 0 || alerted.current === restEndsAt) return;
    alerted.current = restEndsAt;
    restFinishedAlert({ sound: data?.preferences?.restTimerSound ?? true, vibration: data?.preferences?.restTimerVibration ?? true });
    void act.run((s) => s.sessions.clearRest(id));
  }, [remaining, restEndsAt, data?.preferences, act, id]);

  useEffect(() => {
    if (session?.status === "completed") router.replace(routes.sessionSummary(id));
  }, [session?.status, id, router]);

  if (state.loading) return <div className="p-4"><PageSkeleton blocks={3} /></div>;
  if (!data || !session) {
    return (
      <div className="p-4">
        <ErrorState message={state.error ?? "Séance introuvable ou supprimée."} />
        <div className="mt-4 text-center">
          <Link href="/workouts" className="text-lime underline">
            Retour aux entraînements
          </Link>
        </div>
      </div>
    );
  }
  if (session.status === "completed") return <div className="p-4"><PageSkeleton blocks={2} /></div>;

  const { sets, exercises, previous, preferences } = data;
  const index = session.currentIndex;
  const item = session.plan[index];
  const exercise: ExerciseWithMuscles | undefined = exercises.get(item.exerciseId);
  const itemSets = sets.filter((s) => s.planIndex === index);
  const firstOpen = itemSets.find((s) => !s.completed);
  const doneSets = sets.filter((s) => s.completed);
  const volumePct = sets.length ? Math.round((doneSets.length / sets.length) * 100) : 0;
  const elapsed = now ? sessionElapsedSec(session, new Date(now)) : 0;
  const paused = session.status === "paused";
  const isLast = index === session.plan.length - 1;
  const nextItem = session.plan[index + 1];
  const busy = act.pending || finish.pending;
  const restTotal = item.restSec;
  const increment = preferences?.weightIncrementKg ?? 2.5;

  const rowState = (s: WorkoutSet): RowState => (s.completed ? "done" : s.id === firstOpen?.id ? "current" : "upcoming");

  const updateSet = (set: WorkoutSet, patch: Partial<Pick<WorkoutSet, "weightKg" | "reps" | "durationSec">>) =>
    void act.run((s) => s.sessions.updateSet(set.id, patch));

  const toggleSet = async (set: WorkoutSet) => {
    primeAudio();
    if (set.completed) {
      await act.run((s) => s.sessions.updateSet(set.id, { completed: false }));
      return;
    }
    const missing =
      item.trackingType === "duration" ? !set.durationSec : item.trackingType === "weight_reps" ? set.weightKg == null || !set.reps : !set.reps;
    if (missing) {
      toast(item.trackingType === "weight_reps" ? "Renseignez la charge et les répétitions" : "Renseignez la valeur réalisée", "error");
      return;
    }
    await act.run(async (s) => {
      await s.sessions.updateSet(set.id, { completed: true });
      const remainingInSession = sets.filter((x) => !x.completed && x.id !== set.id).length;
      if ((preferences?.autoStartRestTimer ?? true) && remainingInSession > 0 && item.restSec > 0) {
        await s.sessions.startRest(id, item.restSec);
      }
    });
  };

  const goTo = (i: number) => void act.run((s) => s.sessions.setCurrentIndex(id, i));

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Barre supérieure */}
      <header className="safe-top sticky top-0 z-30 border-b border-line/60 glass-bar">
        <div className="flex h-16 items-center gap-3 px-4">
          <IconButton label="Quitter le mode entraînement (la séance reste enregistrée)" variant="ghost" onClick={() => router.push("/workouts")}>
            <ArrowLeft className="size-5" />
          </IconButton>
          <p className="min-w-0 flex-1 truncate text-headline-sm text-ink-strong uppercase">Séance active</p>
          <IconButton
            label={paused ? "Reprendre la séance" : "Mettre en pause"}
            variant={paused ? "lime" : "subtle"}
            onClick={() => void act.run((s) => (paused ? s.sessions.resumeSession(id) : s.sessions.pauseSession(id)))}
            disabled={busy}
          >
            {paused ? <Play className="size-5 fill-current" /> : <Pause className="size-5" />}
          </IconButton>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2 text-label-caps text-ink">
              <StatusDot live={!paused} className={paused ? "bg-subtle shadow-none" : undefined} />
              <span className="truncate">
                {session.workoutName} • {paused ? "En pause" : "En cours"}
              </span>
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <span className={cn("font-display text-[30px] font-bold leading-none tabular", paused ? "text-muted" : "text-lime")} aria-label="Durée de séance">
                {formatClock(elapsed)}
              </span>
              <Button size="sm" variant="danger" onClick={() => setFinishing(true)} disabled={busy}>
                Terminer
              </Button>
            </div>
          </div>
          <button type="button" onClick={() => setSwitcher(true)} className="mt-3 flex w-full items-center justify-between text-label-caps">
            <span className="flex items-center gap-1.5 text-ink">
              Exercice {index + 1} sur {session.plan.length}
              <ListChecks className="size-3.5 text-subtle" aria-hidden />
            </span>
            <span className="text-lime tabular">{volumePct}% des séries</span>
          </button>
          <ProgressBar value={volumePct} size="sm" className="mt-2" label="Progression de la séance" />
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 pb-[calc(170px+env(safe-area-inset-bottom))] md:grid md:grid-cols-2 md:items-start md:gap-5">
        {/* Carte exercice */}
        <section className="rounded-card-lg border border-line/70 bg-surface p-4" aria-labelledby="exercise-name">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-2 text-label-caps text-muted">
                <StatusDot />
                {exercise ? EQUIPMENT_LABEL[exercise.equipment] : "Exercice"}
              </p>
              <h1 id="exercise-name" className="text-[28px] font-display font-bold leading-[1.15] tracking-[-0.02em] text-ink-strong">
                {item.exerciseName}
              </h1>
              {exercise && (
                <p className="mt-1 text-[14px] text-muted">
                  {exercise.primaryMuscles.map((m) => MUSCLE_BY_ID[m].name).join(", ")}
                  {exercise.secondaryMuscles.length > 0 && <span className="text-subtle"> · {exercise.secondaryMuscles.map((m) => MUSCLE_BY_ID[m].shortName).join(", ")}</span>}
                </p>
              )}
            </div>
            <IconButton label="Options de l'exercice" variant="subtle" onClick={() => setMenu(true)}>
              <EllipsisVertical className="size-5" />
            </IconButton>
          </div>

          {exercise && (
            <div className="mt-4">
              <SegmentedControl
                label="Affichage"
                value={visual}
                onChange={setVisual}
                className="mb-3"
                options={[
                  { value: "diagram", label: "Exécution" },
                  { value: "muscles", label: "Muscles sollicités" },
                ]}
              />
              {visual === "diagram" ? (
                <ExerciseDiagram pattern={exercise.pattern} equipment={exercise.equipment} restSec={item.restSec} />
              ) : (
                <div className="grid grid-cols-2 gap-2 rounded-card border border-line/60 bg-surface-lowest p-3">
                  {(["front", "back"] as const).map((v) => (
                    <BodyMap
                      key={v}
                      view={v}
                      intensity={exerciseIntensity(exercise.primaryMuscles, exercise.secondaryMuscles)}
                      title={`${v === "front" ? "Face" : "Dos"} : muscles sollicités`}
                      className={cn("max-w-[150px]", preferredView(exercise.primaryMuscles) !== v && "opacity-80")}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <RestTimer
              remainingSec={paused ? null : remaining}
              totalSec={restTotal}
              plannedSec={item.restSec}
              disabled={busy || paused}
              onAdd={() => void act.run((s) => s.sessions.startRest(id, (remaining ?? 0) + 30))}
              onSkip={() => void act.run((s) => s.sessions.clearRest(id))}
              onStart={() => {
                primeAudio();
                void act.run((s) => s.sessions.startRest(id, item.restSec));
              }}
            />
          </div>
        </section>

        {/* Tableau des séries */}
        <section className="mt-4 rounded-card-lg border border-line/70 bg-surface p-3 md:mt-0" aria-label="Séries">
          <div
            className={cn(
              "mb-1 grid gap-1.5 px-2.5 py-2 text-label-caps text-muted",
              item.trackingType === "weight_reps" ? "grid-cols-[20px_minmax(0,1fr)_minmax(60px,84px)_minmax(48px,64px)_56px]" : "grid-cols-[20px_minmax(0,1fr)_minmax(64px,96px)_56px]",
            )}
            aria-hidden
          >
            <span>Set</span>
            <span>Préc.</span>
            {item.trackingType === "weight_reps" && <span className="text-center">Kg</span>}
            <span className="text-center">{item.trackingType === "duration" ? "Sec" : "Reps"}</span>
            <span className="text-right">Action</span>
          </div>
          <ol className="flex flex-col gap-2">
            {itemSets.map((set, i) => (
              <SetRow
                key={set.id}
                set={set}
                item={item}
                previous={previous.get(item.exerciseId)?.[i]}
                state={rowState(set)}
                disabled={paused}
                onChange={(patch) => updateSet(set, patch)}
                onToggle={() => void toggleSet(set)}
                onRemove={itemSets.length > 1 && !set.completed && set.id !== firstOpen?.id ? () => void act.run((s) => s.sessions.removeSet(set.id)) : undefined}
              />
            ))}
          </ol>
          <div className="mt-3 flex justify-center">
            <Button variant="ghost" size="md" icon={<Plus className="size-4 text-lime" />} onClick={() => void act.run((s) => s.sessions.addSet(id, index))} disabled={busy || paused || itemSets.length >= 12}>
              Ajouter une série
            </Button>
          </div>
          {firstOpen && item.trackingType === "weight_reps" && (
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-surface-2 p-2" role="group" aria-label={`Ajuster la charge de la série ${firstOpen.setNumber}`}>
              <Button
                variant="subtle"
                className="h-14 flex-1 text-[16px]"
                disabled={busy || paused}
                onClick={() => updateSet(firstOpen, { weightKg: Math.max(0, Math.round(((firstOpen.weightKg ?? 0) - increment) * 100) / 100) })}
              >
                −{formatDecimal(increment)}
              </Button>
              <span className="w-24 text-center">
                <span className="block text-label-caps text-muted">Série {firstOpen.setNumber}</span>
                <span className="font-display text-[18px] font-bold text-ink-strong tabular">{firstOpen.weightKg != null ? `${formatDecimal(firstOpen.weightKg)} kg` : "— kg"}</span>
              </span>
              <Button
                variant="subtle"
                className="h-14 flex-1 text-[16px]"
                disabled={busy || paused}
                onClick={() => updateSet(firstOpen, { weightKg: Math.round(((firstOpen.weightKg ?? 0) + increment) * 100) / 100 })}
              >
                +{formatDecimal(increment)}
              </Button>
            </div>
          )}
          <InlineError message={act.error} />
        </section>
      </main>

      {/* Barre d'action inférieure */}
      <footer className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line glass-bar">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pt-3 pb-3">
          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-card bg-surface-2 px-4 py-2.5">
              <Sparkles className="size-5 shrink-0 text-lime" aria-hidden />
              <div className="min-w-0">
                <LabelCaps as="p">Charge totale</LabelCaps>
                <p className="truncate text-[16px] font-semibold text-ink-strong tabular">{formatInt(totalVolume(sets))} kg cumulés</p>
              </div>
            </div>
            <IconButton label="Historique de l'exercice" size="lg" onClick={() => setHistoryOpen(true)}>
              <History className="size-5" />
            </IconButton>
            <IconButton label="Remplacer l'exercice" size="lg" onClick={() => setReplacing(true)} disabled={itemSets.some((s) => s.completed)}>
              <ArrowRightLeft className="size-5" />
            </IconButton>
          </div>
          {isLast ? (
            <Button size="lg" block icon={<CircleCheckBig className="size-5" />} onClick={() => setFinishing(true)} disabled={busy}>
              Terminer la séance
            </Button>
          ) : (
            <Button size="lg" block trailingIcon={<ArrowRight className="size-5" />} onClick={() => goTo(index + 1)} disabled={busy} className="justify-between">
              <span className="truncate">Exercice suivant : {nextItem?.exerciseName}</span>
            </Button>
          )}
        </div>
      </footer>

      {paused && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 px-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="paused-title">
          <div className="w-full max-w-sm rounded-[24px] border border-line-strong bg-[#222326] p-6 text-center">
            <Pause className="mx-auto size-10 text-lime" aria-hidden />
            <h2 id="paused-title" className="mt-3 text-headline-md text-ink-strong">
              Séance en pause
            </h2>
            <p className="mt-1 text-[14px] text-muted">Le chronomètre est arrêté. Vos saisies sont enregistrées.</p>
            <Button size="lg" block className="mt-5" icon={<Play className="size-5 fill-current" />} onClick={() => void act.run((s) => s.sessions.resumeSession(id))} loading={act.pending}>
              Reprendre
            </Button>
            <Button variant="ghost" block className="mt-2" onClick={() => router.push("/")}>
              Quitter (reprendre plus tard)
            </Button>
          </div>
        </div>
      )}

      {/* Options */}
      <Sheet open={menu} onClose={() => setMenu(false)} title={item.exerciseName}>
        <div className="flex flex-col gap-2">
          <Link href={routes.exercise(item.exerciseId)} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-surface-3" onClick={() => setMenu(false)}>
            <Info className="size-5 text-lime" aria-hidden /> Fiche de l&apos;exercice
          </Link>
          <button type="button" className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface-3" onClick={() => { setMenu(false); setHistoryOpen(true); }}>
            <History className="size-5 text-lime" aria-hidden /> Historique des charges
          </button>
          <button
            type="button"
            disabled={itemSets.some((s) => s.completed)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface-3 disabled:opacity-40"
            onClick={() => { setMenu(false); setReplacing(true); }}
          >
            <ArrowRightLeft className="size-5 text-lime" aria-hidden /> Remplacer l&apos;exercice
          </button>
        </div>
      </Sheet>

      {/* Navigation entre exercices */}
      <Sheet open={switcher} onClose={() => setSwitcher(false)} title="Exercices de la séance">
        <ol className="flex flex-col gap-2">
          {session.plan.map((p, i) => {
            const own = sets.filter((s) => s.planIndex === i);
            const done = own.filter((s) => s.completed).length;
            return (
              <li key={`${p.exerciseId}-${i}`}>
                <button
                  type="button"
                  onClick={() => { goTo(i); setSwitcher(false); }}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left", i === index ? "bg-lime/10" : "hover:bg-surface-3")}
                >
                  <span className="font-display font-bold text-lime tabular">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-strong">{p.exerciseName}</span>
                  <span className={cn("text-[13px] tabular", done === own.length && own.length ? "text-lime" : "text-muted")}>
                    {done}/{own.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </Sheet>

      {historyOpen && <ExerciseHistorySheet exerciseId={item.exerciseId} name={item.exerciseName} currentSessionId={id} onClose={() => setHistoryOpen(false)} />}

      {replacing && (
        <ExercisePicker
          open
          title="Remplacer l'exercice"
          onClose={() => setReplacing(false)}
          excluded={session.plan.map((p) => p.exerciseId)}
          onPick={(e) => {
            setReplacing(false);
            void act.run((s) => s.sessions.replaceExercise(id, index, e.id, e.name, e.trackingType));
          }}
        />
      )}

      <ConfirmSheet
        open={finishing}
        onClose={() => setFinishing(false)}
        onConfirm={() => {
          if (!doneSets.length) {
            setFinishing(false);
            setDiscarding(true);
            return;
          }
          void finish.run();
        }}
        loading={finish.pending}
        title="Terminer la séance ?"
        description={
          doneSets.length
            ? `${doneSets.length} série${doneSets.length > 1 ? "s" : ""} validée${doneSets.length > 1 ? "s" : ""} sur ${sets.length} · ${formatInt(totalVolume(sets))} kg. Les séries non validées ne seront pas comptées.`
            : "Aucune série validée : la séance ne peut pas être enregistrée. Vous pouvez l'abandonner."
        }
        confirmLabel={doneSets.length ? "Terminer et enregistrer" : "Abandonner…"}
      />
      <ConfirmSheet
        open={discarding}
        onClose={() => setDiscarding(false)}
        onConfirm={() => void discard.run()}
        loading={discard.pending}
        danger
        title="Abandonner la séance ?"
        description="La séance et toutes ses saisies seront supprimées."
        confirmLabel="Abandonner"
      />
      {finish.error && (
        <div className="fixed inset-x-4 top-20 z-50">
          <InlineError message={finish.error} />
        </div>
      )}
    </div>
  );
}

function ExerciseHistorySheet({ exerciseId, name, currentSessionId, onClose }: { exerciseId: string; name: string; currentSessionId: string; onClose: () => void }) {
  const history = useData((s) => s.sessions.exerciseHistory(exerciseId, 10), [exerciseId]);
  const entries = (history.data ?? []).filter((h) => h.session.id !== currentSessionId);
  return (
    <Sheet open onClose={onClose} title={`Historique · ${name}`}>
      {history.loading ? (
        <PageSkeleton blocks={1} />
      ) : entries.length ? (
        <ul className="flex flex-col gap-3">
          {entries.map((h) => (
            <li key={h.session.id} className="rounded-xl bg-surface-2 p-3">
              <div className="mb-1.5 flex justify-between text-[13px]">
                <span className="text-muted">{formatDateShort(h.session.startedAt)}</span>
                <span className="font-semibold text-lime tabular">{formatInt(h.volumeKg)} kg</span>
              </div>
              <p className="text-[14px] text-ink-strong tabular">
                {h.sets
                  .map((s) => (s.durationSec ? `${s.durationSec} s` : s.weightKg != null ? `${formatDecimal(s.weightKg)}×${s.reps}` : `${s.reps} reps`))
                  .join("  ·  ")}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-muted">Aucune performance enregistrée pour cet exercice.</p>
      )}
    </Sheet>
  );
}
