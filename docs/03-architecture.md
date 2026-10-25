# 03 : Architecture

## Principe directeur

**La simulation ne connaît pas le rendu.** Elle expose un état (données pures) et accepte des commandes.
Le rendu, l'UI et les entrées sont des « clients » de cette simulation. Cette séparation permet :

- de tester le jeu sous Node sans navigateur ;
- de déplacer la simulation dans un Web Worker, voire de la réécrire en Rust/WASM plus tard ;
- de sauvegarder / recharger / rejouer une partie (état + seed + commandes).

```
 Entrées (souris, tactile, clavier)
          │  produisent des intentions
          ▼
   input/ ──► commandes ──► sim/ (tick fixe 10 Hz) ──► état + événements
                                                      │
                          ┌───────────────────────────┤
                          ▼                           ▼
                     render/ (Three.js)           ui/ (DOM)
                  lit l'état, interpole        lit l'état, émet des commandes
```

## Arborescence

```
menagerie/
├─ CLAUDE.md  README.md
├─ docs/
├─ public/assets/            modèles glTF, icônes, audio, CREDITS.md
├─ src/
│  ├─ main.ts                point d'entrée : assemble sim, render, ui, input
│  ├─ sim/                   ⚠ TypeScript pur (aucun import three / DOM)
│  │  ├─ simulation.ts       boucle de tick, application des commandes, émission d'événements
│  │  ├─ state.ts            types de l'état global (sérialisable)
│  │  ├─ commands.ts         types et validation des commandes
│  │  ├─ events.ts           événements sortants (animal né, visiteur parti, etc.)
│  │  ├─ rng.ts              PRNG seedé (ex. mulberry32)
│  │  ├─ world/              grille, tuiles, détection d'enclos (flood fill)
│  │  ├─ entities/           création / helpers pour animaux, visiteurs, bâtiments
│  │  ├─ systems/            needs, habitat, visitors, pathfinding, economy, rating, objectives, time
│  │  └─ data/               species.ts, buildings.ts, balance.ts
│  ├─ render/                Three.js
│  │  ├─ renderer.ts         scène, lumières, boucle de rendu, interpolation
│  │  ├─ camera.ts           caméra orthographique isométrique
│  │  ├─ terrain.ts          maillage du sol par chunks 16×16
│  │  ├─ views/              animalView, visitorView, buildingView, fenceView
│  │  ├─ assets.ts           registre d'assets + repli procédural
│  │  ├─ picking.ts          rayon → tuile de la grille
│  │  └─ fx/                 icônes d'humeur, particules, sélection
│  ├─ ui/                    DOM : barre d'outils, panneaux, argent, objectifs
│  │  └─ i18n/fr.ts
│  ├─ input/                 abstraction souris / tactile / clavier → intentions
│  └─ persistence/           sauvegarde, chargement, migrations
└─ tests/
   └─ sim/                   tests Vitest de la simulation
```

## Simulation

### État

Un seul objet `GameState`, de la donnée pure :

```ts
interface GameState {
  saveVersion: number;
  tick: number;
  rngState: number;
  money: number;
  ticketPrice: number;
  world: { width: number; height: number; tiles: Uint8Array; fences: FenceSet };
  enclosures: Record<EnclosureId, Enclosure>;
  animals: Record<AnimalId, Animal>;
  visitors: Record<VisitorId, Visitor>;
  buildings: Record<BuildingId, Building>;
  stats: ZooStats; // note, visiteurs du jour, historique 7 jours
  objectives: ObjectiveState[];
}
```

Règles : références par **id** (jamais d'objet imbriqué partagé), ids stables et croissants,
pas de fonctions dans l'état.

### Commandes

Toute action du joueur est une commande validée puis appliquée entre deux ticks, au tick courant (ADR-015) :

`PlacePath`, `PlaceFence`, `PaintBiome`, `PlaceBuilding`, `Demolish`, `BuyAnimal`, `SetTicketPrice`, `SetSpeed`…

Une commande retourne `ok` ou une erreur lisible (argent insuffisant, tuile occupée…) que l'UI affiche.
Les commandes sont de la donnée : elles peuvent être journalisées pour du replay et des tests.

### Systèmes

Fonctions `(state, ctx) => void` exécutées dans un ordre fixe à chaque tick :

1. `time` : jour/nuit, début et fin de journée
2. `enclosures` : recalcul des enclos si la géométrie a changé
3. `habitat` : score d'habitat (recalculé uniquement quand l'enclos change)
4. `animalNeeds` : faim, soif, bien-être, santé, états
5. `animalMovement` : errance dans l'enclos (déplacement libre sur ses tuiles)
6. `visitorSpawn` : arrivées selon la note et le prix
7. `visitorAI` : machine à états, choix de cibles
8. `pathfinding` : A* sur la grille des chemins (avec cache, budget par tick)
9. `economy` : revenus, dépenses, fin de journée
10. `rating` : note du zoo
11. `objectives` : progression et défaite

