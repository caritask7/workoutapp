"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/ui";
import { programWeek } from "@/lib/domain/training";
import { useToday } from "@/hooks/use-clock";
import { useData } from "@/hooks/use-data";
import { useDataContext } from "@/providers/data-provider";
import { NAV_ITEMS, currentSection, isActive } from "./nav-items";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:flex">
      <Suspense fallback={<SideNav pathname={null} />}>
        <SideNavWithPath />
      </Suspense>
      <div className="min-w-0 flex-1">
        <TopBar />
        <main id="contenu" className="mx-auto w-full max-w-6xl px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] md:px-8 lg:pb-12">
          {children}
        </main>
      </div>
      <Suspense fallback={<BottomNav pathname={null} />}>
        <BottomNavWithPath />
      </Suspense>
    </div>
  );
}

/* La lecture de l'URL est isolée sous <Suspense> (Cache Components) : la
   coquille statique affiche la navigation sans onglet actif. */
function SideNavWithPath() {
  return <SideNav pathname={usePathname()} />;
}
function BottomNavWithPath() {
  return <BottomNav pathname={usePathname()} />;
}
function SectionLabel() {
  return <>{currentSection(usePathname())?.label ?? ""}</>;
}

function ProgramWeekBadge() {
  const { data: program } = useData((s) => s.workouts.getActiveProgram());
  const today = useToday();
  if (!program || !today) return null;
  const week = programWeek(program.startDate, today, program.durationWeeks);
  return (
    <span
      className="inline-flex h-7 items-center rounded-full bg-lime/12 px-2.5 font-display text-[11px] font-bold tracking-[0.06em] text-lime tabular"
      title={`Semaine ${week} sur ${program.durationWeeks} du programme`}
    >
      WK {String(week).padStart(2, "0")}/{program.durationWeeks}
    </span>
  );
}

function Avatar() {
  const { data: profile } = useData((s) => s.profile.getProfile());
  const initials = (profile?.displayName ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <Link
      href="/profile"
      aria-label="Profil"
      className="grid size-10 place-items-center rounded-full border border-lime/40 bg-surface-3 font-display text-[14px] font-bold text-ink-strong"
    >
      {initials || "?"}
    </Link>
  );
}

function TopBar() {
  const { mode } = useDataContext();
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line/60 glass-bar">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 lg:hidden" aria-label="Accueil WORKOUT">
          <Logo />
        </Link>
        <p className="hidden text-label-caps text-muted lg:block">
          <Suspense fallback={null}>
            <SectionLabel />
          </Suspense>
        </p>
        <div className="flex items-center gap-2.5">
          {mode === "demo" && (
            <span className="hidden h-7 items-center rounded-full border border-line-strong px-2.5 text-label-caps text-subtle sm:inline-flex" title="Données enregistrées dans ce navigateur uniquement">
              Démo locale
            </span>
          )}
          <ProgramWeekBadge />
          <Avatar />
        </div>
      </div>
    </header>
  );
}

function BottomNav({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Navigation principale" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line glass-bar lg:hidden">
      <ul className="mx-auto grid h-[72px] max-w-xl grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = pathname !== null && isActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 transition-colors",
                  active ? "text-lime" : "text-muted hover:text-ink-strong",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden />
                <span className="text-[10.5px] font-display font-semibold tracking-[0.06em] uppercase">{item.label}</span>
                {active && <span aria-hidden className="absolute bottom-1.5 size-1 rounded-full bg-lime" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SideNav({ pathname }: { pathname: string | null }) {
  return (
    <aside className="safe-top sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface-lowest/60 px-4 py-6 lg:flex">
      <Link href="/" className="mb-10 px-2" aria-label="Accueil WORKOUT">
        <Logo />
      </Link>
      <nav aria-label="Navigation principale">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname !== null && isActive(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-xl px-3 font-display text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors",
                    active ? "bg-lime/12 text-lime" : "text-muted hover:bg-surface-3 hover:text-ink-strong",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
