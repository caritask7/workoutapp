import type { DataDriver } from "./data/driver";

/** Contexte passé à chaque service : persistance + utilisateur courant. */
export interface ServiceContext {
  driver: DataDriver;
  userId: string;
}

/** Identifiant fixe de l'utilisateur du mode démo (base locale mono-utilisateur). */
export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
