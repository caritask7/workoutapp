"use client";

import { useSyncExternalStore } from "react";
import { toIsoDate } from "@/lib/domain/dates";

function subscribeEvery(ms: number) {
  return (onChange: () => void) => {
    const id = window.setInterval(onChange, ms);
    document.addEventListener("visibilitychange", onChange);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onChange);
    };
  };
}

const subscribeMinute = subscribeEvery(30_000);
const subscribeSecond = subscribeEvery(1_000);
const serverNull = () => null;

/**
 * Date locale du jour (`YYYY-MM-DD`), `null` pendant le pré-rendu serveur.
 * Change automatiquement à minuit.
 */
export function useToday(): string | null {
  return useSyncExternalStore(subscribeMinute, toIsoDate, serverNull);
}

const nowSecond = () => Math.floor(Date.now() / 1000) * 1000;

/** Horodatage courant à la seconde (chronomètres), `null` côté serveur. */
export function useNow(active = true): number | null {
  return useSyncExternalStore(active ? subscribeSecond : subscribeMinute, nowSecond, serverNull);
}
