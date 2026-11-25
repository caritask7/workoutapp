"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServices, type Services } from "@/services";
import { DEMO_USER_ID } from "@/services/context";
import { ensureLocalCatalog, ensureUserData } from "@/services/bootstrap";
import { LocalDriver } from "@/services/data/local-driver";
import type { DataDriver } from "@/services/data/driver";

export type DataStatus = "loading" | "ready" | "error";

interface DataContextValue {
  status: DataStatus;
  error: string | null;
  services: Services | null;
  mode: "demo" | "supabase";
  email: string | null;
  /** Incrémenté à chaque mutation : les lectures `useData` se rafraîchissent. */
  version: number;
  invalidate: () => void;
  signOut: () => Promise<void>;
  resetDemo: () => Promise<void>;
  /** Télécharge une sauvegarde JSON des données de l'utilisateur. */
  exportData: () => Promise<void>;
  /** Mode démo : remplace toutes les données par celles d'une sauvegarde. */
  importData: (file: File) => Promise<void>;
  retry: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

let localDriver: LocalDriver | null = null;
const getLocalDriver = () => (localDriver ??= new LocalDriver());

async function connect(): Promise<{ driver: DataDriver; userId: string; email: string | null; displayName?: string }> {
  if (!isSupabaseConfigured) {
    const driver = getLocalDriver();
    await ensureLocalCatalog({ driver, userId: DEMO_USER_ID });
    return { driver, userId: DEMO_USER_ID, email: null };
  }
  const [{ getSupabaseBrowserClient }, { SupabaseDriver }] = await Promise.all([
    import("@/lib/supabase/client"),
    import("@/services/data/supabase-driver"),
  ]);
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Session expirée. Reconnectez-vous.");
  const meta = data.user.user_metadata as { display_name?: string } | undefined;
  return {
    driver: new SupabaseDriver(client, data.user.id),
    userId: data.user.id,
    email: data.user.email ?? null,
    displayName: meta?.display_name,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Services | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const router = useRouter();
  const driverRef = useRef<DataDriver | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { driver, userId, email, displayName } = await connect();
        await ensureUserData({ driver, userId }, displayName ? { displayName } : {});
        if (cancelled) return;
        driverRef.current = driver;
        setServices(createServices({ driver, userId }));
        setEmail(email);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Initialisation impossible.");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const invalidate = useCallback(() => setVersion((v) => v + 1), []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }, [router]);

  const resetDemo = useCallback(async () => {
    if (isSupabaseConfigured) return;
    await getLocalDriver().clearAll();
    setStatus("loading");
    setServices(null);
    setAttempt((a) => a + 1);
    router.replace("/");
  }, [router]);

  const exportData = useCallback(async () => {
    if (!services || !driverRef.current) return;
    const { exportBackup } = await import("@/services/backup");
    const backup = await exportBackup(driverRef.current, services.userId);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workout-sauvegarde-${backup.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [services]);

  const importData = useCallback(async (file: File) => {
    if (isSupabaseConfigured) throw new Error("L'import est réservé au mode démo.");
    const { parseBackup, restoreBackup } = await import("@/services/backup");
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      throw new Error("Le fichier n'est pas un JSON valide.");
    }
    // Validation complète AVANT d'effacer quoi que ce soit.
    const backup = parseBackup(json, DEMO_USER_ID);
    const driver = getLocalDriver();
    await driver.clearAll();
    await ensureLocalCatalog({ driver, userId: DEMO_USER_ID });
    await restoreBackup(driver, backup);
    setStatus("loading");
    setServices(null);
    setAttempt((a) => a + 1);
    router.replace("/");
  }, [router]);

  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    setAttempt((a) => a + 1);
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      status,
      error,
      services,
      mode: isSupabaseConfigured ? "supabase" : "demo",
      email,
      version,
      invalidate,
      signOut,
      resetDemo,
      exportData,
      importData,
      retry,
    }),
    [status, error, services, email, version, invalidate, signOut, resetDemo, exportData, importData, retry],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataContext doit être utilisé dans <DataProvider>.");
  return ctx;
}

/** Services prêts à l'emploi (à utiliser sous <DataGate>). */
export function useServices(): Services {
  const { services } = useDataContext();
  if (!services) throw new Error("Services indisponibles : composant rendu hors de <DataGate>.");
  return services;
}
