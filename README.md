# WORKOUT

Application personnelle de musculation : programme de 12 semaines (Full Body A/B/C), séance active, nutrition, progression.

> État : **phase 3 (intégration des écrans) terminée**. Plan complet : [`docs/AUDIT.md`](docs/AUDIT.md).

## Écrans

| Route | Écran |
|---|---|
| `/` | Tableau de bord : poids cible, semaine, prochaine séance, dernier record, nutrition |
| `/workouts` | Programme 12 semaines, séances de la semaine, entraînements personnalisés, tonnage |
| `/workouts/muscles` | Ciblage anatomique (SVG face / dos) → séance proposée |
| `/workouts/new`, `/workouts/[id]`, `/workouts/[id]/edit` | Création, détail, modification d'un entraînement |
| `/session/[id]` | Mode entraînement : séries, repos automatique, pause / reprise |
| `/session/[id]/summary` | Récapitulatif de séance et records battus |
| `/exercises/[id]` | Fiche exercice : exécution, muscles, consignes, historique des charges |
| `/progress`, `/progress/history` | Poids, volume, records, charges, mensurations, photos, historique |
| `/nutrition` | Journal des repas, macros, aliments, objectifs |
| `/profile` | Profil, jours d'entraînement, préférences, données |
| `/login`, `/signup` | Authentification (mode Supabase uniquement) |
| `/design-system` | Référence des composants (outil de développement) |

## Démarrage

```bash
npm install
npm run dev
```

Sans configuration, l'application tourne en **mode démo** : les données sont stockées dans IndexedDB, dans le navigateur.

## Supabase (optionnel)

1. Créer un projet Supabase et appliquer les migrations de `supabase/migrations/` (`supabase db push`, ou les coller dans l'éditeur SQL).
2. Copier `.env.example` vers `.env.local` et renseigner l'URL et la clé publique du projet.

Chaque table utilisateur est protégée par RLS. Les photos de progression sont stockées dans le bucket privé `progress-photos`.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | Types des routes + `tsc` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (calculs métier + services sur IndexedDB) |
| `npm run db:seed-sql` | Régénère la migration du catalogue depuis `src/data/seed` |

## Architecture

```
src/app/(app)/        routes (App Router), coquille + navigation
src/components/ui/    design system « Kinetic Obsidian » (DESIGN.md)
src/lib/domain/       calculs purs (volume, 1RM, macros, semaines)
src/lib/validation/   schémas Zod
src/services/         logique métier ; data/ = drivers IndexedDB et Supabase
src/data/seed/        muscles, exercices, programmes, profil démo
supabase/migrations/  schéma, index, RLS, Storage, catalogue
```
