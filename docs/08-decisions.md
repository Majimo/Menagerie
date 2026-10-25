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

---

## Journal des playtests

| Date | Itération | Ce qui est fun | Ce qui ne l'est pas | Décisions |
|---|---|---|---|---|
| | | | | |
