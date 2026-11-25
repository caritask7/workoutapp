"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { TriangleExclamationPoint, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

/* --------------------------------- Skeleton -------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-card bg-surface-2", className)} />;
}

/** Squelette de page générique pendant le chargement des données. */
export function PageSkeleton({ blocks = 3 }: { blocks?: number }) {
  return (
    <div role="status" aria-label="Chargement" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-2/3" />
      {Array.from({ length: blocks }, (_, i) => (
        <Skeleton key={i} className={i === 0 ? "h-44" : "h-32"} />
      ))}
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

/* -------------------------------- EmptyState ------------------------------- */

export function EmptyState({
  icon = <Info />,
  title,
  children,
  action,
  className,
}: {
  /** Élément icône (ex. `<Award />`), sérialisable depuis un composant serveur. */
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-card-lg border border-dashed border-line-strong px-5 py-8 text-center", className)}>
      <span aria-hidden className="mb-3 grid size-12 place-items-center rounded-2xl bg-lime/10 text-lime [&>svg]:size-6">
        {icon}
      </span>
      <p className="text-headline-sm text-ink-strong">{title}</p>
      {children && <div className="mt-1.5 max-w-sm text-[14px] text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* -------------------------------- ErrorState ------------------------------- */

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-card-lg border border-danger/40 bg-danger/8 px-5 py-6 text-center">
      <TriangleExclamationPoint className="size-6 text-danger-soft" aria-hidden />
      <p className="text-[14px] text-ink">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

/** Message d'erreur en ligne (formulaires). */
export function InlineError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-[13px] text-danger-soft">
      <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

/* ---------------------------------- Toasts --------------------------------- */

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback((message: string, tone: ToastTone = "success") => {
    const id = ++counter.current;
    setItems((list) => [...list.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3200);
  }, []);

  const value = useMemo(() => push, [push]);
  const icons = { success: CircleCheck, error: TriangleExclamationPoint, info: Info };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(12px+env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex max-w-md animate-sheet-up items-center gap-2.5 rounded-2xl border px-4 py-3 text-[14px] shadow-2xl glass-bar",
                t.tone === "error" ? "border-danger/50 text-danger-soft" : "border-line-strong text-ink-strong",
              )}
            >
              <Icon className={cn("size-4 shrink-0", t.tone === "success" && "text-lime")} aria-hidden />
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans <ToastProvider>.");
  return ctx;
}
