"use client";

import { useId, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { MUSCLE_BY_ID } from "@/data/seed/muscles";
import type { BodyView, MuscleId } from "@/types/domain";
import { SILHOUETTE, VIEWBOX, ZONES, type MuscleZone } from "./body-zones";

/**
 * Niveau d'activation (DESIGN.md › Anatomical Muscle Heatmap) :
 * 0 = non sollicité, 1 = 1-3 séries / secondaire, 2 = 4-7 séries, 3 = 8+ / principal / sélectionné.
 */
export type Intensity = 0 | 1 | 2 | 3;

const FILL: Record<Intensity, string> = {
  0: "#2e3033",
  1: "rgba(163,250,0,0.25)",
  2: "rgba(163,250,0,0.65)",
  3: "#a3fa00",
};

const MIRROR = "matrix(-1 0 0 1 200 0)";
/** Marge latérale réservée aux étiquettes (unités du viewBox). */
const SIDE = 90;
const LEFT_EDGE = 32;
const RIGHT_EDGE = 168;

export interface BodyLabel {
  muscle: MuscleId;
  text: string;
}

export interface BodyMapProps {
  view: BodyView;
  intensity: Partial<Record<MuscleId, Intensity>>;
  /** Rend les zones cliquables (sélecteur anatomique). */
  onToggle?: (muscle: MuscleId) => void;
  labels?: BodyLabel[];
  className?: string;
  /** Description accessible de la figure (mode lecture seule). */
  title?: string;
}

function placeLabels(labels: BodyLabel[], view: BodyView) {
  const zones = ZONES[view];
  const placed = labels
    .map((l) => ({ ...l, zone: zones.find((z) => z.muscle === l.muscle) }))
    .filter((l): l is BodyLabel & { zone: MuscleZone } => Boolean(l.zone))
    .sort((a, b) => a.zone.anchor.y - b.zone.anchor.y)
    .map((l, i) => ({ ...l, side: (i % 2 === 0 ? "left" : "right") as "left" | "right", y: l.zone.anchor.y }));

  // Évite les chevauchements verticaux dans chaque colonne.
  for (const side of ["left", "right"] as const) {
    let last = -Infinity;
    for (const l of placed.filter((p) => p.side === side)) {
      l.y = Math.max(l.y, last + 30);
      last = l.y;
    }
  }
  return placed;
}

/** Silhouette anatomique interactive (face / dos), en SVG vectoriel. */
export function BodyMap({ view, intensity, onToggle, labels = [], className, title }: BodyMapProps) {
  const glowId = useId().replace(/:/g, "");
  const interactive = Boolean(onToggle);
  const placed = placeLabels(labels, view);
  const withLabels = labels.length > 0;
  const vbX = withLabels ? -SIDE : 0;
  const vbW = VIEWBOX.width + (withLabels ? SIDE * 2 : 0);
  const pct = (x: number) => ((x - vbX) / vbW) * 100;

  const handleKey = (e: KeyboardEvent, muscle: MuscleId) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle?.(muscle);
    }
  };

  return (
    <div className={cn("relative mx-auto w-full", className)} style={{ aspectRatio: `${vbW} / ${VIEWBOX.height}` }}>
      <svg
        viewBox={`${vbX} 0 ${vbW} ${VIEWBOX.height}`}
        className="absolute inset-0 size-full overflow-visible"
        role={interactive ? "group" : "img"}
        aria-label={interactive ? `Vue de ${view === "front" ? "face" : "dos"} : groupes musculaires sélectionnables` : title}
      >
        <defs>
          <filter id={`glow-${glowId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {SILHOUETTE[view].map((part, i) => (
          <g key={i} fill="#232427">
            <path d={part.d} />
            {part.mirror && <path d={part.d} transform={MIRROR} />}
          </g>
        ))}

        {ZONES[view].map((zone) => {
          const level = intensity[zone.muscle] ?? 0;
          const name = MUSCLE_BY_ID[zone.muscle].name;
          return (
            <g
              key={zone.muscle}
              data-muscle={zone.muscle}
              fill={FILL[level]}
              filter={level === 3 ? `url(#glow-${glowId})` : undefined}
              strokeLinejoin="round"
              stroke={level === 3 ? "#a3fa00" : "transparent"}
              strokeWidth={2}
              className={cn(
                "transition-[fill] duration-200",
                interactive && "cursor-pointer outline-none hover:brightness-125 focus-visible:[stroke:#ffffff]",
              )}
              {...(interactive
                ? {
                    role: "checkbox",
                    tabIndex: 0,
                    "aria-checked": level > 0,
                    "aria-label": name,
                    onClick: () => onToggle?.(zone.muscle),
                    onKeyDown: (e: KeyboardEvent) => handleKey(e, zone.muscle),
                  }
                : { "aria-hidden": true })}
            >
              {interactive && <title>{name}</title>}
              {zone.paths.map((d, i) => (
                <path key={i} d={d} />
              ))}
              {zone.mirror && zone.paths.map((d, i) => <path key={`m${i}`} d={d} transform={MIRROR} />)}
            </g>
          );
        })}

        {placed.map((l) => {
          const ax = l.side === "left" ? l.zone.anchor.x : 200 - l.zone.anchor.x;
          const tx = l.side === "left" ? LEFT_EDGE : RIGHT_EDGE;
          return (
            <g key={`line-${l.muscle}`} aria-hidden stroke="#a3fa00" strokeWidth={0.8} opacity={0.7}>
              <line x1={tx} y1={l.y} x2={ax} y2={l.zone.anchor.y} />
              <circle cx={ax} cy={l.zone.anchor.y} r={1.8} fill="#a3fa00" stroke="none" />
            </g>
          );
        })}
      </svg>

      {placed.map((l) => (
        <span
          key={l.muscle}
          className={cn(
            "pointer-events-none absolute flex max-w-[34%] -translate-y-1/2 items-center gap-1.5 truncate rounded-full border border-line-strong bg-surface-2/90 px-2.5 py-1 text-label-caps text-ink-strong backdrop-blur",
          )}
          style={{
            top: `${(l.y / VIEWBOX.height) * 100}%`,
            ...(l.side === "left" ? { right: `${100 - pct(LEFT_EDGE)}%` } : { left: `${pct(RIGHT_EDGE)}%` }),
          }}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-lime" />
          {l.text}
        </span>
      ))}
    </div>
  );
}

/** Intensités d'un exercice : principaux = 3, secondaires = 1. */
export function exerciseIntensity(primary: MuscleId[], secondary: MuscleId[]): Partial<Record<MuscleId, Intensity>> {
  const out: Partial<Record<MuscleId, Intensity>> = {};
  for (const m of secondary) out[m] = 1;
  for (const m of primary) out[m] = 3;
  return out;
}

/** Intensité selon le nombre de séries hebdomadaires (seuils DESIGN.md). */
export function setsToIntensity(sets: number): Intensity {
  if (sets <= 0) return 0;
  if (sets <= 3) return 1;
  if (sets <= 7) return 2;
  return 3;
}
