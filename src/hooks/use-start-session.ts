"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "./use-data";
import { routes } from "@/lib/routes";

/** Démarre une séance puis ouvre le mode entraînement. */
export function useStartSession() {
  const router = useRouter();
  const mutation = useMutation((s, workoutId: string) => s.sessions.startSession(workoutId), {
    onSuccess: (session) => router.push(routes.session(session.id)),
  });
  return {
    start: mutation.run,
    pending: mutation.pending,
    error: mutation.error,
  };
}
