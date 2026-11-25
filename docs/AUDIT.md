# WORKOUT — Phase 1 : audit et plan d'implémentation

## 1. État du dépôt

| Élément | Constat |
|---|---|
| Code | Aucun. Pas de `package.json` ni de framework installé. Le projet part de zéro. |
| Dossier `design/` | **Absent.** Les maquettes sont à la racine : `home.png`, `workouts.png`, `muscle.png`, `active.png`, `progress.png`, `nutrition.png`, ainsi que `DESIGN.md`. |
| `DESIGN.md` | Design system « Kinetic Obsidian » : tokens (couleurs, typographies, arrondis, espacements) et spécifications des composants. |
| Outillage | Node 22.23, npm 10.9, pnpm 10.28. Le registre npm est accessible. |
| Supabase | Pas configuré (aucune clé, aucun projet). |

Les PNG sont des captures pleine page (largeur de 363 à 613 px, hauteur de 1600 px). Ce ne sont pas des assets séparés : aucun logo, aucun SVG anatomique, aucune photo n'est fournie à part. Le logo est cassé dans les maquettes (texte alternatif « KINETIC Apex Logo »).

## 2. Design system (source : `DESIGN.md`, vérifié au pixel)

`DESIGN.md` se contredit : le texte décrit un fond `#08090B`, des cartes `#1C1D23` et une couleur primaire `#A6FF00`, alors que l'en-tête YAML donne d'autres valeurs. Les pixels des maquettes correspondent à l'en-tête YAML. **J'ai donc retenu l'en-tête comme référence :**

- Fond `#121315` · cartes `#1b1c1e` / `#1f2022` · surfaces hautes `#292a2c` / `#343537`
- Accent lime `#a3fa00` (état pressé `#8edb00`)
- Texte `#e3e2e5` · texte secondaire gris (≈ `#8e92a0`)
- Erreur `#ffb4ab` / `#FF334B` · repos `#00E5FF`
- Polices : Space Grotesk (titres, chiffres, labels en capitales) et Inter (texte courant). Chiffres tabulaires.
- Arrondis : cartes 16–20 px, pastilles en `full`, champs de saisie 8–10 px. Bordures de 1 px, pas d'ombres, sauf un halo lime sur l'élément actif.
- Barre inférieure : flou d'arrière-plan + bordure supérieure. Boutons principaux de 52 px de haut.

## 3. Écrans identifiés

| Maquette | Écran | Contenu principal |
|---|---|---|
| home.png | **Dashboard** | En-tête (logo, badge « WK 04/12 », cloche, avatar) · salutation + semaine/programme · carte objectif poids (actuel, cible, barre %) · séances de la semaine (Lun/Mer/Ven, cochées ou à venir, jours de repos) · carte « Aujourd'hui » (programme, groupes musculaires, nb d'exercices / durée / intensité, CTA « Commencer ») · dernier record battu · anneau des calories + 3 barres de macros |
| workouts.png | **Entraînements** | Programme actif + progression du méso-cycle (12/36) · CTA « Créer un entraînement personnalisé » · cartes FB A/B/C (statut, muscles, nb d'exercices, durée, repos, aperçu des exercices, date de réalisation, tonnage) · tonnage de la semaine vs objectif |
| muscle.png | **Muscle selector** | Bascule face/dos · silhouette avec zones lumineuses et étiquettes · puces des groupes sélectionnés (+ ajout) · réinitialiser · densité estimée (séries totales, ratio push/pull) · CTA « Confirmer la sélection (N groupes) » |
| active.png | **Séance active** | Chrono de séance, bouton Terminer · « Exercice 3 sur 8 » + % du volume · carte de l'exercice (matériel, nom, muscle, schéma d'exécution, tempo) · minuteur de repos (anneau, +30 s, Passer) · tableau des séries (n°, précédent, kg, reps, valider/LOG) · ajouter une série · charge totale · historique · remplacer l'exercice · CTA « Exercice suivant » |
| progress.png | **Progression** | Périodes 7J/30J/3M/6M/1AN · courbe du poids avec ligne cible · tonnage hebdomadaire + anneau · records (squat, couché, terre) · mensurations (poitrine, bras, taille, cuisses) · comparatif photos semaine 1 / semaine N · bilan textuel · CTA « Nouvelle photo » + partage |
| nutrition.png | **Nutrition** | Objectif actif (+300 kcal) · anneau des calories + reste + 3 macros avec % · CTA « Ajouter un aliment » · journal des repas en accordéon (petit-déjeuner, déjeuner, collation, dîner) avec aliments, quantités et kcal · suggestion pour le dîner |

