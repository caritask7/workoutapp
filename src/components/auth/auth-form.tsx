"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button, Card, Field, InlineError, Input, Logo } from "@/components/ui";
import { fieldErrors } from "@/lib/validation/schemas";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide."),
  password: z.string().min(8, "8 caractères minimum."),
});
const signupSchema = loginSchema.extend({
  displayName: z.string().trim().min(1, "Nom requis.").max(40),
});

/** Connexion / inscription (Supabase Auth, e-mail + mot de passe). */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(params.get("error") ? "Le lien de confirmation est invalide ou expiré." : null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  // Mode démo : pas de compte. Session déjà ouverte : inutile de se reconnecter.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      router.replace("/");
      return;
    }
    void getSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) router.replace(safeNext);
      });
  }, [router, safeNext]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = (mode === "login" ? loginSchema : signupSchema).safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setError(null);
    setPending(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (err) throw err;
        router.replace(safeNext);
        router.refresh();
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { display_name: form.displayName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (err) throw err;
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setInfo("Compte créé. Confirmez votre adresse via le lien reçu par e-mail, puis connectez-vous.");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(/invalid login/i.test(message) ? "E-mail ou mot de passe incorrect." : message || "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="safe-top mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <Logo className="self-center" />
      <Card>
        <h1 className="text-headline-lg text-ink-strong">{mode === "login" ? "Connexion" : "Créer un compte"}</h1>
        <p className="mt-1 mb-5 text-[14px] text-muted">
          {mode === "login" ? "Retrouvez vos séances, mesures et repas." : "Vos données sont privées et protégées par compte."}
        </p>
        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
          {mode === "signup" && (
            <Field label="Nom" error={errors.displayName}>
              {(p) => <Input autoComplete="name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} {...p} />}
            </Field>
          )}
          <Field label="E-mail" error={errors.email}>
            {(p) => <Input type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} {...p} />}
          </Field>
          <Field label="Mot de passe" error={errors.password}>
            {(p) => (
              <Input
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                {...p}
              />
            )}
          </Field>
          <InlineError message={error} />
          {info && <p role="status" className="rounded-xl bg-lime/10 px-3 py-2.5 text-[13px] text-lime">{info}</p>}
          <Button type="submit" size="lg" block loading={pending}>
            {mode === "login" ? "Se connecter" : "Créer mon compte"}
          </Button>
        </form>
      </Card>
      <p className="text-center text-[14px] text-muted">
        {mode === "login" ? "Pas encore de compte ? " : "Déjà inscrit ? "}
        <Link href={mode === "login" ? "/signup" : "/login"} className="text-lime hover:underline">
          {mode === "login" ? "Créer un compte" : "Se connecter"}
        </Link>
      </p>
    </main>
  );
}
