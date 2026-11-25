# Installer WORKOUT sur son iPhone (sans App Store)

WORKOUT est une vraie app iOS : elle est construite avec **Capacitor** et le site est embarqué dans l'application. Elle fonctionne **hors ligne**, s'ouvre en plein écran et a son icône.

Tu l'installes toi-même depuis ton Mac avec **Xcode** et ton **Apple ID**, sans passer par l'App Store.

## Ce qu'il te faut

| Élément | Où le trouver |
|---|---|
| Un Mac récent | — |
| **Xcode** (gratuit, environ 10 Go) | Mac App Store. Ouvre-le une première fois pour installer les composants supplémentaires. |
| **Node.js 22** (LTS) | https://nodejs.org (installateur macOS) |
| **Git** | Déjà présent avec Xcode. Sinon, `xcode-select --install` dans le Terminal. |
| Un câble USB pour l'iPhone | — |
| Ton **Apple ID** | Le même que sur l'iPhone convient. |

> **Apple ID gratuit :** l'app fonctionne **7 jours**. Ensuite, rebranche l'iPhone et relance l'installation depuis Xcode (étape 6). Tes données sont conservées.
> **Apple Developer Program (99 €/an) :** l'app reste valable 1 an, et TestFlight devient possible.

## 1. Récupérer le projet

Ouvre l'app **Terminal** sur le Mac, puis lance ces commandes une par une :

```bash
git clone https://github.com/caritask7/workoutapp.git
```

```bash
cd workoutapp
```

```bash
git checkout claude/optimistic-ritchie-ey2kzo
```

```bash
npm install
```

## 2. Construire l'app iOS

```bash
npm run ios:sync
```

Cette commande compile l'application (export statique dans `out/`) et la copie dans le projet Xcode (`ios/`).

## 3. Ouvrir le projet dans Xcode

```bash
npm run ios:open
```

Xcode s'ouvre sur le projet **App**. Au premier lancement, il télécharge les dépendances (Capacitor, via Swift Package Manager). Patiente jusqu'à la fin de l'indicateur en haut de la fenêtre.

## 4. Configurer la signature (une seule fois)

1. **Xcode → Réglages… (⌘,) → Comptes** : clique sur **+**, choisis **Apple ID** et connecte-toi.
2. Dans la colonne de gauche, clique sur le projet **App** (icône bleue), puis sur la cible **App**.
3. Ouvre l'onglet **Signing & Capabilities** :
   - coche **Automatically manage signing** ;
   - **Team** : choisis ton nom (**Personal Team**) ;
   - **Bundle Identifier** : remplace `app.workout.personal` par un identifiant unique à toi, par exemple `app.workout.tonprenom`. Un compte gratuit exige un identifiant qui n'est pas déjà pris.

Si un message rouge s'affiche, change légèrement le Bundle Identifier puis réessaie.

## 5. Préparer l'iPhone (une seule fois)

1. Branche l'iPhone au Mac. Sur l'iPhone, réponds **Se fier** à « Se fier à cet ordinateur ? ».
2. Active le **Mode développeur** : **Réglages → Confidentialité et sécurité → Mode développeur**, puis active-le et redémarre l'iPhone.
   L'option n'apparaît qu'après le premier branchement avec Xcode ouvert.

## 6. Installer et lancer

1. En haut de la fenêtre Xcode, choisis **ton iPhone** comme destination (à la place d'un simulateur).
2. Clique sur **▶︎** (ou appuie sur ⌘R).
3. Au premier lancement, iOS affiche « Développeur non approuvé ». Va dans **Réglages → Général → VPN et gestion de l'appareil**, touche ton Apple ID, puis **Faire confiance**.
4. Relance WORKOUT depuis l'écran d'accueil.

L'app reste installée : tu peux débrancher l'iPhone.

## Mettre à jour l'app

Quand une nouvelle version est poussée sur la branche, lance ces commandes dans le dossier `workoutapp` :

```bash
git pull
```

```bash
npm install
```

```bash
npm run ios:sync
```

Puis, dans Xcode, clique de nouveau sur **▶︎** avec l'iPhone branché. Les données sont conservées.

## Tes données

- Sans configuration supplémentaire, l'app est en **mode local** : séances, mesures, repas et photos sont stockés **dans l'app, sur l'iPhone**.
- **Supprimer l'app efface ses données.** Fais régulièrement **Profil → Sauvegarde → Exporter mes données**. La feuille de partage iOS s'ouvre : enregistre le fichier dans **Fichiers** ou **iCloud Drive**.
- Pour restaurer : **Profil → Importer une sauvegarde**, puis choisis ce fichier.

### Et Supabase dans l'app native ?

Le mode compte (Supabase) fonctionne aussi dans l'app : renseigne les variables dans un fichier `.env.local` **avant** `npm run ios:sync`. En revanche, le lien de confirmation envoyé par e-mail s'ouvre dans Safari, pas dans l'app.

Pour l'app native, désactive donc la confirmation d'e-mail dans Supabase (**Authentication → Providers → Email → Confirm email**), ou crée ton compte depuis la version web.

## Dépannage

| Problème | Solution |
|---|---|
| « Untrusted Developer » / « Développeur non approuvé » | Étape 6.3 |
| « Failed to register bundle identifier » | Change le Bundle Identifier (étape 4) |
| L'iPhone n'apparaît pas dans Xcode | Déverrouille-le, accepte « Se fier », vérifie le câble ; Xcode → Window → Devices and Simulators |
| « Developer Mode disabled » | Étape 5.2 |
| L'app ne s'ouvre plus après 7 jours | Apple ID gratuit : rebranche l'iPhone et relance ▶︎ |
| Écran blanc au lancement | Relance `npm run ios:sync` (le dossier `out/` doit exister), puis ▶︎ |
