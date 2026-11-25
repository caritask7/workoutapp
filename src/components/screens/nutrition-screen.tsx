"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Coffee, Cookie, Moon, Pencil, Plus, ScanLine, Sparkles, TrendingUp, Utensils, UtensilsCrossed } from "lucide-react";
import { Button, Card, ErrorState, IconButton, LabelCaps, PageSkeleton, Pill } from "@/components/ui";
import { CaloriesRing, MacroBars } from "@/components/nutrition/macro-summary";
import { AddFoodSheet, GoalsSheet, MealItemSheet } from "@/components/nutrition/food-sheets";
import { useData } from "@/hooks/use-data";
import { useToday } from "@/hooks/use-clock";
import { addDays } from "@/lib/domain/dates";
import { percentOf } from "@/lib/domain/nutrition";
import { formatDateLong, formatDecimal, formatInt } from "@/lib/format";
import { cn } from "@/lib/cn";
import { MEAL_TYPES } from "@/services/nutrition";
import type { MealItem, MealType, MealWithItems, NutritionGoal } from "@/types/domain";

const GOAL_LABEL = {
  muscle_gain: "Prise de masse propre",
  strength: "Force",
  fat_loss: "Perte de gras",
  maintenance: "Maintien",
} as const;

const MEAL_ICON: Record<MealType, typeof Coffee> = { breakfast: Coffee, lunch: Utensils, snack: Cookie, dinner: Moon };

export function NutritionScreen() {
  const today = useToday();
  const [offset, setOffset] = useState(0);
  if (!today) return <PageSkeleton blocks={4} />;
  return <Nutrition today={today} date={addDays(today, offset)} offset={offset} setOffset={setOffset} />;
}

function Nutrition({ today, date, offset, setOffset }: { today: string; date: string; offset: number; setOffset: (n: number) => void }) {
  const day = useData((s) => s.nutrition.getDay(date), [date]);
  const profile = useData((s) => s.profile.getProfile());
  const [adding, setAdding] = useState<MealType | null>(null);
  const [editing, setEditing] = useState<MealItem | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);

  if (day.loading) return <PageSkeleton blocks={4} />;
  if (day.error || !day.data) return <ErrorState message={day.error ?? "Chargement impossible."} onRetry={day.reload} />;
  const { meals, totals, goal } = day.data;
  const remaining = goal ? goal.calories - totals.kcal : null;
  const loggedTypes = new Set(meals.filter((m) => m.items.length).map((m) => m.type));

  return (
    <div className="flex flex-col gap-5">
      {/* Navigation par jour (historique) */}
      <div className="flex items-center justify-between gap-2">
        <IconButton label="Jour précédent" variant="subtle" onClick={() => setOffset(offset - 1)}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <p className="text-center">
          <span className="block text-label-caps text-lime">{offset === 0 ? "Aujourd'hui" : offset === -1 ? "Hier" : "Historique"}</span>
          <span className="text-[14px] text-ink-strong capitalize">{formatDateLong(date)}</span>
        </p>
        <IconButton label="Jour suivant" variant="subtle" onClick={() => setOffset(offset + 1)} disabled={date >= today}>
          <ChevronRight className="size-5" />
        </IconButton>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Card padding="md" className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-lowest text-lime">
              <UtensilsCrossed className="size-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <LabelCaps as="p">Objectif actif</LabelCaps>
              <p className="truncate text-headline-sm text-ink-strong">{profile.data ? GOAL_LABEL[profile.data.goal] : "—"}</p>
            </div>
            {goal && (
              <Pill tone="lime-soft" icon={<TrendingUp />}>
                {formatInt(goal.calories)} kcal
              </Pill>
            )}
            <IconButton label="Modifier les objectifs" size="sm" variant="ghost" onClick={() => setGoalsOpen(true)}>
              <Pencil className="size-4" />
            </IconButton>
          </Card>

          {goal ? (
            <Card>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <LabelCaps as="p">Bilan quotidien</LabelCaps>
                  <h1 className="text-headline-md text-ink-strong">Calories & Synthèse</h1>
                </div>
                {totals.kcal > 0 && <BalancePill goal={goal} kcal={totals.kcal} />}
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <CaloriesRing totals={totals} goal={goal} size={140} />
                <div className="min-w-[140px] flex-1 rounded-card bg-surface-2 p-4">
                  <LabelCaps as="p">{remaining !== null && remaining >= 0 ? "Reste à combler" : "Au-dessus de la cible"}</LabelCaps>
                  <p className="mt-1">
                    <span className="text-metric-xl text-lime">{formatInt(Math.abs(remaining ?? 0))}</span> <span className="text-[14px] text-muted">kcal</span>
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-[13px] text-muted">
                    <span aria-hidden className="size-2 rounded-full bg-lime" />
                    {percentOf(totals.kcal, goal.calories)}% de la cible
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <MacroBars totals={totals} goal={goal} detailed />
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-[14px] text-muted">Aucun objectif défini pour cette date.</p>
              <Button className="mt-3" onClick={() => setGoalsOpen(true)}>
                Définir mes objectifs
              </Button>
            </Card>
          )}

          <Button size="lg" block icon={<ScanLine className="size-5" />} onClick={() => setAdding("breakfast")}>
            Ajouter un aliment
          </Button>
        </div>

        <section aria-labelledby="journal-title" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="journal-title" className="text-label-caps text-ink">
              Journal des repas
            </h2>
            <span className="text-label-caps text-lime tabular">
              {loggedTypes.size} enregistré{loggedTypes.size > 1 ? "s" : ""} • {MEAL_TYPES.length - loggedTypes.size} restant{MEAL_TYPES.length - loggedTypes.size > 1 ? "s" : ""}
            </span>
          </div>
          {MEAL_TYPES.map(({ type, label }) => {
            const own = meals.filter((m) => m.type === type);
            return <MealCard key={type} type={type} label={label} meals={own} onAdd={() => setAdding(type)} onEdit={setEditing} />;
          })}
          {goal && remaining !== null && <Suggestion goal={goal} totals={totals} />}
        </section>
      </div>

      {adding && <AddFoodSheet date={date} defaultMeal={adding} onClose={() => setAdding(null)} />}
      {editing && <MealItemSheet item={editing} onClose={() => setEditing(null)} />}
      {goalsOpen && <GoalsSheet goal={goal} onClose={() => setGoalsOpen(false)} />}
    </div>
  );
}

