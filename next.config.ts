import type { NextConfig } from "next";

/**
 * Export statique (`out/`) : un même build sert l'hébergement web et l'app
 * iOS Capacitor. Aucune fonctionnalité serveur n'est utilisée — les données
 * vivent dans IndexedDB (démo) ou Supabase (RLS côté base).
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Pas de Cache Components / Partial Prefetching : incompatibles avec
  // l'export statique (« PPR cannot be enabled in export mode »).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
