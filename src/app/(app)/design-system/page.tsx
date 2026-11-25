"use client";

import { useState } from "react";
import { Award, Dumbbell, Play, Scale, Timer } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  LabelCaps,
  MetricValue,
  NumberInput,
  PageSkeleton,
  Pill,
  ProgressBar,
  ProgressRing,
  SectionTitle,
  SegmentedControl,
  Sheet,
  StatCard,
  StatusDot,
  Switch,
  Tag,
  useToast,
} from "@/components/ui";
import { useData } from "@/hooks/use-data";
import { MUSCLE_BY_ID } from "@/data/seed/muscles";
import { formatTarget } from "@/lib/domain/training";

/**
 * Référence vivante du design system (DESIGN.md) + contrôle de la couche
 * de données : les sections « Données » lisent le stockage réel.
 */
export default function DesignSystemPage() {
  const toast = useToast();
  const [period, setPeriod] = useState<"7d" | "30d" | "3m">("30d");
  const [chips, setChips] = useState<Record<string, boolean>>({ chest: true, shoulders: true, lats: false });
  const [weight, setWeight] = useState<number | null>(32.5);
  const [sheet, setSheet] = useState(false);
  const [toggle, setToggle] = useState(true);
  const workouts = useData((s) => s.workouts.listWorkouts());
  const exercises = useData((s) => s.catalog.listExercises());

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="mb-1 flex items-center gap-2 text-label-caps text-lime">
          <StatusDot live /> Kinetic Obsidian
        </p>
        <h1 className="text-headline-lg text-ink-strong">Design system</h1>
        <p className="mt-1 text-[15px] text-muted">Composants de base et contrôle des données enregistrées.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader icon={<Scale />} title="Métriques" aside={<Pill tone="lime-soft">+0,4 kg</Pill>} />
          <MetricValue value="72,4" unit="kg" size="hero" />
          <ProgressBar value={28} className="mt-4" label="Progression" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard label="Squat" value="115" unit="kg" badge={<Pill tone="lime">PR</Pill>} hint="↑ +5,0 kg" />
            <StatCard label="RPE moyen" value="8,5" unit="/ 10" accent />
          </div>
        </Card>
        <Card>
          <CardHeader icon={<Timer />} title="Anneaux & barres" />
          <div className="flex items-center gap-5">
            <ProgressRing value={78} size={124} stroke={11}>
              <div>
                <MetricValue value="2 150" size="lg" />
                <LabelCaps className="block">/ 2 750 kcal</LabelCaps>
              </div>
            </ProgressRing>
            <div className="flex flex-1 flex-col gap-3">
              <ProgressBar value={84} label="Protéines" />
              <ProgressBar value={81} color="carbs" label="Glucides" />
              <ProgressBar value={80} color="fat" label="Lipides" />
            </div>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Actions</SectionTitle>
        <div className="flex flex-col gap-3">
          <Button size="lg" block icon={<Play className="size-5 fill-current" />} onClick={() => toast("Toast de confirmation")}>
            Commencer la séance
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary">Secondaire</Button>
            <Button variant="subtle">Discret</Button>
            <Button variant="ghost">Fantôme</Button>
            <Button variant="danger">Terminer</Button>
            <Button loading>Envoi</Button>
            <Button size="sm" variant="subtle">+30s</Button>
            <IconButton label="Exercice" variant="lime">
              <Dumbbell className="size-5" />
            </IconButton>
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Ouvrir une feuille
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Sélection" />
          <SegmentedControl
            label="Période"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "7d", label: "7J" },
              { value: "30d", label: "30J" },
              { value: "3m", label: "3M" },
            ]}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(chips).map(([id, on]) => (
              <Chip key={id} selected={on} onToggle={() => setChips((c) => ({ ...c, [id]: !c[id] }))}>
                {MUSCLE_BY_ID[id as keyof typeof MUSCLE_BY_ID].name}
              </Chip>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill tone="lime" caps>
              Aujourd&apos;hui
            </Pill>
            <Pill tone="neutral">RPE 9</Pill>
            <Pill tone="outline">Hypertrophie</Pill>
            <Tag>Pectoraux</Tag>
            <Tag>Dos</Tag>
          </div>
        </Card>
        <Card>
          <CardHeader title="Saisie" />
          <div className="grid grid-cols-[1fr_88px] gap-3">
            <Field label="Nom">{(p) => <Input placeholder="Full Body D" {...p} />}</Field>
            <Field label="Kg">{(p) => <NumberInput value={weight} onValueChange={setWeight} decimals={1} variant="cell" {...p} />}</Field>
          </div>
          <Field label="Avec erreur" error="Valeur hors limites." className="mt-3">
            {(p) => <Input defaultValue="720" {...p} />}
          </Field>
          <Switch checked={toggle} onChange={setToggle} label="Son du minuteur" description="Bip à la fin du repos" />
        </Card>
      </section>

      <section>
        <SectionTitle aside={workouts.data ? `${workouts.data.length} entraînements` : undefined}>Données enregistrées</SectionTitle>
        {workouts.loading ? (
          <PageSkeleton blocks={1} />
        ) : workouts.error ? (
          <ErrorState message={workouts.error} onRetry={workouts.reload} />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {workouts.data?.map((w) => (
              <Card key={w.id} padding="md">
                <h3 className="text-headline-sm text-ink-strong uppercase">{w.name}</h3>
                <p className="mb-3 text-[13px] text-lime">{w.focus}</p>
                <ol className="flex flex-col gap-1 text-[13px] text-muted">
                  {w.exercises.map((e) => (
                    <li key={e.id} className="flex justify-between gap-2">
                      <span className="truncate">{e.exercise.name}</span>
                      <span className="shrink-0 text-ink-strong tabular">
                        {e.sets} × {formatTarget({ ...e, trackingType: e.exercise.trackingType })}
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>
        )}
        <p className="mt-3 text-[13px] text-subtle">
          Catalogue : {exercises.data ? `${exercises.data.length} exercices` : "…"}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <EmptyState icon={<Award />} title="Aucun record pour l'instant">
          Vos records personnels apparaîtront après votre première séance.
        </EmptyState>
        <ErrorState message="Exemple d'erreur avec relance." onRetry={() => toast("Relance", "info")} />
      </section>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Feuille modale" description="Panneau inférieur sur mobile, boîte centrée sur ordinateur.">
        <p className="text-[14px] text-muted">Échap, clic à l&apos;extérieur ou bouton fermer.</p>
      </Sheet>
    </div>
  );
}
