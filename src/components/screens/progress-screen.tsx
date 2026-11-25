"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Camera,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  History,
  Plus,
  Ruler,
  Scale,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  IconButton,
  InlineError,
  LabelCaps,
  MetricValue,
  PageSkeleton,
  Pill,
  ProgressRing,
  SectionTitle,
  SegmentedControl,
  Select,
  useToast,
} from "@/components/ui";
import { PageHeader } from "@/components/layout/page-header";
import { BarsChart, TrendChart } from "@/components/charts/charts";
import { MeasurementSheet } from "@/components/body/measurement-sheet";
import { useData, useMutation } from "@/hooks/use-data";
import { useToday } from "@/hooks/use-clock";
import { addDays, diffDays, isoDateOf, startOfWeek } from "@/lib/domain/dates";
import { delta, earliestValue, latestValue, type MeasurementField } from "@/lib/domain/body";
import { round } from "@/lib/domain/training";
import { formatDayMonth, formatDecimal, formatDelta, formatInt, formatKg } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Services } from "@/services";
import type { BodyMeasurement, PersonalRecord, ProgressPhoto, WorkoutSession } from "@/types/domain";

type Period = "7d" | "30d" | "3m" | "6m" | "1y";
const PERIOD_DAYS: Record<Period, number> = { "7d": 7, "30d": 30, "3m": 91, "6m": 182, "1y": 365 };

async function loadProgress(s: Services) {
  const [profile, measurements, sessions, records, photos, exercises] = await Promise.all([
    s.profile.getProfile(),
    s.body.listMeasurements(),
    s.sessions.listCompletedSessions(),
    s.sessions.listRecords(),
    s.body.listPhotos(),
    s.catalog.listExercises(),
  ]);
  return { profile, measurements, sessions, records, photos, exerciseNames: new Map(exercises.map((e) => [e.id, e.name])) };
}

export function ProgressScreen() {
  const today = useToday();
  if (!today) return <PageSkeleton blocks={4} />;
  return <Progress today={today} />;
}

function Progress({ today }: { today: string }) {
  const [period, setPeriod] = useState<Period>("30d");
  const [sheet, setSheet] = useState<null | "weight" | "full">(null);
  const state = useData(loadProgress);

  if (state.loading) return <PageSkeleton blocks={4} />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? "Chargement impossible."} onRetry={state.reload} />;

  const { profile, measurements, sessions, records, photos, exerciseNames } = state.data;
  const from = addDays(today, -PERIOD_DAYS[period] + 1);
  const inPeriod = measurements.filter((m) => m.date >= from);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Analyse de progression"
        aside={`${sessions.length} séance${sessions.length > 1 ? "s" : ""} au total`}
        title="Progression & Évolution"
        subtitle={
          profile && (
            <>
              {profile.displayName}
              {profile.age ? ` • ${profile.age} ans` : ""}
              {profile.targetWeightMinKg ? ` • Cible : ${formatKg(profile.targetWeightMinKg)}${profile.targetWeightMaxKg && profile.targetWeightMaxKg !== profile.targetWeightMinKg ? `–${formatKg(profile.targetWeightMaxKg)}` : ""} kg` : ""}
            </>
          )
        }
      />

      <SegmentedControl
        label="Période"
        value={period}
        onChange={setPeriod}
        options={[
          { value: "7d", label: "7J" },
          { value: "30d", label: "30J" },
          { value: "3m", label: "3M" },
          { value: "6m", label: "6M" },
          { value: "1y", label: "1AN" },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <WeightCard measurements={measurements} inPeriod={inPeriod} from={from} target={profile?.targetWeightMinKg ?? null} onAdd={() => setSheet("weight")} />
        <VolumeCard sessions={sessions} today={today} from={from} period={period} plannedPerWeek={profile?.trainingDays.length ?? 3} />
      </div>

      <section>
        <SectionTitle aside={<Link href="/progress/history" className="hover:underline">Historique</Link>}>Records personnels</SectionTitle>
        <RecordsGrid records={records} names={exerciseNames} />
      </section>

      <LoadProgression sessions={sessions} names={exerciseNames} from={from} />

      <section>
        <SectionTitle aside={`Sur ${PERIOD_DAYS[period]} jours`}>Mensurations</SectionTitle>
        <MeasurementsGrid measurements={measurements} from={from} />
        <Button variant="secondary" block className="mt-3" icon={<Ruler className="size-4 text-lime" />} onClick={() => setSheet("full")}>
          Ajouter des mensurations
        </Button>
      </section>

      <PhotosSection photos={photos} latestWeight={latestValue(measurements, "weightKg")?.value ?? null} today={today} />

      <Summary measurements={measurements} from={from} sessions={sessions.filter((x) => isoDateOf(x.startedAt) >= from)} />

      <ButtonLink href="/progress/history" variant="secondary" size="lg" block icon={<History className="size-5 text-lime" />}>
        Historique des entraînements
      </ButtonLink>

      {sheet && <MeasurementSheet open onClose={() => setSheet(null)} weightOnly={sheet === "weight"} />}
    </div>
  );
}

