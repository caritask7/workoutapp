"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "./config";

let client: SupabaseClient | null = null;

/** Client Supabase navigateur (singleton). Lève une erreur en mode démo. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase n'est pas configuré : l'application est en mode démo.");
  }
  client ??= createBrowserClient(supabaseUrl, supabaseKey);
  return client;
}
