import type { MetadataRoute } from "next";

/** Installation sur l'écran d'accueil (usage quotidien à la salle). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WORKOUT",
    short_name: "WORKOUT",
    description: "Programme de musculation, séances, nutrition et progression.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#121315",
    theme_color: "#121315",
    lang: "fr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