**Écrans sans maquette, à concevoir dans la même identité :** Profil, Fiche exercice, Éditeur d'entraînement (création / modification), Ajout d'aliment (recherche + quantité + saisie manuelle), Objectifs nutritionnels, Historique des séances, Récapitulatif de fin de séance, Connexion / inscription, Saisie du poids et des mensurations.

## 4. Navigation

La barre inférieure comporte 5 onglets : Home · Workouts · Progress · Nutrition · Profile.

- Le Muscle selector dépend de Workouts : il sert à créer un entraînement personnalisé et à filtrer les exercices.
- La séance active est en plein écran, sans barre de navigation, avec un bouton retour qui met la séance en pause.
- Sur ordinateur (≥ 1024 px), la barre inférieure devient une barre latérale. Au-delà de 768 px, les grilles passent en 2 colonnes, et la séance active est en split (exercice et anatomie d'un côté, tableau des séries de l'autre).

Routes (App Router) :
```
/login  /signup
/(app)/                        dashboard
/(app)/workouts                liste + programme
/(app)/workouts/new            éditeur (→ muscle selector)
/(app)/workouts/[id]           détail / édition
/(app)/workouts/muscles        muscle selector
/(app)/exercises/[id]          fiche exercice + historique
/(app)/session/[sessionId]     séance active
/(app)/session/[sessionId]/summary
/(app)/progress   /(app)/progress/history
/(app)/nutrition  /(app)/nutrition/add  /(app)/nutrition/goals
/(app)/profile
```

## 5. Composants réutilisables

`AppShell`, `TopBar`, `BottomNav`/`SideNav`, `Button` (variantes primary / secondary / ghost), `Card`, `Pill`/`Chip`, `ProgressBar`, `ProgressRing`, `StatCard`, `MetricValue` (nombre + unité), `SectionHeader`, `WeekStrip`, `WorkoutCard`, `ExerciseCard`, `SetRow`, `NumberInput`, `RestTimer`, `SessionTimer`, `MuscleSelector` / `BodyMap` (SVG face/dos), `MacroBar`, `MealCard` (accordéon), `PeriodTabs`, `Modal`/`Sheet`, `Input`/`Field`, `EmptyState`, `Skeleton`, `Toast`.

## 6. Architecture

```
src/
  app/                  routes (App Router)
  components/ui/        design system
  components/<feature>/ composants métier
  hooks/                useActiveSession, useRestTimer, useNutritionDay…
  lib/domain/           calculs purs (volume, 1RM Epley, macros, progression)
  lib/validation/       schémas Zod
  services/             couche d'accès aux données (interfaces)
    repositories/local/     adaptateur démo (IndexedDB)
    repositories/supabase/  adaptateur Supabase
  data/seed/            programmes A/B/C, exercices, muscles, profil démo
  types/                types centralisés
supabase/migrations/    schéma SQL + RLS + index
```

**Gestion des données.** Les écrans passent toujours par l'interface `services/`. Si les variables d'environnement Supabase sont présentes, l'application utilise Supabase (Auth, PostgreSQL, RLS). Sinon, elle bascule en **mode démo** : les données sont stockées dans IndexedDB, et une bannière l'indique clairement. On respecte ainsi à la fois « fonctionne sans configuration externe » et « pas de stockage uniquement frontend en production ».

**Schéma SQL.** Il reprend les 15 tables demandées, avec deux ajouts : `progress_photos` (Storage) et `food_sources`. Chaque table de données utilisateur porte un `user_id`, des clés étrangères, des index sur `(user_id, date)` et des politiques RLS `auth.uid() = user_id`. Les catalogues (exercices, muscles, aliments de référence) sont en lecture publique, avec des entrées privées possibles par utilisateur.

**Stack.** Next.js (dernière version stable, App Router), TypeScript strict, Tailwind CSS (tokens repris de `DESIGN.md`), lucide-react, Recharts, @supabase/ssr, Zod, Vitest pour la logique métier, Playwright pour les tests de parcours et de responsive.

## 7. Points ambigus et décisions proposées