function WeightCard({
  measurements,
  inPeriod,
  from,
  target,
  onAdd,
}: {
  measurements: BodyMeasurement[];
  inPeriod: BodyMeasurement[];
  from: string;
  target: number | null;
  onAdd: () => void;
}) {
  const latest = latestValue(measurements, "weightKg");
  const first = earliestValue(measurements, "weightKg", from);
  const points = inPeriod.filter((m) => m.weightKg != null).map((m) => ({ date: m.date, value: m.weightKg as number }));
  const change = latest && first && first.date !== latest.date ? round(latest.value - first.value, 1) : null;
  const weeks = latest && first ? diffDays(first.date, latest.date) / 7 : 0;
  const perWeekG = change !== null && weeks >= 1 ? Math.round((change * 1000) / weeks) : null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <LabelCaps as="p">Poids corporel actuel</LabelCaps>
          <MetricValue value={latest ? formatKg(latest.value) : "—"} unit="kg" size="xl" />
          {latest && <p className="text-[12px] text-subtle">Pesée du {formatDayMonth(latest.date)}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {change !== null && (
            <Pill tone={change >= 0 ? "lime-soft" : "neutral"} icon={<TrendingUp />}>
              {formatDelta(change)} kg
            </Pill>
          )}
          {perWeekG !== null && <span className="text-[12px] text-muted tabular">{formatDelta(perWeekG, 0)} g/sem.</span>}
        </div>
      </div>
      {target != null && latest && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-lowest/80 px-3 py-2.5 text-label-caps">
          <span className="flex items-center gap-2 text-ink">
            <span aria-hidden className="size-1.5 rounded-full bg-lime" />
            Objectif
          </span>
          <span className="text-lime tabular">
            {formatKg(target)} kg ({target - latest.value > 0 ? `${formatDelta(round(target - latest.value, 1))} kg restants` : "atteint"})
          </span>
        </div>
      )}
      <div className="mt-4">
        {points.length >= 2 ? (
          <TrendChart data={points} unit="kg" target={target} ariaLabel="Évolution du poids sur la période" />
        ) : (
          <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[14px] text-muted">
            {points.length === 1 ? "Une seule pesée sur la période : ajoutez-en une autre pour voir la courbe." : "Aucune pesée sur la période."}
          </p>
        )}
      </div>
      <Button variant="secondary" size="sm" className="mt-4" icon={<Plus className="size-3.5" />} onClick={onAdd}>
        Nouvelle pesée
      </Button>
    </Card>
  );
}

