# CLAUDE.md : Ménagerie

Jeu de gestion de zoo, low poly isométrique, TypeScript + Three.js + Vite.
Contexte complet dans `docs/`. Lire `docs/03-architecture.md` avant toute modification de structure.

## Commandes

```bash
npm run dev      # dev server
npm run test     # vitest (simulation)
npm run check    # biome + tsc --noEmit + vitest : à lancer avant chaque commit
npm run build    # build prod
npm run test:e2e # Playwright : scénarios + accessibilité (axe)
npm run shots    # captures d'écran pour la revue visuelle
```

## Règles d'architecture (non négociables)

1. **`src/sim/` est du TypeScript pur** : aucun import de `three`, du DOM, de `window`, ni de `document`.
   La simulation doit tourner sous Node (tests) et plus tard dans un Web Worker.
2. **Le rendu ne modifie jamais l'état.** `src/render/` lit l'état et affiche. Toute action du joueur
   passe par une **commande** (`src/sim/commands.ts`) appliquée par la simulation.
3. **Pas de `Math.random()` ni de `Date.now()` dans `src/sim/`.** Utiliser le PRNG seedé (`sim/rng.ts`)
   et le compteur de ticks.
4. **L'état de simulation est de la donnée sérialisable** (objets simples, pas de classes avec méthodes
   cachées, pas de références croisées : utiliser des ids). Il doit pouvoir être sauvegardé en JSON.
5. **Tout le contenu de jeu est piloté par des données** (`src/sim/data/` : espèces, bâtiments, équilibrage).
   Ajouter une espèce = ajouter une entrée de données, pas du code.
6. **Tick fixe à 10 Hz.** Le rendu interpole entre deux états. Les vitesses de jeu (×1, ×2, ×4) changent
   le nombre de ticks par seconde réelle, jamais la durée d'un tick.
7. **Modèles 3D via le registre d'assets** (`src/render/assets.ts`) avec repli procédural : le jeu doit
   rester jouable si un modèle manque.

## Conventions

- Identifiants de code en **anglais** ; commentaires, docs et textes de jeu en **français**.
- Textes visibles par le joueur dans `src/ui/i18n/fr.ts` (clés), jamais en dur dans les composants.
- TypeScript `strict`, pas de `any` sans commentaire justifiant.
- Fichiers courts et ciblés. Une fonction de système = une responsabilité.
- Chaque système de simulation a au moins un test Vitest (`tests/sim/`).
- Pas de nouvelle dépendance sans en discuter : privilégier le code maison tant que c'est simple.
- Commits petits, format `feat(sim): ...`, `fix(render): ...`, `docs: ...`, `chore: ...`.

## Méthode de travail

- Travailler **par itération** (`docs/05-roadmap-poc.md`). Ne pas anticiper l'itération suivante.
- La commande **`/jalon-suivant`** (`.claude/commands/jalon-suivant.md`) enchaîne automatiquement : choix de l'itération, plan, code, vérification, clôture, compte rendu.
- Avant de coder une itération : relire ses critères d'acceptation, proposer un plan court, puis implémenter.
- Une itération est terminée quand tous ses critères sont cochés **et** que `npm run check` et `npm run test:e2e` passent **et** que la revue des captures (`docs/09-verification-visuelle-et-accessibilite.md`) est faite.
- Mettre à jour la case de statut dans `README.md` et ajouter une entrée dans `docs/08-decisions.md`
  pour toute décision structurante.
- En cas de doute entre « simple et jouable » et « générique et élégant » : choisir simple, noter la dette
  dans `docs/06-roadmap-suite.md`.

## Vérification visuelle et accessibilité

Voir `docs/09-verification-visuelle-et-accessibilite.md`. En résumé :

- **Regarde le jeu.** Dès qu'il y a du rendu ou de l'UI, lance `npm run shots`, ouvre les captures et compare-les à la grille de revue
  (cohérence, lisibilité, lisibilité ludique, interface). Corrige, relance, 3 boucles maximum.
- Utilise l'API `window.__game` (dev/test uniquement) et les scénarios seedés de `tests/e2e/scenarios/` pour des captures reproductibles.
- Accessibilité : zéro violation axe serious/critical, navigation clavier, zones tactiles ≥ 44 px, **jamais la couleur seule**
  (icône + forme + couleur), respect de `prefers-reduced-motion`.
- Écris `artifacts/review/<iteration>.md` (verdict par capture). Les captures et revues ne sont pas versionnées.
- Les captures ne remplacent pas un playtest humain : signale tes doutes sur le « fun » au lieu de trancher.

## Pièges connus

- Les modèles animés (skinned) ne s'instancient pas avec `InstancedMesh`. Au POC : `SkeletonUtils.clone`
  + `AnimationMixer` par entité (OK jusqu'à quelques centaines). L'optimisation (animation par texture de
  vertex) est prévue dans la roadmap suite.
- Three.js évolue vite : vérifier la version installée et sa doc avant d'utiliser une API non triviale.
- Mobile : tous les contrôles doivent être utilisables au tactile (abstraction dans `src/input/`).
