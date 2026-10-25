# 08 : Journal des décisions

Format court : contexte, décision, conséquences. On ajoute une entrée à chaque décision structurante
(et on ne réécrit pas l'historique : on ajoute une entrée qui remplace l'ancienne).

---

## ADR-001 : TypeScript + Three.js + Vite plutôt que Rust/Bevy ou Godot

- **Statut** : accepté
- **Contexte** : objectif = POC jouable vite et déployable partout (navigateur, desktop, mobile).
- **Décision** : TypeScript strict, Three.js pour le rendu, Vite pour le build.
- **Conséquences** : déploiement par simple lien web ; écosystème très bien connu de Claude et de l'équipe ;
  pas d'éditeur visuel (on s'en passe grâce à la direction artistique procédurale) ; performances suffisantes
  pour l'échelle du POC. Rust/WASM reste possible plus tard pour la simulation seule (ADR-008).

## ADR-002 : Séparation stricte simulation / rendu

- **Statut** : accepté
- **Décision** : `src/sim/` en TypeScript pur, sans three ni DOM ; le rendu lit l'état, l'UI émet des commandes.
- **Conséquences** : tests sous Node, déterminisme, sauvegarde simple, Web Worker et WASM envisageables. Un peu plus de
  code de « colle » (interpolation, vues) mais énorme gain de maintenabilité.

## ADR-003 : Tick fixe à 10 Hz avec interpolation au rendu

- **Statut** : accepté
- **Décision** : la simulation avance par pas de 100 ms ; le rendu interpole entre deux états.
- **Conséquences** : comportement indépendant du framerate, vitesses ×2/×4 = plus de ticks par seconde, pas de dérive.

## ADR-004 : Pas de bibliothèque ECS au POC

- **Statut** : accepté, à réévaluer en V0.6
- **Décision** : entités stockées en dictionnaires typés (`Record<Id, Entity>`) et systèmes en fonctions.
- **Conséquences** : simple à lire, à sérialiser et à tester. Si les boucles sur entités deviennent un goulot, on migrera
  vers un ECS (bitECS ou autre) ; l'état par id facilite cette migration.

## ADR-005 : UI en DOM natif

- **Statut** : accepté
- **Décision** : panneaux et barres d'outils en HTML/CSS au-dessus du canvas, sans framework initialement.
- **Conséquences** : accessibilité et styles gratuits ; à reconsidérer (Preact/Lit) si l'UI devient riche.

## ADR-006 : Registre d'assets avec repli procédural

- **Statut** : accepté
- **Décision** : tout modèle est demandé par id ; si le glTF manque, un modèle procédural distinctif est généré.
- **Conséquences** : le jeu est jouable dès l'itération 1 sans asset externe ; on peut remplacer les modèles espèce
  par espèce.

## ADR-007 : Biome (lint/format) et Vitest (tests)

- **Statut** : accepté
- **Décision** : un seul outil de lint+format rapide, Vitest pour les tests (intégré à Vite).

## ADR-008 : Rust/WASM pour la simulation, reporté

- **Statut** : reporté
- **Contexte** : Rust a été envisagé au départ pour la performance.
- **Décision** : ne pas l'utiliser au POC. La séparation sim/rendu permet de l'introduire plus tard
  uniquement si le profilage le justifie (pathfinding, IA de foule).

## ADR-009 : Animation des entités au POC via `AnimationMixer`

