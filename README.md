# WORKOUT

Application personnelle de musculation : programme de 12 semaines (Full Body A/B/C), séance active, nutrition, progression.

> État : **phase 4 (finitions fonctionnelles) terminée**. Plan complet : [`docs/AUDIT.md`](docs/AUDIT.md).

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
| `npm run foods:import -- fichier.csv` | Importe une table d'aliments de référence (ex. CIQUAL) |

## Base d'aliments

L'application n'invente aucune valeur nutritionnelle. La base démarre vide : chaque aliment est saisi depuis son étiquette, avec un contrôle de cohérence 4/4/9 kcal. Pour charger une table de référence, comme CIQUAL (ANSES) exportée en CSV :

```bash
npm run foods:import -- table.csv
```

- **Colonnes :** `nom;kcal;proteines;glucides;lipides`, plus `fibres`, `ref`, `source` et `unite` en option.
- **Valeurs :** les mentions « traces » et « < x » sont ramenées à 0 et comptées ; les lignes incomplètes sont rejetées.
- **Fichiers générés :** `src/data/seed/foods.generated.json`, chargé en mode démo, et `supabase/migrations/20261125000003_foods_seed.sql`.

## Sauvegarde

Profil → Sauvegarde : export JSON de toutes les données, hors photos et catalogue partagé. En mode démo, l'import remplace les données du navigateur ; le fichier est validé avant toute suppression.

## Installation sur mobile

L'application est installable (manifeste PWA) : ouvrez-la dans le navigateur du téléphone, puis « Ajouter à l'écran d'accueil ». Pendant une séance, l'écran reste allumé si le navigateur le permet (Screen Wake Lock).

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
