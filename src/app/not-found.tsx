import { ButtonLink, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <p className="text-display-hero text-lime">404</p>
      <h1 className="text-headline-md text-ink-strong">Page introuvable</h1>
      <p className="text-[14px] text-muted">Cette page n&apos;existe pas ou a été supprimée.</p>
      <ButtonLink href="/">Retour à l&apos;accueil</ButtonLink>
    </main>
  );
}
