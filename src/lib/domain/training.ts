import type {
  IsoDate,
  PersonalRecord,
  RecordType,
  TrackingType,
  WorkoutSession,
  WorkoutSet,
} from "@/types/domain";
import { diffDays } from "./dates";

/** Volume d'une série (kg × reps). Les séries non validées ou sans charge comptent 0. */
export function setVolume(set: Pick<WorkoutSet, "weightKg" | "reps" | "completed">): number {
  if (!set.completed || !set.weightKg || !set.reps) return 0;
  return set.weightKg * set.reps;
}

export function totalVolume(sets: Pick<WorkoutSet, "weightKg" | "reps" | "completed">[]): number {
  return round(sets.reduce((sum, s) => sum + setVolume(s), 0), 1);
}

/**
 * 1RM estimé (formule d'Epley : charge × (1 + reps / 30)).
 * Estimation uniquement, peu fiable au-delà de 12 répétitions.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return round(weightKg * (1 + reps / 30), 1);
}

/** Durée effective d'une séance (hors pauses), en secondes. */
export function sessionElapsedSec(
  session: Pick<WorkoutSession, "startedAt" | "endedAt" | "pausedAt" | "pausedMs">,
  now: Date = new Date(),
): number {
  const start = new Date(session.startedAt).getTime();
  const end = session.endedAt
    ? new Date(session.endedAt).getTime()
    : session.pausedAt
      ? new Date(session.pausedAt).getTime()
      : now.getTime();
  return Math.max(0, Math.floor((end - start - session.pausedMs) / 1000));
}

/**
 * Semaine courante du programme (1 → durationWeeks), bornée.
 * Avant la date de début : semaine 1.
 */
export function programWeek(startDate: IsoDate, today: IsoDate, durationWeeks: number): number {
  const days = diffDays(startDate, today);
  if (days < 0) return 1;
  return Math.min(durationWeeks, Math.floor(days / 7) + 1);
}

/** Valeur de record d'une série pour un type donné, ou `null` si non applicable. */
export function recordValue(
  set: Pick<WorkoutSet, "weightKg" | "reps" | "durationSec" | "completed">,
  type: RecordType,
): number | null {
  if (!set.completed) return null;
  const w = set.weightKg ?? 0;
  const r = set.reps ?? 0;
  switch (type) {
    case "max_weight":
      return w > 0 && r > 0 ? w : null;
    case "est_1rm":
      return w > 0 && r > 0 ? estimateOneRepMax(w, r) : null;
    case "max_set_volume":
      return w > 0 && r > 0 ? round(w * r, 1) : null;
    case "max_reps":
      return r > 0 ? r : null;
    case "max_duration":
      return set.durationSec && set.durationSec > 0 ? set.durationSec : null;
  }
}

export function recordTypesFor(tracking: TrackingType): RecordType[] {
  switch (tracking) {
    case "weight_reps":
      return ["max_weight", "est_1rm", "max_set_volume"];
    case "reps":
      return ["max_reps"];
    case "duration":
      return ["max_duration"];
  }
}

export interface RecordCandidate {
  exerciseId: string;
  type: RecordType;
  value: number;
  weightKg: number | null;
  reps: number | null;
  setId: string;
  previous: number | null;
}

/**
 * Détecte les records battus par les séries d'une séance, en les comparant
 * aux meilleurs records existants. Un seul candidat par (exercice, type).
 */
export function detectRecords(
  sets: WorkoutSet[],
  trackingByExercise: Record<string, TrackingType>,
  existing: Pick<PersonalRecord, "exerciseId" | "type" | "value">[],
): RecordCandidate[] {
  const best = new Map<string, number>();
  for (const rec of existing) {
    const key = `${rec.exerciseId}|${rec.type}`;
    best.set(key, Math.max(best.get(key) ?? 0, rec.value));
  }

  const candidates = new Map<string, RecordCandidate>();
  for (const set of sets) {
    const tracking = trackingByExercise[set.exerciseId];
    if (!tracking) continue;
    for (const type of recordTypesFor(tracking)) {
      const value = recordValue(set, type);
      if (value === null) continue;
      const key = `${set.exerciseId}|${type}`;
      const previous = best.has(key) ? (best.get(key) as number) : null;
      const current = candidates.get(key);
      const threshold = Math.max(previous ?? 0, current?.value ?? 0);
      if (value > threshold) {
        candidates.set(key, {
          exerciseId: set.exerciseId,
          type,
          value,
          weightKg: set.weightKg,
          reps: set.reps,
          setId: set.id,
          previous,
        });
      }
    }
  }
  return [...candidates.values()];
}

/** Formate une cible de répétitions / durée : « 8-10 », « 15 », « 30-45 s ». */
export function formatTarget(item: {
  trackingType: TrackingType;
  repsMin: number | null;
  repsMax: number | null;
  durationMinSec: number | null;
  durationMaxSec: number | null;
}): string {
  const range = (a: number | null, b: number | null) =>
    a !== null && b !== null && a !== b ? `${a}-${b}` : String(a ?? b ?? "—");
  if (item.trackingType === "duration") return `${range(item.durationMinSec, item.durationMaxSec)} s`;
  return range(item.repsMin, item.repsMax);
}

export function round(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
