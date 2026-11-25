"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Retour du lien de confirmation e-mail : échange du code PKCE contre une session (côté client). */
function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Connexion en cours…");

  useEffect(() => {
    const code = params.get("code");
    const next = params.get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    if (!isSupabaseConfigured || !code) {
      router.replace(isSupabaseConfigured ? "/login?error=confirmation" : "/");
      return;
    }
    void import("@/lib/supabase/client").then(async ({ getSupabaseBrowserClient }) => {
      const { error } = await getSupabaseBrowserClient().auth.exchangeCodeForSession(code);
      if (error) {
        setMessage("Lien invalide ou expiré.");
        router.replace("/login?error=confirmation");
      } else router.replace(safeNext);
    });
  }, [params, router]);

  return <p className="text-[14px] text-muted">{message}</p>;
}

export default function Page() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <Logo />
        <Suspense>
          <Callback />
        </Suspense>
      </div>
    </main>
  );
}