function VolumeCard({ sessions, today, from, period, plannedPerWeek }: { sessions: WorkoutSession[]; today: string; from: string; period: Period; plannedPerWeek: number }) {
  const monday = startOfWeek(today);
  const prevMonday = addDays(monday, -7);
  const vol = (list: WorkoutSession[]) => list.reduce((s, x) => s + (x.totalVolumeKg ?? 0), 0);
  const thisWeek = sessions.filter((x) => isoDateOf(x.startedAt) >= monday);
  const lastWeek = sessions.filter((x) => isoDateOf(x.startedAt) >= prevMonday && isoDateOf(x.startedAt) < monday);
  const change = vol(lastWeek) > 0 ? ((vol(thisWeek) - vol(lastWeek)) / vol(lastWeek)) * 100 : null;

  // Une barre par semaine (ou par jour sur 7 jours).
  const daily = period === "7d";
  const buckets: { date: string; label: string; value: number }[] = [];
  if (daily) {
    for (let i = 0; i < 7; i++) {
      const d = addDays(from, i);
      buckets.push({ date: d, label: formatDayMonth(d), value: Math.round(vol(sessions.filter((x) => isoDateOf(x.startedAt) === d))) });
    }
  } else {
    for (let w = startOfWeek(from); w <= monday; w = addDays(w, 7)) {
      const end = addDays(w, 7);
      buckets.push({
        date: w,
        label: formatDayMonth(w),
        value: Math.round(vol(sessions.filter((x) => isoDateOf(x.startedAt) >= w && isoDateOf(x.startedAt) < end))),
      });
    }
  }
  const periodSessions = sessions.filter((x) => isoDateOf(x.startedAt) >= from);

  return (
    <Card>
      <CardHeader icon={<ChartNoAxesColumnIncreasing />} title="Volume & séances" />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <LabelCaps as="p">Charge cumulée cette semaine</LabelCaps>
          <MetricValue value={formatInt(vol(thisWeek))} unit="kg" size="xl" />
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
            {change !== null ? (
              <>
                <Zap className="size-3.5 text-lime" aria-hidden />
                <span className={change >= 0 ? "text-lime" : "text-danger-soft"}>{formatDelta(change)}%</span> vs sem. précédente ({formatInt(vol(lastWeek))} kg)
              </>
            ) : (
              "Pas de séance la semaine précédente"
            )}
          </p>
        </div>
        <ProgressRing value={(thisWeek.length / Math.max(1, plannedPerWeek)) * 100} size={84} stroke={8} label={`${thisWeek.length} séances sur ${plannedPerWeek} cette semaine`}>
          <span className="font-display text-[15px] font-bold text-ink-strong tabular">
            {thisWeek.length}/{plannedPerWeek}
          </span>
        </ProgressRing>
      </div>
      <div className="mt-4">
        {periodSessions.length ? (
          <BarsChart data={buckets} unit="kg" ariaLabel={`Volume soulevé par ${daily ? "jour" : "semaine"}`} />
        ) : (
          <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[14px] text-muted">Aucune séance sur la période.</p>
        )}
      </div>
      <p className="mt-3 text-[13px] text-muted">
        <span className="font-semibold text-ink-strong tabular">{periodSessions.length}</span> séance{periodSessions.length > 1 ? "s" : ""} sur la période ·{" "}
        <span className="font-semibold text-ink-strong tabular">{formatInt(vol(periodSessions))}</span> kg soulevés
      </p>
    </Card>
  );
}