function BalancePill({ goal, kcal }: { goal: NutritionGoal; kcal: number }) {
  const pct = percentOf(kcal, goal.calories);
  if (pct >= 95 && pct <= 105) return <Pill tone="lime-soft">Cible atteinte</Pill>;
  if (pct > 105) return <Pill tone="danger">Au-dessus</Pill>;
  return <Pill tone="neutral">En cours</Pill>;
}

function MealCard({ type, label, meals, onAdd, onEdit }: { type: MealType; label: string; meals: MealWithItems[]; onAdd: () => void; onEdit: (i: MealItem) => void }) {
  const items = meals.flatMap((m) => m.items);
  const [open, setOpen] = useState(false);
  const Icon = MEAL_ICON[type];
  const totals = items.reduce(
    (a, i) => ({ kcal: a.kcal + i.kcal, p: a.p + i.proteinG, c: a.c + i.carbsG, f: a.f + i.fatG }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
  const empty = items.length === 0;

  return (
    <Card padding="none">
      <div className="flex items-center gap-3 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-lowest text-lime">
          <Icon className="size-5" aria-hidden />
        </span>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => !empty && setOpen(!open)}
          aria-expanded={empty ? undefined : open}
          disabled={empty}
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-headline-sm text-ink-strong">{label}</span>
            {empty ? <Pill tone="neutral" caps>À enregistrer</Pill> : <Pill tone="lime-soft">{formatInt(totals.kcal)} kcal</Pill>}
          </span>
          <span className="block text-[13px] text-muted tabular">
            {empty ? "Aucun aliment" : `${formatDecimal(totals.p)}g P • ${formatDecimal(totals.c)}g G • ${formatDecimal(totals.f)}g L`}
          </span>
        </button>
        {!empty && (
          <IconButton label={open ? `Replier ${label}` : `Déplier ${label}`} size="sm" variant="ghost" onClick={() => setOpen(!open)}>
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
          </IconButton>
        )}
        <IconButton label={`Ajouter au ${label.toLowerCase()}`} size="sm" variant="lime" onClick={onAdd}>
          <Plus className="size-4" />
        </IconButton>
      </div>
      {open && !empty && (
        <ul className="border-t border-line px-4 py-2">
          {items.map((i) => (
            <li key={i.id}>
              <button type="button" onClick={() => onEdit(i)} className="flex w-full items-center justify-between gap-3 py-2 text-left text-[14px] hover:text-lime">
                <span className="min-w-0 truncate text-ink">{i.foodName}</span>
                <span className="shrink-0 text-muted tabular">
                  {formatDecimal(i.quantity)}
                  {i.unit} • {formatInt(i.kcal)} kcal
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Repère calculé à partir des apports restants (règle déterministe, aucune recommandation inventée). */
function Suggestion({ goal, totals }: { goal: NutritionGoal; totals: { kcal: number; proteinG: number; carbsG: number; fatG: number } }) {
  const rest = {
    kcal: goal.calories - totals.kcal,
    p: Math.max(0, goal.proteinG - totals.proteinG),
    c: Math.max(0, goal.carbsG - totals.carbsG),
    f: Math.max(0, goal.fatG - totals.fatG),
  };
  if (rest.kcal <= 0 && rest.p === 0) return null;
  return (
    <div className="rounded-card-lg border border-lime/30 bg-lime/5 p-4">
      <p className="mb-1.5 flex items-center gap-2 text-label-caps text-lime">
        <Sparkles className="size-4" aria-hidden />
        Reste pour atteindre vos objectifs
      </p>
      <p className="text-[15px] leading-6 text-ink-strong">
        Encore <strong className="text-lime">{formatInt(Math.round(rest.p))} g de protéines</strong>, {formatInt(Math.round(rest.c))} g de glucides et {formatInt(Math.round(rest.f))} g de lipides
        {rest.kcal > 0 ? ` (≈ ${formatInt(rest.kcal)} kcal)` : ""}.
      </p>
    </div>
  );
}
