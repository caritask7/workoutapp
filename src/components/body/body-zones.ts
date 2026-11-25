import type { BodyView, MuscleId } from "@/types/domain";

/**
 * Géométrie anatomique stylisée (viewBox 200 × 420), dans l'esprit de la
 * maquette muscle.png : segments arrondis distincts sur silhouette sombre.
 * Les tracés sont décrits pour la moitié gauche du corps (côté gauche de
 * l'écran) ; `mirror` les duplique symétriquement autour de x = 100.
 */
export interface MuscleZone {
  muscle: MuscleId;
  paths: string[];
  mirror: boolean;
  /** Point d'accroche de l'étiquette (côté gauche). */
  anchor: { x: number; y: number };
}

export interface SilhouettePart {
  d: string;
  mirror: boolean;
}

export const VIEWBOX = { width: 200, height: 420 };

const HEAD = "M100 14c9 0 15 8 15 19s-6 21-15 21-15-10-15-21 6-19 15-19Z";
const NECK = "M92 50h16l2 12H90Z";
const HAND = "M38 222c3-5 10-5 12 0l2 14c-1 6-11 7-14 1Z";
const KNEE = "M76 300c4-4 13-4 16 0 2 5 1 11-2 14-4 3-10 3-13 0-3-4-3-10-1-14Z";
const FOOT = "M76 384c4-2 11-2 14 0l3 16c-1 5-17 6-19 0Z";

export const SILHOUETTE: Record<BodyView, SilhouettePart[]> = {
  front: [
    { d: HEAD, mirror: false },
    { d: NECK, mirror: false },
    { d: HAND, mirror: true },
    { d: "M84 196h32l-3 22-13 12-13-12Z", mirror: false },
    { d: KNEE, mirror: true },
    { d: FOOT, mirror: true },
  ],
  back: [
    { d: HEAD, mirror: false },
    { d: NECK, mirror: false },
    { d: HAND, mirror: true },
    { d: KNEE, mirror: true },
    { d: FOOT, mirror: true },
  ],
};

const SHOULDER = "M70 72c-12 0-20 10-20 24 0 8 4 14 8 16 6-8 12-16 22-24 2-8-2-15-10-16Z";
const UPPER_ARM = "M57 114c-6 8-9 22-7 38 2 6 8 6 11 0 3-12 3-26 1-36Z";
const FOREARM = "M49 160c-5 14-7 32-7 54 2 6 8 6 10 0 4-18 8-36 8-52Z";

export const ZONES: Record<BodyView, MuscleZone[]> = {
  front: [
    { muscle: "traps", mirror: true, anchor: { x: 84, y: 66 }, paths: ["M92 60c-6 6-13 9-21 12l13 4c6-4 9-9 10-15Z"] },
    { muscle: "shoulders", mirror: true, anchor: { x: 62, y: 90 }, paths: [SHOULDER] },
    { muscle: "chest", mirror: true, anchor: { x: 86, y: 100 }, paths: ["M98 80v38c-8 6-20 4-26-4-4-8-2-20 8-28 6-4 12-6 18-6Z"] },
    { muscle: "biceps", mirror: true, anchor: { x: 56, y: 134 }, paths: [UPPER_ARM] },
    { muscle: "forearms", mirror: true, anchor: { x: 50, y: 188 }, paths: [FOREARM] },
    {
      muscle: "abs",
      mirror: true,
      anchor: { x: 94, y: 160 },
      paths: [
        "M89 130a4 4 0 0 1 4-4h6v16h-6a4 4 0 0 1-4-4Z",
        "M89 149a4 4 0 0 1 4-4h6v16h-6a4 4 0 0 1-4-4Z",
        "M89 168a4 4 0 0 1 4-4h6v16h-6a4 4 0 0 1-4-4Z",
        "M89 187a4 4 0 0 1 4-4h6v12c0 6-4 9-6 9s-4-3-4-7Z",
      ],
    },
    { muscle: "obliques", mirror: true, anchor: { x: 81, y: 160 }, paths: ["M80 126c-4 16-4 40 0 64l6 5V128Z"] },
    { muscle: "quads", mirror: true, anchor: { x: 82, y: 256 }, paths: ["M76 214c-6 22-6 52-2 78 4 8 14 8 18 0 4-22 4-48 0-70-6-2-12-6-16-8Z"] },
    { muscle: "adductors", mirror: true, anchor: { x: 96, y: 244 }, paths: ["M95 224c3 8 4 20 4 38-2 6-4 8-5 4-1-16-1-30 1-42Z"] },
    { muscle: "calves", mirror: true, anchor: { x: 82, y: 346 }, paths: ["M76 318c-4 16-2 38 2 60 2 6 8 6 10 0 4-22 4-44 0-60-4-3-8-3-12 0Z"] },
  ],
  back: [
    { muscle: "traps", mirror: false, anchor: { x: 100, y: 84 }, paths: ["M100 56c-4 6-12 10-26 16 12 4 20 16 26 60 6-44 14-56 26-60-14-6-22-10-26-16Z"] },
    { muscle: "shoulders", mirror: true, anchor: { x: 62, y: 90 }, paths: [SHOULDER] },
    { muscle: "upper_back", mirror: true, anchor: { x: 80, y: 100 }, paths: ["M78 82c-6 8-8 22-4 34 6 4 12 0 16-8 0-12-4-22-12-26Z"] },
    { muscle: "lats", mirror: true, anchor: { x: 82, y: 148 }, paths: ["M72 118c-2 16 2 38 14 58l10 6c2-18 0-36-4-50-6-6-14-10-20-14Z"] },
    { muscle: "lower_back", mirror: true, anchor: { x: 95, y: 194 }, paths: ["M90 180c2 10 4 20 4 32h5v-44c-3 4-7 8-9 12Z"] },
    { muscle: "triceps", mirror: true, anchor: { x: 56, y: 134 }, paths: [UPPER_ARM] },
    { muscle: "forearms", mirror: true, anchor: { x: 50, y: 188 }, paths: [FOREARM] },
    { muscle: "glutes", mirror: true, anchor: { x: 86, y: 234 }, paths: ["M99 214v38c-9 6-21 4-27-6-4-12 0-26 8-32 6-4 14-4 19 0Z"] },
    { muscle: "hamstrings", mirror: true, anchor: { x: 84, y: 280 }, paths: ["M74 258c-4 18-2 36 2 46 6 4 14 2 18-4 2-16 2-30 0-42-6 4-14 4-20 0Z"] },
    { muscle: "calves", mirror: true, anchor: { x: 82, y: 340 }, paths: ["M76 316c-6 14-4 34 2 48 4 6 10 6 12 0 4-14 4-34-2-48-4-4-8-4-12 0Z"] },
  ],
};

/** Vue la plus pertinente pour afficher un ensemble de muscles. */
export function preferredView(muscles: MuscleId[]): BodyView {
  const backOnly = new Set<MuscleId>(["triceps", "lats", "upper_back", "lower_back", "glutes", "hamstrings"]);
  const frontOnly = new Set<MuscleId>(["chest", "biceps", "abs", "obliques", "quads", "adductors"]);
  const first = muscles[0];
  if (first && backOnly.has(first)) return "back";
  if (first && frontOnly.has(first)) return "front";
  const back = muscles.filter((m) => backOnly.has(m)).length;
  const front = muscles.filter((m) => frontOnly.has(m)).length;
  return back > front ? "back" : "front";
}
