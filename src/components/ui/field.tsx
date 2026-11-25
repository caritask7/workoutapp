"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-field border border-line bg-surface-lowest px-3.5 text-ink-strong placeholder:text-faint transition-[border-color,box-shadow] focus:border-lime focus:outline-none focus:glow-lime aria-[invalid=true]:border-danger disabled:opacity-50";

export interface FieldProps {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}

/** Libellé + contrôle + message d'erreur, avec les attributs ARIA reliés. */
export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label-caps text-muted">
        {label}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[12px] text-danger-soft">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12px] text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(control, "h-12 text-[15px]", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-3 text-[15px]", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-12 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10 text-[15px]", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c7c6ce' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest}>
      {children}
    </select>
  );
}

/** Convertit une saisie française (« 32,5 ») en nombre, ou `null` si vide / invalide. */
export function parseDecimal(raw: string): number | null {
  const s = raw.replace(/\s/g, "").replace(",", ".");
  if (s === "" || s === "." || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const display = (v: number | null | undefined, decimals: number) =>
  v === null || v === undefined ? "" : decimals > 0 ? String(v).replace(".", ",") : String(Math.round(v));

export interface NumberInputProps extends Omit<ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  /** Nombre de décimales autorisées (0 = entier). */
  decimals?: number;
  variant?: "field" | "cell";
}

/**
 * Saisie numérique pensée pour le mobile : clavier numérique, virgule
 * acceptée, valeur émise à la validation (blur / Entrée) pour éviter les
 * écritures à chaque frappe.
 */
export function NumberInput({ value, onValueChange, decimals = 0, variant = "field", className, onBlur, onKeyDown, ...rest }: NumberInputProps) {
  // Brouillon local uniquement pendant l'édition ; sinon la valeur contrôlée fait foi.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = parseDecimal(draft);
    const next = parsed === null ? null : decimals > 0 ? Math.round(parsed * 10 ** decimals) / 10 ** decimals : Math.round(parsed);
    if (next !== (value ?? null)) onValueChange(next);
  };

  return (
    <input
      type="text"
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      autoComplete="off"
      enterKeyHint="done"
      value={draft ?? display(value, decimals)}
      onFocus={(e) => {
        setDraft(display(value, decimals));
        e.currentTarget.select();
      }}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d.,]/g, ""))}
      onBlur={(e) => {
        commit();
        setDraft(null);
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        onKeyDown?.(e);
      }}
      className={cn(
        variant === "cell"
          ? "h-14 w-full rounded-field border border-transparent bg-surface-lowest text-center font-display text-[22px] font-bold text-ink-strong tabular focus:border-lime focus:outline-none focus:glow-lime disabled:opacity-40"
          : cn(control, "h-12 text-[15px] tabular"),
        className,
      )}
      {...rest}
    />
  );
}

/** Interrupteur accessible. */
export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-[15px] text-ink-strong">
          {label}
        </label>
        {description && <p className="text-[12px] text-subtle">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-lime" : "bg-surface-4")}
      >
        <span className={cn("absolute top-1 size-5 rounded-full transition-[left,background-color]", checked ? "left-6 bg-on-lime" : "left-1 bg-ink")} />
      </button>
    </div>
  );
}
