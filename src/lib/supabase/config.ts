/**
 * Détection de la configuration Supabase.
 * Sans URL ni clé publique, l'application fonctionne en mode démo local.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/** Bucket Supabase Storage des photos de progression (privé). */
export const PHOTO_BUCKET = "progress-photos";