function RecordsGrid({ records, names }: { records: PersonalRecord[]; names: Map<string, string> }) {
  const best = new Map<string, PersonalRecord[]>();
  for (const r of records.filter((x) => x.type === "max_weight")) best.set(r.exerciseId, [...(best.get(r.exerciseId) ?? []), r]);
  const rows = [...best.entries()]
    .map(([exerciseId, list]) => {
      const sorted = [...list].sort((a, b) => b.value - a.value);
      return { exerciseId, top: sorted[0], previous: sorted[1] };
    })
    .sort((a, b) => (a.top.achievedAt < b.top.achievedAt ? 1 : -1))
    .slice(0, 6);

  if (!rows.length) {
    return (
      <EmptyState icon={<TrendingUp />} title="Aucun record pour l'instant">
        Chaque série validée est comparée à vos meilleures performances : vos records apparaîtront ici.
      </EmptyState>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {rows.map(({ exerciseId, top, previous }) => (
        <li key={exerciseId}>
          <Link href={`/exercises/${exerciseId}`} className="block h-full rounded-card border border-line/70 bg-surface-2 p-3.5 transition-colors hover:border-lime/50">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="truncate text-label-caps text-muted">{names.get(exerciseId) ?? exerciseId}</span>
              <Pill tone="lime" className="h-5 px-2">
                PR
              </Pill>
            </div>
            <MetricValue value={formatDecimal(top.value)} unit="kg" />
            <p className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-lime tabular">
              {previous ? (
                <>
                  <ArrowUp className="size-3" aria-hidden />
                  {formatDelta(round(top.value - previous.value, 1))} kg
                </>
              ) : (
                <span className="text-subtle">Premier record · {formatDayMonth(top.achievedAt)}</span>
              )}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Progression des charges : meilleure charge par séance pour un exercice. */
function LoadProgression({ sessions, names, from }: { sessions: WorkoutSession[]; names: Map<string, string>; from: string }) {
  const trained = [...new Set(sessions.flatMap((s) => s.plan.filter((p) => p.trackingType === "weight_reps").map((p) => p.exerciseId)))];
  const [exerciseId, setExerciseId] = useState<string>("");
  const selected = exerciseId || trained[0] || "";
  const history = useData((s) => (selected ? s.sessions.exerciseHistory(selected, 200) : Promise.resolve([])), [selected]);
  const points = (history.data ?? [])
    .filter((h) => h.bestWeightKg != null && isoDateOf(h.session.startedAt) >= from)
    .map((h) => ({ date: isoDateOf(h.session.startedAt), value: h.bestWeightKg as number }))
    .reverse();

  if (!trained.length) return null;
  return (
    <Card>
      <CardHeader icon={<TrendingUp />} title="Progression des charges" />
      <label className="mb-4 block">
        <span className="sr-only">Exercice</span>
        <Select value={selected} onChange={(e) => setExerciseId(e.target.value)}>
          {trained.map((id) => (
            <option key={id} value={id}>
              {names.get(id) ?? id}
            </option>
          ))}
        </Select>
      </label>
      {points.length >= 2 ? (
        <TrendChart data={points} unit="kg" ariaLabel={`Charge maximale par séance : ${names.get(selected)}`} height={180} />
      ) : (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[14px] text-muted">
          Au moins deux séances sur la période sont nécessaires pour tracer la courbe.
        </p>
      )}
      <Link href={`/exercises/${selected}`} className="mt-3 inline-flex items-center gap-1 text-[13px] text-lime hover:underline">
        Fiche et historique complet <ChevronRight className="size-3.5" aria-hidden />
      </Link>
    </Card>
  );
}

const MEASURES: { field: MeasurementField; label: string; unit: string }[] = [
  { field: "chestCm", label: "Tour de poitrine", unit: "cm" },
  { field: "armCm", label: "Tour de bras", unit: "cm" },
  { field: "waistCm", label: "Tour de taille", unit: "cm" },
  { field: "thighCm", label: "Tour de cuisse", unit: "cm" },
];

function MeasurementsGrid({ measurements, from }: { measurements: BodyMeasurement[]; from: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {MEASURES.map((m) => {
        const latest = latestValue(measurements, m.field);
        const first = earliestValue(measurements, m.field, from);
        const d = latest && first && first.date !== latest.date ? delta(first.value, latest.value) : null;
        return (
          <li key={m.field} className="rounded-card border border-line/70 bg-surface p-4">
            <p className="text-[13px] text-muted">{m.label}</p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <MetricValue value={latest ? formatDecimal(latest.value) : "—"} unit={m.unit} size="md" />
              {d !== null && (
                <Pill tone={d === 0 ? "neutral" : "lime-soft"} className="h-5 px-2">
                  {d === 0 ? "Stable" : `${formatDelta(d)} ${m.unit}`}
                </Pill>
              )}
            </div>
            {latest && <p className="mt-1 text-[11px] text-subtle">au {formatDayMonth(latest.date)}</p>}
          </li>
        );
      })}
    </ul>
  );
}

function PhotoImage({ photo, alt }: { photo: ProgressPhoto; alt: string }) {
  const url = useData((s) => s.body.photoUrl(photo), [photo.id]);
  if (!url.data) return <div className="aspect-[3/4] w-full animate-pulse bg-surface-3" />;
  // eslint-disable-next-line @next/next/no-img-element -- URL blob/signée, non optimisable par next/image
  return <img src={url.data} alt={alt} className="aspect-[3/4] w-full object-cover" />;
}

function PhotosSection({ photos, latestWeight, today }: { photos: ProgressPhoto[]; latestWeight: number | null; today: string }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [toDelete, setToDelete] = useState<ProgressPhoto | null>(null);
  const upload = useMutation((s, file: File) => s.body.addPhoto(file, { date: today, weightKg: latestWeight }), {
    onSuccess: () => toast("Photo ajoutée"),
  });
  const remove = useMutation((s, id: string) => s.body.deletePhoto(id), { onSuccess: () => setToDelete(null) });
  const first = photos[0];
  const last = photos.length > 1 ? photos[photos.length - 1] : null;

  useEffect(() => {
    if (upload.error) toast(upload.error, "error");
  }, [upload.error, toast]);

  return (
    <section>
      <SectionTitle aside={photos.length ? `${photos.length} photo${photos.length > 1 ? "s" : ""}` : undefined}>Comparatif visuel</SectionTitle>
      {first ? (
        <div className="grid grid-cols-2 gap-3">
          {[first, last].map((p, i) =>
            p ? (
              <figure key={p.id} className="relative overflow-hidden rounded-card-lg border border-line/70 bg-surface">
                <PhotoImage photo={p} alt={`Photo de progression du ${formatDayMonth(p.date)}`} />
                <span className={cn("absolute top-3 left-3", i === 0 ? "" : "")}>
                  <Pill tone={i === 0 ? "dark" : "lime"} caps>
                    {i === 0 ? "Départ" : "Actuel"}
                  </Pill>
                </span>
                <IconButton label="Supprimer la photo" size="sm" className="absolute top-3 right-3 bg-black/60" onClick={() => setToDelete(p)}>
                  <Trash2 className="size-4" />
                </IconButton>
                <figcaption className="flex items-center justify-between px-3 py-2.5 text-[13px]">
                  <span className="text-muted">{formatDayMonth(p.date)}</span>
                  {p.weightKg != null && <span className="font-display font-bold text-ink-strong tabular">{formatKg(p.weightKg)} kg</span>}
                </figcaption>
              </figure>
            ) : (
              <div key="placeholder" className="grid place-items-center rounded-card-lg border border-dashed border-line-strong p-4 text-center text-[13px] text-muted">
                Ajoutez une deuxième photo pour comparer.
              </div>
            ),
          )}
        </div>
      ) : (
        <EmptyState icon={<Camera />} title="Aucune photo de progression">
          Prenez une photo dans les mêmes conditions (lumière, tenue, pose) toutes les 2 à 4 semaines. Les photos restent privées.
        </EmptyState>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload.run(file);
          e.target.value = "";
        }}
      />
      <Button size="lg" block className="mt-3" icon={<Camera className="size-5" />} loading={upload.pending} onClick={() => input.current?.click()}>
        Nouvelle photo
      </Button>
      <ConfirmSheet
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && void remove.run(toDelete.id)}
        loading={remove.pending}
        danger
        title="Supprimer cette photo ?"
        description="La photo sera définitivement supprimée."
        confirmLabel="Supprimer"
      />
      <InlineError message={remove.error} />
    </section>
  );
}

/** Bilan rédigé à partir des seules données mesurées (aucune interprétation inventée). */
function Summary({ measurements, from, sessions }: { measurements: BodyMeasurement[]; from: string; sessions: WorkoutSession[] }) {
  const parts: string[] = [];
  const w0 = earliestValue(measurements, "weightKg", from);
  const w1 = latestValue(measurements, "weightKg");
  if (w0 && w1 && w0.date !== w1.date) {
    const d = round(w1.value - w0.value, 1);
    parts.push(d === 0 ? "Poids stable sur la période." : `Poids ${d > 0 ? "en hausse" : "en baisse"} de ${formatDecimal(Math.abs(d))} kg (depuis le ${formatDayMonth(w0.date)}).`);
  }
  const t0 = earliestValue(measurements, "waistCm", from);
  const t1 = latestValue(measurements, "waistCm");
  if (t0 && t1 && t0.date !== t1.date) {
    const d = round(t1.value - t0.value, 1);
    parts.push(d === 0 ? "Tour de taille inchangé." : `Tour de taille ${d > 0 ? "+" : "−"}${formatDecimal(Math.abs(d))} cm.`);
  }
  if (sessions.length) {
    parts.push(`${sessions.length} séance${sessions.length > 1 ? "s" : ""} réalisée${sessions.length > 1 ? "s" : ""} pour ${formatInt(sessions.reduce((s, x) => s + (x.totalVolumeKg ?? 0), 0))} kg soulevés.`);
  }
  return (
    <Card className="flex gap-3">
      <Bot className="mt-0.5 size-5 shrink-0 text-lime" aria-hidden />
      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-headline-sm text-ink-strong">Bilan de la période</h2>
          <Scale className="size-4 text-subtle" aria-hidden />
        </div>
        <p className="text-[14px] leading-6 text-muted">
          {parts.length ? parts.join(" ") : "Pas encore assez de données sur cette période : enregistrez vos pesées, mensurations et séances pour obtenir un bilan."}
        </p>
        <p className="mt-2 text-[11px] text-subtle">Synthèse calculée à partir de vos mesures enregistrées.</p>
      </div>
    </Card>
  );
}
