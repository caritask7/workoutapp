"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react";
import { Button, Field, InlineError, Input, NumberInput, PageSkeleton, Select, Sheet, useToast } from "@/components/ui";
import { useData, useMutation } from "@/hooks/use-data";
import { atwaterDeviation, macrosForQuantity } from "@/lib/domain/nutrition";
import { fieldErrors, foodSchema, nutritionGoalSchema, type FoodInput, type NutritionGoalInput } from "@/lib/validation/schemas";
import { formatDecimal, formatInt } from "@/lib/format";
import { MEAL_TYPES } from "@/services/nutrition";
import type { Food, FoodSource, IsoDate, MealItem, MealType, NutritionGoal } from "@/types/domain";

const SOURCE_LABEL: Record<FoodSource, string> = {
  label: "Étiquette produit",
  user: "Valeurs personnelles",
  ciqual: "Table CIQUAL (ANSES)",
};

function MacroPreview({ food, quantity }: { food: Food; quantity: number | null }) {
  const m = macrosForQuantity(food, quantity ?? 0);
  return (
    <dl className="grid grid-cols-4 gap-2 rounded-xl bg-surface-lowest p-3 text-center">
      {[
        ["Kcal", formatInt(m.kcal)],
        ["Prot.", `${formatDecimal(m.proteinG)} g`],
        ["Gluc.", `${formatDecimal(m.carbsG)} g`],
        ["Lip.", `${formatDecimal(m.fatG)} g`],
      ].map(([k, v]) => (
        <div key={k}>
          <dt className="text-label-caps text-muted">{k}</dt>
          <dd className="font-display text-[16px] font-bold text-ink-strong tabular">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Ajout d'un aliment : recherche → quantité → repas (ou création d'un aliment). */
export function AddFoodSheet({ date, defaultMeal, onClose }: { date: IsoDate; defaultMeal: MealType; onClose: () => void }) {
  const toast = useToast();
  const [step, setStep] = useState<"search" | "quantity" | "create">("search");
  const [term, setTerm] = useState("");
  const [food, setFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState<number | null>(100);
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const results = useData((s) => (term.trim() ? s.nutrition.searchFoods(term) : s.nutrition.searchFoods("", 50)), [term]);
  const recent = useData((s) => s.nutrition.recentFoods());
  const add = useMutation((s, f: Food, q: number, m: MealType) => s.nutrition.addItem({ date, type: m }, f.id, q), {
    onSuccess: () => {
      toast("Aliment ajouté");
      onClose();
    },
  });

  const choose = (f: Food) => {
    setFood(f);
    setQuantity(f.servingQuantity ?? 100);
    setStep("quantity");
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={step === "create" ? "Créer un aliment" : step === "quantity" && food ? food.name : "Ajouter un aliment"}
      description={step === "search" ? "Recherchez dans votre base d'aliments ou créez-en un à partir de son étiquette." : undefined}
    >
      {step === "search" && (
        <div className="flex flex-col gap-4">
          <label className="relative block">
            <span className="sr-only">Rechercher un aliment</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Flocons d'avoine, poulet…" className="pl-10" autoFocus />
          </label>
          {!term.trim() && recent.data && recent.data.length > 0 && (
            <div>
              <p className="mb-2 text-label-caps text-muted">Récents</p>
              <div className="flex flex-wrap gap-2">
                {recent.data.map((f) => (
                  <button key={f.id} type="button" onClick={() => choose(f)} className="h-9 rounded-full bg-surface-3 px-3.5 text-[13px] text-ink-strong hover:bg-surface-4">
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {results.loading ? (
            <PageSkeleton blocks={1} />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {results.data?.map((f) => (
                <li key={f.id}>
                  <button type="button" onClick={() => choose(f)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-surface-3/40">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-ink-strong">
                        {f.name}
                        {f.brand && <span className="text-muted"> · {f.brand}</span>}
                      </span>
                      <span className="block text-[12px] text-muted tabular">
                        {formatInt(f.kcalPer100)} kcal · P {formatDecimal(f.proteinPer100)} · G {formatDecimal(f.carbsPer100)} · L {formatDecimal(f.fatPer100)} / 100 {f.unit}
                      </span>
                    </span>
                    <Plus className="size-4 shrink-0 text-lime" aria-hidden />
                  </button>
                </li>
              ))}
              {results.data?.length === 0 && (
                <li className="py-6 text-center text-[14px] text-muted">
                  {term.trim() ? "Aucun aliment trouvé." : "Votre base d'aliments est vide : créez votre premier aliment à partir de son étiquette nutritionnelle."}
                </li>
              )}
            </ul>
          )}
          <Button variant="secondary" block icon={<Plus className="size-4 text-lime" />} onClick={() => setStep("create")}>
            Créer un aliment
          </Button>
        </div>
      )}

      {step === "quantity" && food && (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-muted">
            Source : {SOURCE_LABEL[food.source]}
            {food.sourceRef ? ` (${food.sourceRef})` : ""}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Quantité (${food.unit})`}>
              {(p) => <NumberInput decimals={1} value={quantity} onValueChange={setQuantity} {...p} />}
            </Field>
            <Field label="Repas">
              {(p) => (
                <Select value={meal} onChange={(e) => setMeal(e.target.value as MealType)} {...p}>
                  {MEAL_TYPES.map((m) => (
                    <option key={m.type} value={m.type}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          {food.servingQuantity && (
            <div className="flex flex-wrap gap-2">
              {[1, 2].map((n) => (
                <button key={n} type="button" onClick={() => setQuantity(food.servingQuantity! * n)} className="h-9 rounded-full bg-surface-3 px-3.5 text-[13px] text-ink-strong hover:bg-surface-4">
                  {n} × {food.servingName || "portion"} ({formatDecimal(food.servingQuantity! * n)} {food.unit})
                </button>
              ))}
            </div>
          )}
          <MacroPreview food={food} quantity={quantity} />
          <InlineError message={add.error} />
          <div className="flex gap-3">
            <Button variant="secondary" icon={<ArrowLeft className="size-4" />} onClick={() => setStep("search")}>
              Retour
            </Button>
            <Button block loading={add.pending} disabled={!quantity} onClick={() => quantity && void add.run(food, quantity, meal)}>
              Ajouter au {MEAL_TYPES.find((m) => m.type === meal)?.label.toLowerCase()}
            </Button>
          </div>
        </div>
      )}

      {step === "create" && <FoodForm initialName={term} onCancel={() => setStep("search")} onSaved={choose} />}
    </Sheet>
  );
}

/** Saisie d'un aliment à partir de valeurs identifiées (étiquette, table de référence). */
export function FoodForm({ initialName = "", food, onCancel, onSaved }: { initialName?: string; food?: Food; onCancel: () => void; onSaved: (f: Food) => void }) {
  const [form, setForm] = useState<FoodInput>(
    food
      ? { ...food }
      : {
          name: initialName,
          brand: "",
          source: "label",
          sourceRef: "",
          unit: "g",
          kcalPer100: 0,
          proteinPer100: 0,
          carbsPer100: 0,
          fatPer100: 0,
          fiberPer100: null,
          servingName: "",
          servingQuantity: null,
        },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation((s, input: FoodInput) => s.nutrition.saveFood(input, food?.id), { onSuccess: onSaved });
  const set = <K extends keyof FoodInput>(k: K, v: FoodInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const deviation = form.kcalPer100 > 0 ? atwaterDeviation(form) : 0;

  const submit = () => {
    const parsed = foodSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    void save.run(parsed.data);
  };

  const num = (k: "kcalPer100" | "proteinPer100" | "carbsPer100" | "fatPer100", label: string) => (
    <Field label={label} error={errors[k]}>
      {(p) => <NumberInput decimals={1} value={form[k]} onValueChange={(v) => set(k, v ?? 0)} {...p} />}
    </Field>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl bg-surface-lowest px-3 py-2.5 text-[13px] text-muted">
        Saisissez les valeurs pour 100 {form.unit} telles qu&apos;indiquées sur l&apos;étiquette ou une table de référence. Aucune valeur n&apos;est estimée automatiquement.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom" error={errors.name} className="col-span-2">
          {(p) => <Input value={form.name} maxLength={80} onChange={(e) => set("name", e.target.value)} {...p} />}
        </Field>
        <Field label="Marque (optionnel)" error={errors.brand}>
          {(p) => <Input value={form.brand} maxLength={60} onChange={(e) => set("brand", e.target.value)} {...p} />}
        </Field>
        <Field label="Unité">
          {(p) => (
            <Select value={form.unit} onChange={(e) => set("unit", e.target.value as "g" | "ml")} {...p}>
              <option value="g">grammes (g)</option>
              <option value="ml">millilitres (ml)</option>
            </Select>
          )}
        </Field>
        <Field label="Source des valeurs">
          {(p) => (
            <Select value={form.source} onChange={(e) => set("source", e.target.value as FoodSource)} {...p}>
              <option value="label">{SOURCE_LABEL.label}</option>
              <option value="ciqual">{SOURCE_LABEL.ciqual}</option>
              <option value="user">{SOURCE_LABEL.user}</option>
            </Select>
          )}
        </Field>
        <Field label="Référence (code, EAN…)" error={errors.sourceRef}>
          {(p) => <Input value={form.sourceRef} maxLength={60} onChange={(e) => set("sourceRef", e.target.value)} {...p} />}
        </Field>
      </div>
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="col-span-2 mb-2 text-label-caps text-ink">Pour 100 {form.unit}</legend>
        {num("kcalPer100", "Énergie (kcal)")}
        {num("proteinPer100", "Protéines (g)")}
        {num("carbsPer100", "Glucides (g)")}
        {num("fatPer100", "Lipides (g)")}
      </fieldset>
      {deviation > 0.2 && (
        <p role="status" className="rounded-xl bg-danger/10 px-3 py-2.5 text-[13px] text-danger-soft">
          Les kcal saisies s&apos;écartent de {Math.round(deviation * 100)} % du calcul à partir des macros (4/4/9). Vérifiez l&apos;étiquette (les fibres et l&apos;alcool expliquent parfois un écart).
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Portion (optionnel)" hint="ex. « 1 œuf »">
          {(p) => <Input value={form.servingName} maxLength={40} onChange={(e) => set("servingName", e.target.value)} {...p} />}
        </Field>
        <Field label={`Taille portion (${form.unit})`} error={errors.servingQuantity}>
          {(p) => <NumberInput decimals={1} value={form.servingQuantity} onValueChange={(v) => set("servingQuantity", v)} {...p} />}
        </Field>
      </div>
      <InlineError message={save.error} />
      <div className="flex gap-3">
        <Button variant="secondary" block onClick={onCancel}>
          Annuler
        </Button>
        <Button block loading={save.pending} onClick={submit}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

/** Modification de la quantité d'un élément de repas, ou suppression. */
export function MealItemSheet({ item, onClose }: { item: MealItem; onClose: () => void }) {
  const toast = useToast();
  const [quantity, setQuantity] = useState<number | null>(item.quantity);
  const update = useMutation((s, q: number) => s.nutrition.updateItemQuantity(item.id, q), { onSuccess: onClose });
  const remove = useMutation((s) => s.nutrition.removeItem(item.id), {
    onSuccess: () => {
      toast("Aliment retiré");
      onClose();
    },
  });
  return (
    <Sheet open onClose={onClose} title={item.foodName}>
      <div className="flex flex-col gap-4">
        <Field label={`Quantité (${item.unit})`}>{(p) => <NumberInput decimals={1} value={quantity} onValueChange={setQuantity} {...p} />}</Field>
        <InlineError message={update.error ?? remove.error} />
        <div className="flex gap-3">
          <Button variant="danger" icon={<Trash2 className="size-4" />} loading={remove.pending} onClick={() => void remove.run()}>
            Retirer
          </Button>
          <Button block loading={update.pending} disabled={!quantity} onClick={() => quantity && void update.run(quantity)}>
            Mettre à jour
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

/** Objectifs nutritionnels (historisés à partir d'aujourd'hui). */
export function GoalsSheet({ goal, onClose }: { goal: NutritionGoal | null; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<NutritionGoalInput>({
    calories: goal?.calories ?? 2750,
    proteinG: goal?.proteinG ?? 140,
    carbsG: goal?.carbsG ?? 350,
    fatG: goal?.fatG ?? 85,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation((s, input: NutritionGoalInput) => s.nutrition.setGoal(input), {
    onSuccess: () => {
      toast("Objectifs mis à jour");
      onClose();
    },
  });
  const fromMacros = Math.round(form.proteinG * 4 + form.carbsG * 4 + form.fatG * 9);
  const submit = () => {
    const parsed = nutritionGoalSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    void save.run(parsed.data);
  };
  const field = (k: keyof NutritionGoalInput, label: string) => (
    <Field label={label} error={errors[k]}>
      {(p) => <NumberInput value={form[k]} onValueChange={(v) => setForm((f) => ({ ...f, [k]: v ?? 0 }))} {...p} />}
    </Field>
  );
  return (
    <Sheet
      open
      onClose={onClose}
      title="Objectifs nutritionnels"
      description="S'appliquent à partir d'aujourd'hui ; l'historique reste comparé aux objectifs de l'époque."
      footer={
        <Button block size="lg" loading={save.pending} onClick={submit}>
          Enregistrer
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {field("calories", "Calories (kcal)")}
        {field("proteinG", "Protéines (g)")}
        {field("carbsG", "Glucides (g)")}
        {field("fatG", "Lipides (g)")}
      </div>
      <p className={fromMacros && Math.abs(fromMacros - form.calories) / form.calories > 0.1 ? "mt-3 text-[13px] text-danger-soft" : "mt-3 text-[13px] text-muted"}>
        Les macros correspondent à {formatInt(fromMacros)} kcal (4 / 4 / 9 kcal par gramme).
      </p>
      <InlineError message={save.error} />
    </Sheet>
  );
}