- **Statut** : accepté, dette connue
- **Contexte** : `InstancedMesh` ne gère pas nativement les modèles animés par squelette.
- **Décision** : clonage par `SkeletonUtils` + un mixer par entité (suffisant pour quelques centaines d'entités).
- **Conséquences** : optimisation prévue en V0.6 (texture de vertex, billboards à distance).

## ADR-010 : Vérification visuelle par captures d'écran (Playwright) et accessibilité intégrée

- **Statut** : accepté
- **Contexte** : la lisibilité est le pilier n°1 ; les tests unitaires ne la mesurent pas. Claude Code peut examiner des images.
- **Décision** : scénarios seedés + API `window.__game` (dev/test), captures Playwright revues avec une grille (cohérence, lisibilité,
  lisibilité ludique, interface), tests axe-core pour le DOM, simulation de daltonisme pour le rendu 3D.
- **Conséquences** : un peu d'outillage en itération 0 ; revue visuelle obligatoire en fin d'itération ; le « fun » reste tranché par un humain.


## ADR-011 : Versions de l'outillage et garde d'architecture à trois niveaux
- **Statut** : accepté (itération 0)
- **Contexte** : mise en place du projet en octobre 2026 ; la règle n° 1 (sim pure) doit être vérifiée automatiquement.
- **Décision** : Vite 8 (Rolldown), TypeScript 7, Vitest 5, Biome 2.6, Playwright 1.64, three r186. Trois configurations
  TypeScript : `tsconfig.json` (navigateur), `tsconfig.sim.json` (`src/sim/` compilé **sans lib DOM**),
  `tsconfig.node.json` (configs et tests). Garde de `src/sim/` à trois niveaux : Biome (`noRestrictedImports`,
  `noRestrictedGlobals`), tsc sans DOM, test Vitest `tests/sim/architecture.test.ts` (three, DOM, `Math.random`, `Date.now`).
- **Conséquences** : une violation casse `npm run check`. `@types/node` ajouté pour l'outillage uniquement.
  three r186 a retiré `PCFSoftShadowMap` : on utilise `PCFShadowMap`.

## ADR-012 : Biome ne formate pas le Markdown
- **Statut** : accepté (itération 0)
- **Contexte** : Biome 2.6 formate aussi le Markdown. Il a transformé une ligne de continuation commençant par `+`
  en élément de liste (changement de sens dans `CLAUDE.md`) et réaligné tous les tableaux.
- **Décision** : `**/*.md` exclu de Biome. La documentation reste écrite à la main.

## ADR-013 : API de debug et scénarios de test
- **Statut** : accepté (itération 0)
- **Décision** : `window.__game` vit dans `src/debug/gameApi.ts`, chargé par `import()` derrière `import.meta.env.DEV`
  (absent du build de production, vérifié). Les scénarios seedés sont définis dans `tests/e2e/scenarios/` et importés par
  cette API. Les tests Playwright tournent contre le serveur de dev ; les captures se prennent sans `?debug`
  (l'overlay de FPS n'est pas l'interface du joueur) et `freezeTime()` ramène les animations décoratives à t = 0.
- **Conséquences** : captures reproductibles ; le build de production n'est pas couvert par les tests e2e (vérifié à la main).

## ADR-014 : Hébergement sur GitHub Pages
- **Statut** : accepté (itération 0) ; dépôt public `Majimo/Menagerie`, site https://majimo.github.io/Menagerie/
- **Contexte** : GitHub Pages n'est pas disponible sur un dépôt privé avec un compte gratuit ; le dépôt a été rendu public.
- **Décision** : workflow `.github/workflows/deploy.yml` (check, build, publication) ; `base` fixé par la variable
  `BASE_PATH` (`/<nom-du-repo>/` en CI, `/` par défaut) ; Three.js isolé dans un chunk `three` (~130 ko gzip).
- **Conséquences** : bascule vers Cloudflare Pages ou Netlify possible sans changer le code (seulement `BASE_PATH`).

## ADR-015 : Commandes appliquées immédiatement, entre deux ticks
- **Statut** : accepté (itération 1) ; remplace « appliquée au prochain tick » de `03-architecture.md`
- **Contexte** : construire doit marcher en pause (itération 2) et l'aperçu doit refléter l'état juste après l'action.
- **Décision** : `dispatchCommand` valide et applique la commande tout de suite, au tick courant, puis met à jour les enclos.
  `validateCommand` est pure et sert aussi à l'aperçu de placement.
- **Conséquences** : déterminisme préservé (une partie = seed + liste de (tick, commande)) ; pas de file de commandes à gérer.

## ADR-016 : Représentation du monde et détection d'enclos
- **Statut** : accepté (itération 1)
- **Décision** : tuiles en `number[]` (indice dans `TILE_TYPES`), clôtures sur les arêtes en deux tableaux 0/1
  (`fencesH` : bord nord de chaque tuile, `fencesV` : bord ouest), sérialisables tels quels en JSON. Un enclos est une zone
  reliée sans traverser de clôture qui ne s'ouvre pas sur le bord de carte (le bord n'est pas une clôture, mais on peut y en
  poser). Il garde son id si la nouvelle zone reprend la majorité de ses tuiles. `enclosureOf` (tuile → enclos) est stocké
  pour un survol en O(1) et recalculé seulement quand les clôtures changent.
- **Conséquences** : ~7 000 nombres dans l'état pour 48×48, négligeable ; base64 possible plus tard si la sauvegarde grossit.

## ADR-017 : Interaction de construction
- **Statut** : accepté (itération 1)
- **Décision** : chemin = ligne droite selon l'axe dominant ; biome = rectangle ; clôture = arête la plus proche, ou contour du
  rectangle entre deux coins de tuiles en glissant ; démolir = clôture proche du pointeur ou chemin, rectangle en glissant,
  50 % remboursés. Aperçu : ✓ sur fond plein, ✗ sur hachures à bord pointillé, symboles tournés pour rester droits à l'écran,
  dessinés par-dessus le décor. Coût et raison du refus dans une info-bulle avant de relâcher ; message `aria-live` après.
  Souris : clic gauche construit si un outil est actif, sinon déplace ; tactile : un doigt construit ou déplace, deux doigts
  déplacent et zooment ; clavier : flèches/ZQSD, +/−, A/E, Échap.
- **Conséquences** : un enclos se ferme en un seul geste. Le « fun » du geste reste à valider en playtest.

## ADR-018 : Performance de la carte pleine
- **Statut** : constaté (itération 1)
- **Contexte** : critère « 60 fps sur la carte pleine ».
- **Mesure** : scénario `full-map` (36 enclos, 1 008 clôtures, toutes les tuiles peintes), 1920×1080, Chromium avec GPU
  (ANGLE Metal, Apple M3 Pro) : 60 fps (limite de synchro), p95 16,8 ms. En rendu logiciel SwiftShader (tests) : 12 fps, attendu.
- **Conséquences** : 9 maillages de chunks + 1 `InstancedMesh` de clôtures + calques d'aperçu instanciés ; marge confortable.
  Mesure mobile à faire.

## ADR-019 : Règles des animaux au POC
- **Statut** : accepté (itération 2) ; précise `02-regles-du-jeu-poc.md`
- **Décision** :
  - Le score d'habitat est une fonction pure (`sim/world/habitat.ts`) calculée à la demande, une fois par tick et par couple
    (enclos, espèce) ; le panneau d'inspection appelle la même fonction. Pas de score stocké dans l'état.
  - « Une jauge à 0 pendant 2 jours » compte la faim, la soif **et** le bien-être ; le compteur repart de zéro dès qu'aucune
    jauge n'est à 0, et la santé remonte alors lentement. État affiché « malade » dès que la santé est sous 100.
  - Priorité de l'état affiché : mort, malade, soif, faim, mal-être, sommeil, content.
  - Les animaux dorment de 21 h à 6 h (la nuit visuelle va de 20 h à 7 h) : un sommeil de 20 h à 8 h laissait les enclos
    endormis la moitié du temps.
  - Taille de groupe : au-delà de `maxGroup` (lion 4, panda 1), l'achat est refusé ; une fusion d'enclos peut dépasser,
    avec un malus de bien-être. Un animal mort reste visible 400 ticks (corps gris couché, pierre tombale) puis disparaît.
  - Le point d'eau est un sol `water` peint dans un enclos (30 par tuile) ; « Démolir » enlève aussi l'eau et les objets.
- **Conséquences** : un animal sans nourrisseur meurt en 4 à 5 jours (8 à 10 min à ×1). À équilibrer à l'itération 4.

## ADR-020 : Déplacement des animaux
- **Statut** : accepté (itération 2)
- **Décision** : position continue (en tuiles) + position du tick précédent pour l'interpolation. Trajets par parcours en
  largeur sur les tuiles praticables de l'enclos (ni eau, ni objet, sans traverser de clôture), donc corrects dans un enclos
  en L. Promenade : une tuile tirée au PRNG à 4 tuiles au plus ; soif et faim priment (tuile voisine de l'eau ou du
  nourrisseur). Pas de collision entre animaux.
- **Conséquences** : déterministe et simple ; coût négligeable pour quelques dizaines d'animaux (voir dettes).

## ADR-021 : Vitesse de jeu hors de l'état de simulation
- **Statut** : accepté (itération 2) ; remplace la commande `SetSpeed` listée dans `03-architecture.md`
- **Décision** : pause, ×1, ×2, ×4 vivent dans la boucle principale (`ui/timeControls.ts`) et multiplient le temps réel
  donné à l'accumulateur. Ce n'est pas une commande : la vitesse ne change rien au résultat d'une partie.
- **Conséquences** : une partie reste égale à (seed, liste de (tick, commande)). La sauvegarde (itération 4) n'aura pas
  à stocker la vitesse ; elle reprendra en ×1.

## ADR-022 : Icônes maison partagées, inspection et test de silhouette
- **Statut** : accepté (itération 2)
- **Décision** : les icônes d'état et d'espèce sont dessinées sur canvas (`render/icons.ts`) : sprites dans la scène,
  images dans les panneaux. Chaque état combine une forme (disque, goutte, carré, losange, nuage, pierre tombale), un
  pictogramme et une couleur. Inspection : clic ou appui bref sans outil actif (animal le plus proche à moins de 0,7 tuile,
  sinon enclos), et liste des enclos accessible au clavier. Le renderer a un mode silhouette (animaux en noir sur fond
  blanc), piloté par l'API de debug, pour le test de lisibilité de `04-direction-artistique.md`.
- **Conséquences** : pas d'asset externe ni d'emoji système ; les captures de silhouette sont reproductibles.

## ADR-023 : Scénarios à étapes et vérifiés par Vitest
- **Statut** : accepté (itération 2) ; complète ADR-013
- **Décision** : un scénario peut fixer l'argent de départ et enchaîner des étapes (commandes puis ticks), pour échelonner
  des achats et montrer plusieurs états au même instant. `runScenario` est partagé par l'API de debug et par un test
  Vitest qui vérifie que chaque scénario montre bien ce pour quoi il existe (états attendus, jour ou nuit).
- **Conséquences** : un rééquilibrage qui casse une capture de référence échoue dès `npm run check`.

---

## Journal des playtests

| Date | Itération | Ce qui est fun | Ce qui ne l'est pas | Décisions |
|---|---|---|---|---|
| | | | | |
