"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, IconButton } from "./button";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}

/**
 * Feuille modale : panneau inférieur sur mobile, boîte centrée au-delà de 640 px.
 * Basée sur <dialog> (piège du focus, Échap et inertie du fond natifs).
 */
export function Sheet({ open, onClose, title, description, children, footer, size = "md" }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-[24px] border border-line-strong bg-[#222326] p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm open:flex open:animate-sheet-up open:flex-col",
        "sm:m-auto sm:max-h-[85dvh] sm:rounded-[24px]",
        size === "md" ? "sm:max-w-lg" : "sm:max-w-2xl",
      )}
    >
      {open && (
        <>
          <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-headline-md text-ink-strong">
                {title}
              </h2>
              {description && <p className="mt-1 text-[14px] text-muted">{description}</p>}
            </div>
            <IconButton label="Fermer" size="sm" onClick={onClose}>
              <X className="size-4" />
            </IconButton>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && <footer className="safe-bottom border-t border-line px-5 pt-4 pb-4">{footer}</footer>}
        </>
      )}
    </dialog>
  );
}

/** Confirmation d'une action destructive ou irréversible. */
export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmer",
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button variant={danger ? "danger" : "primary"} block onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <span className="sr-only">Confirmation requise</span>
    </Sheet>
  );
}
