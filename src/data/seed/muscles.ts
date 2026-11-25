import type { MuscleGroup, MuscleId } from "@/types/domain";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  { id: "chest", name: "Pectoraux", shortName: "Pecs", region: "upper", bias: "push", views: ["front"] },
  { id: "shoulders", name: "Épaules", shortName: "Épaules", region: "upper", bias: "push", views: ["front", "back"] },
  { id: "biceps", name: "Biceps", shortName: "Biceps", region: "upper", bias: "pull", views: ["front"] },
  { id: "triceps", name: "Triceps", shortName: "Triceps", region: "upper", bias: "push", views: ["back"] },
  { id: "forearms", name: "Avant-bras", shortName: "Avant-bras", region: "upper", bias: "pull", views: ["front", "back"] },
  { id: "abs", name: "Abdominaux", shortName: "Abdos", region: "core", bias: "core", views: ["front"] },
  { id: "obliques", name: "Obliques", shortName: "Obliques", region: "core", bias: "core", views: ["front"] },
  { id: "traps", name: "Trapèzes", shortName: "Trapèzes", region: "upper", bias: "pull", views: ["front", "back"] },
  { id: "lats", name: "Grand dorsal", shortName: "Dorsaux", region: "upper", bias: "pull", views: ["back"] },
  { id: "upper_back", name: "Haut du dos", shortName: "Haut du dos", region: "upper", bias: "pull", views: ["back"] },
  { id: "lower_back", name: "Lombaires", shortName: "Lombaires", region: "core", bias: "core", views: ["back"] },
  { id: "glutes", name: "Fessiers", shortName: "Fessiers", region: "lower", bias: "legs", views: ["back"] },
  { id: "quads", name: "Quadriceps", shortName: "Quadriceps", region: "lower", bias: "legs", views: ["front"] },
  { id: "hamstrings", name: "Ischio-jambiers", shortName: "Ischios", region: "lower", bias: "legs", views: ["back"] },
  { id: "adductors", name: "Adducteurs", shortName: "Adducteurs", region: "lower", bias: "legs", views: ["front"] },
  { id: "calves", name: "Mollets", shortName: "Mollets", region: "lower", bias: "legs", views: ["front", "back"] },
];

export const MUSCLE_BY_ID: Record<MuscleId, MuscleGroup> = Object.fromEntries(
  MUSCLE_GROUPS.map((m) => [m.id, m]),
) as Record<MuscleId, MuscleGroup>;

export function muscleName(id: MuscleId): string {
  return MUSCLE_BY_ID[id]?.name ?? id;
}
