import type { Food, IsoDate, Macros, Meal, MealItem, MealType, MealWithItems, NutritionGoal } from "@/types/domain";
import {
  foodSchema,
  mealItemSchema,
  nutritionGoalSchema,
  type FoodInput,
  type NutritionGoalInput,
} from "@/lib/validation/schemas";
import { goalForDate, macrosForQuantity, sumMacros } from "@/lib/domain/nutrition";
import { toIsoDate } from "@/lib/domain/dates";
import { round } from "@/lib/domain/training";
import { DataError } from "./data/driver";
import type { ServiceContext } from "./context";
import { newId, nowIso } from "./ids";

export const MEAL_TYPES: { type: MealType; label: string }[] = [
  { type: "breakfast", label: "Petit-déjeuner" },
  { type: "lunch", label: "Déjeuner" },
  { type: "snack", label: "Collation" },
  { type: "dinner", label: "Dîner" },
];

export const mealLabel = (type: MealType) => MEAL_TYPES.find((m) => m.type === type)?.label ?? type;

export interface NutritionDay {
  date: IsoDate;
  meals: MealWithItems[];
  totals: Macros;
  goal: NutritionGoal | null;
}

export function createNutritionService({ driver, userId }: ServiceContext) {
  /* ------------------------------- Objectifs ------------------------------ */

  async function listGoals(): Promise<NutritionGoal[]> {
    return driver.list("nutrition_goals", { orderBy: { field: "effectiveFrom" } });
  }

  async function getGoal(date: IsoDate = toIsoDate()): Promise<NutritionGoal | null> {
    return goalForDate(await listGoals(), date);
  }

  /** Les objectifs sont historisés : l'historique passé reste comparé à l'objectif de l'époque. */
  async function setGoal(input: NutritionGoalInput, effectiveFrom: IsoDate = toIsoDate()): Promise<NutritionGoal> {
    const data = nutritionGoalSchema.parse(input);
    const sameDay = (await driver.list("nutrition_goals", { where: { effectiveFrom } }))[0];
    const goal: NutritionGoal = sameDay
      ? { ...sameDay, ...data }
      : { id: newId(), userId, effectiveFrom, ...data, createdAt: nowIso() };
    await driver.upsert("nutrition_goals", goal);
    return goal;
  }

  /* -------------------------------- Aliments ------------------------------ */

  async function searchFoods(term: string, limit = 30): Promise<Food[]> {
    const foods = await driver.list("foods", {
      search: term.trim() ? { field: "name", term } : undefined,
      orderBy: { field: "name" },
      limit: term.trim() ? limit : undefined,
    });
    return term.trim() ? foods : foods.slice(0, limit);
  }

  /** Aliments récemment consommés (raccourcis d'ajout). */
  async function recentFoods(limit = 8): Promise<Food[]> {
    const items = await driver.list("meal_items", { orderBy: { field: "createdAt", direction: "desc" }, limit: 100 });
    const ids = [...new Set(items.map((i) => i.foodId))].slice(0, limit);
    if (!ids.length) return [];
    const foods = await driver.list("foods", { in: { field: "id", values: ids } });
    return ids.flatMap((id) => foods.filter((f) => f.id === id));
  }

  async function getFood(id: string): Promise<Food | null> {
    return driver.get("foods", id);
  }

  async function saveFood(input: FoodInput, id?: string): Promise<Food> {
    const data = foodSchema.parse(input);
    if (id) {
      const existing = await driver.get("foods", id);
      if (!existing) throw new DataError("Aliment introuvable.");
      if (existing.ownerId !== userId) throw new DataError("Les aliments de référence ne sont pas modifiables.");
      const next = { ...existing, ...data };
      await driver.upsert("foods", next);
      return next;
    }
    const food: Food = { id: newId(), ownerId: userId, ...data, createdAt: nowIso() };
    await driver.upsert("foods", food);
    return food;
  }

  async function deleteFood(id: string): Promise<void> {
    const existing = await driver.get("foods", id);
    if (!existing) return;
    if (existing.ownerId !== userId) throw new DataError("Les aliments de référence ne sont pas supprimables.");
    await driver.remove("foods", id);
  }

  /* --------------------------------- Repas -------------------------------- */

  function withItems(meal: Meal, items: MealItem[]): MealWithItems {
    const own = items.filter((i) => i.mealId === meal.id).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    return { ...meal, items: own, totals: sumMacros(own) };
  }

  async function getDay(date: IsoDate): Promise<NutritionDay> {
    const meals = await driver.list("meals", { where: { date } });
    const items = meals.length
      ? await driver.list("meal_items", { in: { field: "mealId", values: meals.map((m) => m.id) } })
      : [];
    const order = (t: MealType) => MEAL_TYPES.findIndex((m) => m.type === t);
    const hydrated = meals
      .sort((a, b) => order(a.type) - order(b.type) || (a.createdAt < b.createdAt ? -1 : 1))
      .map((m) => withItems(m, items));
    return { date, meals: hydrated, totals: sumMacros(hydrated.map((m) => m.totals)), goal: await getGoal(date) };
  }

  /** Totaux quotidiens sur une période (jours sans saisie omis). */
  async function dailyTotals(from: IsoDate, to: IsoDate): Promise<{ date: IsoDate; totals: Macros }[]> {
    const meals = await driver.list("meals", { range: { field: "date", gte: from, lte: to } });
    if (!meals.length) return [];
    const items = await driver.list("meal_items", { in: { field: "mealId", values: meals.map((m) => m.id) } });
    const byDate = new Map<IsoDate, Macros[]>();
    for (const meal of meals) {
      const list = byDate.get(meal.date) ?? [];
      list.push(withItems(meal, items).totals);
      byDate.set(meal.date, list);
    }
    return [...byDate.entries()]
      .map(([date, list]) => ({ date, totals: sumMacros(list) }))
      .filter((d) => d.totals.kcal > 0 || d.totals.proteinG > 0)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  async function createMeal(date: IsoDate, type: MealType, name = ""): Promise<Meal> {
    const meal: Meal = { id: newId(), userId, date, type, name: name.trim().slice(0, 60), createdAt: nowIso() };
    await driver.upsert("meals", meal);
    return meal;
  }

  async function findOrCreateMeal(date: IsoDate, type: MealType): Promise<Meal> {
    const existing = (await driver.list("meals", { where: { date, type } })).sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : 1,
    )[0];
    return existing ?? createMeal(date, type);
  }

  async function addItem(target: { mealId: string } | { date: IsoDate; type: MealType }, foodId: string, quantity: number): Promise<MealItem> {
    const data = mealItemSchema.parse({ foodId, quantity });
    const food = await driver.get("foods", data.foodId);
    if (!food) throw new DataError("Aliment introuvable.");
    const meal = "mealId" in target ? await driver.get("meals", target.mealId) : await findOrCreateMeal(target.date, target.type);
    if (!meal) throw new DataError("Repas introuvable.");
    const item: MealItem = {
      id: newId(),
      userId,
      mealId: meal.id,
      foodId: food.id,
      foodName: food.brand ? `${food.name} (${food.brand})` : food.name,
      quantity: data.quantity,
      unit: food.unit,
      ...macrosForQuantity(food, data.quantity),
      createdAt: nowIso(),
    };
    await driver.upsert("meal_items", item);
    return item;
  }

  async function updateItemQuantity(itemId: string, quantity: number): Promise<MealItem> {
    const item = await driver.get("meal_items", itemId);
    if (!item) throw new DataError("Élément introuvable.");
    const data = mealItemSchema.parse({ foodId: item.foodId, quantity });
    const food = await driver.get("foods", item.foodId);
    // Si l'aliment a été supprimé, on met à l'échelle l'instantané existant.
    const macros = food
      ? macrosForQuantity(food, data.quantity)
      : {
          kcal: round((item.kcal * data.quantity) / item.quantity, 0),
          proteinG: round((item.proteinG * data.quantity) / item.quantity, 1),
          carbsG: round((item.carbsG * data.quantity) / item.quantity, 1),
          fatG: round((item.fatG * data.quantity) / item.quantity, 1),
        };
    const next = { ...item, quantity: data.quantity, ...macros };
    await driver.upsert("meal_items", next);
    return next;
  }

  async function removeItem(itemId: string): Promise<void> {
    await driver.remove("meal_items", itemId);
  }

  async function deleteMeal(mealId: string): Promise<void> {
    const items = await driver.list("meal_items", { where: { mealId } });
    await driver.remove("meal_items", items.map((i) => i.id));
    await driver.remove("meals", mealId);
  }

  async function renameMeal(mealId: string, name: string): Promise<void> {
    const meal = await driver.get("meals", mealId);
    if (!meal) throw new DataError("Repas introuvable.");
    await driver.upsert("meals", { ...meal, name: name.trim().slice(0, 60) });
  }

  return {
    listGoals,
    getGoal,
    setGoal,
    searchFoods,
    recentFoods,
    getFood,
    saveFood,
    deleteFood,
    getDay,
    dailyTotals,
    createMeal,
    addItem,
    updateItemQuantity,
    removeItem,
    deleteMeal,
    renameMeal,
  };
}
