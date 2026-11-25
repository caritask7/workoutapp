"use client";

import { useEffect } from "react";

/**
 * Garde l'écran allumé pendant une séance (Screen Wake Lock API).
 * Silencieux si le navigateur ne la prend pas en charge ; le verrou est
 * redemandé au retour sur l'onglet (le navigateur le libère en arrière-plan).
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if (document.visibilityState !== "visible") return;
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) await sentinel.release();
      } catch {
        /* refusé (économie d'énergie) : sans conséquence */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
