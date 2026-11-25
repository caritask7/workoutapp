"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDataContext } from "@/providers/data-provider";
import type { Services } from "@/services";

export interface DataState<T> {
  data: T | undefined;
  error: string | null;
  /** Vrai tant qu'aucune donnée n'a encore été chargée. */
  loading: boolean;
  /** Vrai pendant un rechargement en arrière-plan. */
  refreshing: boolean;
  reload: () => void;
}

/**
 * Lecture asynchrone liée aux services. Se relance quand `deps` change ou
 * quand une mutation appelle `invalidate()` (voir `useMutation`).
 */
export function useData<T>(fetcher: (s: Services) => Promise<T>, deps: unknown[] = []): DataState<T> {
  const { services, version } = useDataContext();
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: T; error: string | null } | null>(null);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const key = `${version}|${tick}|${JSON.stringify(deps)}`;

  useEffect(() => {
    if (!services) return;
    let cancelled = false;
    fetcherRef
      .current(services)
      .then((data) => {
        if (!cancelled) setResult({ key, data, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult((prev) => ({ key, data: prev?.data, error: errorMessage(err) }));
      });
    return () => {
      cancelled = true;
    };
  }, [services, key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const pending = result?.key !== key;
  const data = result?.data;

  return {
    data,
    error: pending ? null : (result?.error ?? null),
    loading: pending && data === undefined,
    refreshing: pending && data !== undefined,
    reload,
  };
}

export interface MutationState<A extends unknown[], R> {
  run: (...args: A) => Promise<R | undefined>;
  pending: boolean;
  error: string | null;
  reset: () => void;
}

/** Écriture : gère l'état en cours / l'erreur et invalide les lectures au succès. */
export function useMutation<A extends unknown[], R>(
  mutator: (s: Services, ...args: A) => Promise<R>,
  options: { invalidate?: boolean; onSuccess?: (result: R) => void } = {},
): MutationState<A, R> {
  const { services, invalidate } = useDataContext();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef({ mutator, options });
  useEffect(() => {
    ref.current = { mutator, options };
  });

  const run = useCallback(
    async (...args: A) => {
      if (!services) return undefined;
      setPending(true);
      setError(null);
      try {
        const result = await ref.current.mutator(services, ...args);
        if (ref.current.options.invalidate !== false) invalidate();
        ref.current.options.onSuccess?.(result);
        return result;
      } catch (err) {
        setError(errorMessage(err));
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [services, invalidate],
  );

  return { run, pending, error, reset: useCallback(() => setError(null), []) };
}

/** Message lisible, y compris pour les erreurs de validation Zod. */
export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "issues" in err && Array.isArray((err as { issues: unknown[] }).issues)) {
    const first = (err as { issues: { message?: string }[] }).issues[0];
    if (first?.message) return first.message;
  }
  if (err instanceof Error) return err.message;
  return "Une erreur est survenue.";
}