1. **Nom et marque.** Les maquettes affichent « KINETIC Apex », le brief dit « WORKOUT », et le logo est cassé. → L'application s'appelle **WORKOUT**. Je crée un logotype texte (Space Grotesk + accent lime) dans l'identité visuelle existante.
2. **Illustrations anatomiques.** La silhouette de `muscle.png` est faite de formes simples (ellipses), peu précise et non découpable. → Je crée un **SVG anatomique face/dos** avec environ 16 zones cliquables : pectoraux, épaules (avant/arrière), biceps, triceps, avant-bras, abdos, obliques, trapèzes, dorsaux, lombaires, fessiers, quadriceps, ischios, adducteurs, mollets. Il suit le style de la maquette (silhouette sombre, zones lime lumineuses, étiquettes flottantes) et les trois niveaux d'intensité du heatmap (1–3, 4–7, 8+ séries).
3. **Photos des maquettes** (avatar, comparatif physique, bol du petit-déjeuner, schéma du développé couché). Elles sont intégrées dans les captures et basse résolution. → Je ne les découpe pas. Remplacements :
   - avatar : initiales ou photo téléversée ;
   - comparatif : **photos réelles de l'utilisateur** (Supabase Storage, ou IndexedDB en démo), avec un état vide tant qu'il n'y en a pas ;
   - illustration de chaque exercice : schéma SVG par type de mouvement (même style que la maquette : grille, trait lime, angle) et carte des muscles sollicités.
4. **Fonctions « IA » ou non vérifiables affichées dans les maquettes :** « Bilan biologique », « Suggestion intelligente », « BF estimé », « Apex bio-sync », « Synchro balance », « Scanner ». Le brief interdit les fausses fonctionnalités. Traitement proposé :
   - suggestion du dîner → **règle déterministe** (macros restantes) ;
   - bilan → phrase générée à partir des vraies variations de poids et de tour de taille ;
   - BF → affiché seulement si l'utilisateur le saisit ;
   - 1RM → formule d'Epley, présentée comme une estimation ;
   - scanner de code-barres → retiré, le bouton devient « Ajouter un aliment » ;
   - labels marketing (« bio-sync »…) → supprimés.
5. **Base d'aliments.** Les valeurs nutritionnelles doivent venir d'une source identifiée. → La base initiale sera importée de **CIQUAL (ANSES)**, avec la source et le code affichés sur chaque aliment, à condition que le téléchargement passe le proxy réseau. Sinon, la base démarrera vide de valeurs, avec saisie manuelle et aliments personnalisés. Aucune valeur ne sera inventée.
6. **Écarts de données entre maquettes et brief.** Par exemple « Squat 4×8-10 » dans la maquette contre 3×8-10 dans le brief, ou une cible à 77 kg contre 76–78 kg. → **Le brief fait foi.** Les nombres des maquettes (72,4 kg, 25 550 kg…) ne sont que des exemples : tout est calculé à partir des données enregistrées, et les états vides s'affichent au premier lancement.
7. **Programme de 12 semaines.** Rotation A/B/C sur Lun/Mer/Ven (modifiable dans le profil). La semaine courante (« WK 04/12 ») et la progression du méso-cycle (x/36) sont calculées à partir de la date de début et des séances réalisées.
8. **Indicateurs RPE, tempo, intensité.** Ce sont des champs optionnels de l'exercice ou de la série. Ils ne sont affichés que s'ils sont renseignés.

## 8. Plan d'exécution

| Phase | Livrables |
|---|---|
| 2 — Fondations | Scaffold Next.js + Tailwind avec les tokens, polices, composants `ui/`, types, schémas Zod, interface des repositories + adaptateur démo, seeds (exercices, muscles, programmes A/B/C, profil démo), migrations SQL + RLS, client Supabase + middleware d'authentification |
| 3 — Intégration UI | Shell responsive, puis les 6 écrans maquettés fidèlement, puis les écrans sans maquette |
| 4 — Fonctionnel | CRUD des entraînements · muscle selector SVG · séance active (saisie, minuteur de repos automatique, pause/reprise persistée, récapitulatif, records) · nutrition (recherche, quantité, calcul, repas, historique, objectifs) · statistiques (Recharts, périodes) · profil |
| 5 — Tests | Tests unitaires Vitest des calculs · parcours Playwright (séance complète, ajout d'aliment, persistance après rechargement) · captures 375 / 768 / 1280 px |
| 6 — Finalisation | Lint, typecheck, `next build`, README (installation, mode démo, mise en place de Supabase) |
