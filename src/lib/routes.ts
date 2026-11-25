/**
 * URL des écrans à identifiant. Paramètres de requête plutôt que segments
 * dynamiques : l'application est exportée en fichiers statiques (app iOS
 * Capacitor) et les identifiants sont créés sur l'appareil.
 */
const q = (path: string, id: string) => `${path}?id=${encodeURIComponent(id)}`;

export const routes = {
  session: (id: string) => q("/session", id),
  sessionSummary: (id: string) => q("/session/summary", id),
  workout: (id: string) => q("/workouts/detail", id),
  workoutEdit: (id: string) => q("/workouts/edit", id),
  exercise: (id: string) => q("/exercises/detail", id),
};
