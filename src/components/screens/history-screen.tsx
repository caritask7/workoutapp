"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ChevronRight, Dumbbell, Trash2 } from "lucide-react";
import { ButtonLink, Card, ConfirmSheet, EmptyState, ErrorState, IconButton, InlineError, PageSkeleton, useToast } from "@/components/ui";
import { PageHeader } from "@/components/layout/page-header";
import { useData, useMutation } from "@/hooks/use-data";
import { formatDateShort, formatDuration, formatInt } from "@/lib/format";
import type { WorkoutSession } from "@/types/domain";

/** Historique des séances terminées (suppression avec recalcul des records). */
export function HistoryScreen() {
  const toast = useToast();
  const sessions = useData((s) => s.sessions.listCompletedSessions());
  const [toDelete, setToDelete] = useState<WorkoutSession | null>(null);
  const remove = useMutation((s, id: string) => s.sessions.deleteSession(id), {
    onSuccess: () => {
      setToDelete(null);
      toast("Séance supprimée");
    },
  });

  if (sessions.loading) return <PageSkeleton blocks={3} />;
  if (sessions.error || !sessions.data) return <ErrorState message={sessions.error ?? "Chargement impossible."} onRetry={sessions.reload} />;

  const byMonth = new Map<string, WorkoutSession[]>();
  for (const s of sessions.data) {
    const key = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(s.startedAt));
    byMonth.set(key, [...(byMonth.get(key) ?? []), s]);
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/progress" className="inline-flex items-center gap-1.5 text-label-caps text-muted hover:text-ink-strong">
        <ArrowLeft className="size-4" aria-hidden />
        Progression
      </Link>
      <PageHeader eyebrow="Historique" title="Entraînements réalisés" subtitle={`${sessions.data.length} séance${sessions.data.length > 1 ? "s" : ""} enregistrée${sessions.data.length > 1 ? "s" : ""}`} />
      <InlineError message={remove.error} />
      {sessions.data.length === 0 ? (
        <EmptyState icon={<Dumbbell />} title="Aucune séance terminée" action={<ButtonLink href="/workouts">Choisir un entraînement</ButtonLink>}>
          Les séances terminées apparaissent ici avec leur durée, leur volume et leurs séries.
        </EmptyState>
      ) : (
        [...byMonth.entries()].map(([month, list]) => (
          <section key={month}>
            <h2 className="mb-2 text-label-caps text-muted capitalize">{month}</h2>
            <Card padding="none">
              <ul className="divide-y divide-line">
                {list.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 pr-3">
                    <Link href={`/session/${s.id}/summary`} className="flex min-w-0 flex-1 items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ink-strong uppercase">{s.workoutName}</span>
                        <span className="block text-[13px] text-muted tabular">
                          {formatDateShort(s.startedAt)} · {formatDuration(s.durationSec ?? 0)} · {s.totalSets} séries
                        </span>
                      </span>
                      <span className="shrink-0 font-display font-bold text-lime tabular">{formatInt(s.totalVolumeKg ?? 0)} kg</span>
                      <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />
                    </Link>
                    <IconButton label={`Supprimer la séance du ${formatDateShort(s.startedAt)}`} size="sm" variant="ghost" onClick={() => setToDelete(s)}>
                      <Trash2 className="size-4 text-subtle" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))
      )}
      <ConfirmSheet
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && void remove.run(toDelete.id)}
        loading={remove.pending}
        danger
        title="Supprimer cette séance ?"
        description="Ses séries seront supprimées et les records personnels recalculés."
        confirmLabel="Supprimer"
      />
    </div>
  );
}
