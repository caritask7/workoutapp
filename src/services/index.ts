import type { ServiceContext } from "./context";
import { createBodyService } from "./body";
import { createCatalogService } from "./catalog";
import { createNutritionService } from "./nutrition";
import { createProfileService } from "./profile";
import { createSessionService } from "./sessions";
import { createWorkoutService } from "./workouts";

/** Point d'entrée unique de la logique métier, quel que soit le stockage. */
export function createServices(ctx: ServiceContext) {
  return {
    kind: ctx.driver.kind,
    userId: ctx.userId,
    catalog: createCatalogService(ctx),
    workouts: createWorkoutService(ctx),
    sessions: createSessionService(ctx),
    body: createBodyService(ctx),
    nutrition: createNutritionService(ctx),
    profile: createProfileService(ctx),
  };
}

export type Services = ReturnType<typeof createServices>;
export type { ServiceContext } from "./context";
