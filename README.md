# WORKOUT

Application personnelle de musculation : programme de 12 semaines (Full Body A/B/C), séance active, nutrition, progression.

> État : **phase 2 (fondations) terminée**. Les écrans sont intégrés en phase 3. Plan complet : [`docs/AUDIT.md`](docs/AUDIT.md).

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