Budget : si le pathfinding dépasse son budget de tick, les requêtes restantes sont différées au tick suivant.

### Temps et vitesse

Une boucle d'accumulation : `accumulator += realDelta × speed` ; tant que `accumulator ≥ 100 ms`, on exécute un tick.
Plafond de ticks par frame pour éviter la spirale (ex. 8).

## Rendu

- **Caméra** : `OrthographicCamera`, orientation isométrique classique (45° en azimut, ~35° d'élévation),
  zoom borné, déplacement (pan), rotation par pas de 90°.
- **Terrain** : un maillage par chunk de 16×16 tuiles, reconstruit uniquement quand un chunk change.
- **Clôtures, chemins, décor** : `InstancedMesh` (modèles non animés).
- **Animaux et visiteurs (modèles animés)** : `SkeletonUtils.clone` + `AnimationMixer` par entité au POC.
  Optimisation prévue plus tard (voir roadmap suite).
- **Interpolation** : chaque vue lit `prevPosition` et `position` de l'entité et interpole selon la fraction de tick
  écoulée, pour un mouvement fluide à 60 fps malgré 10 Hz.
- **Lumières** : lumière hémisphérique + lumière directionnelle avec ombres douces (shadow map 2048),
  teinte qui varie avec le cycle jour/nuit.
- **Picking** : rayon caméra → plan du sol → coordonnées de tuile ; survol surligné, aperçu de placement
  (vert valide / rouge invalide).

### Registre d'assets

```ts
getModel(modelId: string): Object3D   // charge le glTF s'il existe, sinon fabrique un modèle procédural
```

Le modèle procédural est un assemblage simple de primitives, **distinctif par espèce** (couleurs, proportions,
détails clés comme les rayures, la crinière, le cou long) : le jeu reste lisible sans aucun asset externe.

## UI

DOM en surimpression du canvas (barre d'outils en bas, ressources en haut, panneau d'inspection à droite
ou en feuille basse sur petit écran). L'UI ne mute jamais l'état : elle émet des commandes et lit l'état.
Textes via clés i18n dès le départ.

## Entrées

`input/` traduit souris / tactile / clavier en **intentions** (`pan`, `zoom`, `rotate`, `hoverTile`, `confirm`, `cancel`).
Le reste du code ne connaît pas le périphérique : la prise en charge du tactile ne demandera pas de réécriture.

## Sauvegarde

`serialize(state) → JSON` avec `saveVersion`. Chargement : migration successive `vN → vN+1` jusqu'à la version courante.
Les tableaux typés (`tiles`) sont encodés en base64 ou en tableau compact.

## Performance : repères

- Cible : 60 fps desktop, 30 fps mobile milieu de gamme avec ~40 animaux et ~150 visiteurs.
- Pas d'allocation dans les boucles chaudes (tick, rendu) quand c'est évitable.
- Mesurer avant d'optimiser : un compteur de FPS et de temps de tick est affiché en mode debug (`?debug`).

## Tests

- Vitest sur `src/sim/` : enclos, habitat, besoins, économie, pathfinding, sauvegarde aller-retour.
- Test de **déterminisme** : même seed + mêmes commandes = même état après N ticks.
- Test de **non-régression d'équilibrage** : scénario scripté (zoo type) qui doit rester rentable.
- Le rendu et l'interface sont vérifiés par **captures d'écran automatisées** (Playwright) revues par Claude Code, et par des tests
  d'accessibilité (axe-core) : voir `09-verification-visuelle-et-accessibilite.md`.
- Une API de debug `window.__game` (dev/test uniquement) permet de charger un scénario seedé, d'avancer de N ticks et de figer le temps.
  Elle est exclue du build de production.
