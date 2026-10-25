# 09 : Vérification visuelle, ludique et accessibilité

Les tests unitaires disent si la simulation est juste. Ils ne disent pas si le jeu est **lisible, cohérent,
compréhensible et accessible**. Pour cela, Claude Code doit **regarder le jeu** : il lance des scénarios,
prend des captures d'écran, les examine avec une grille de revue, corrige, recommence.

## Outils

| Besoin | Outil |
|---|---|
| Piloter le navigateur, prendre des captures | Playwright (Chromium headless, WebGL logiciel) |
| Accessibilité du DOM (UI) | `@axe-core/playwright` |
| Simulation du daltonisme | Chrome DevTools Protocol (`Emulation.setEmulatedVisionDeficiency`) via Playwright |
| Mouvement réduit, tailles d'écran | Options de contexte Playwright (`reducedMotion`, `viewport`, `hasTouch`) |

Scripts : `npm run test:e2e` (tout Playwright : scénarios, accessibilité) et `npm run shots` (captures seules, pour la revue).
Le rendu WebGL headless passe par un rendu logiciel : vérifier les options de lancement de Chromium à l'installation
(ex. SwiftShader) et les documenter dans `playwright.config.ts`.

## API de debug (`window.__game`)

Exposée uniquement en dev et en test (`?debug` ou variable d'environnement E2E), **exclue du build de production**.

```ts
__game.ready(): Promise<void>                 // assets chargés, première frame rendue
__game.loadScenario(name: string): void       // état de départ prédéfini et seedé
__game.advance(ticks: number): void           // fait avancer la simulation sans attendre le temps réel
__game.dispatch(command): Result              // envoie une commande comme le ferait l'UI
__game.getState(): Readonly<GameState>        // lecture seule, pour les assertions
__game.setCamera(preset: 'far' | 'mid' | 'close', target?: TileCoord): void
__game.freezeTime(): void                     // fige animations et particules pour des captures déterministes
```

## Scénarios de référence

Définis dans `tests/e2e/scenarios/` : une seed, une liste de commandes, un nombre de ticks.
Ils sont introduits au fil des itérations :

| Scénario | Contenu | Itération |
|---|---|---|
| `empty-map` | carte vierge, entrée et sortie | 1 |
| `first-enclosure` | un enclos fermé, chemin, aperçus valides et invalides | 1 |
| `four-species` | un enclos par espèce, animaux en bonne santé | 2 |
| `animal-needs` | animaux affamés, assoiffés, malades, endormis (nuit) | 2 |
| `busy-day` | ~150 visiteurs répartis, bulles d'humeur | 3 |
| `crisis` | argent négatif, animal mort, visiteurs en colère | 3 à 4 |
| `tutorial-start` | écran d'accueil et première aide contextuelle | 4 |

## Captures

- **Viewports** : desktop 1280×720, grand écran 1920×1080, mobile portrait 390×844.
- **Zooms de caméra** : `far` (vue d'ensemble), `mid` (jeu normal), `close` (détail d'un enclos).
- **Sorties** : `artifacts/screenshots/<iteration>/<scenario>_<viewport>_<zoom>.png` (dossier ignoré par git).
- **Déterminisme** : seed fixe, `advance(n)` plutôt que le temps réel, `freezeTime()`, attendre `ready()`.
- Les captures **ne sont pas des tests pixel par pixel** au départ : elles servent à la revue. Une régression
  visuelle automatique (`toHaveScreenshot` avec tolérance) peut être ajoutée à partir de l'itération 4 sur des
  scénarios stables, avec des références générées dans un environnement unique (le rendu logiciel varie d'une machine à l'autre).

## Boucle de revue (obligatoire en fin d'itération)

1. `npm run shots`.
2. Ouvrir **chaque** capture produite et la comparer à la grille ci-dessous.
3. Lister les défauts, corriger, relancer. **3 boucles maximum** ; au-delà, signaler le problème plutôt que s'acharner.
4. Écrire `artifacts/review/<iteration>.md` : pour chaque capture, un verdict (✅ / ⚠️ / ❌) et les défauts restants.
5. Reporter les ⚠️ et ❌ dans le compte rendu final.

## Grille de revue

### Cohérence visuelle

- [ ] Échelle cohérente (animaux > visiteurs > mobilier, tuile = repère stable).
- [ ] Palette respectée ; les animaux ressortent du terrain.
- [ ] Éclairage et ombres uniformes ; pas de clignotement ni de z-fighting.
- [ ] Aucun élément qui flotte, traverse un autre ou sort de la carte.

### Lisibilité (pilier n°1)

- [ ] Chaque espèce est identifiable à la silhouette, à tous les zooms utiles.
- [ ] On distingue au premier regard un animal d'un visiteur, un adulte d'un enfant.
- [ ] Les états (faim, soif, mal-être, maladie, sommeil) sont visibles **sans ouvrir de panneau**.
- [ ] Les clôtures ne masquent pas les animaux ; la zone d'observation est repérable.

### Lisibilité ludique

- [ ] « Que dois-je faire maintenant ? » : la réponse se lit à l'écran (objectif, alerte, bouton mis en avant).
- [ ] « Qu'est-ce qui va mal ? » : un problème (animal affamé, visiteurs bloqués, déficit) se repère en moins de 3 secondes.
- [ ] « Quel enclos marche le mieux ? » : visible sans calcul mental.
- [ ] L'effet de la dernière action est perceptible (retour visuel, message, variation d'argent).
- [ ] Un zoo vivant **paraît vivant** : mouvements, foule répartie, bulles, pas de scène figée.

### Interface

- [ ] Aucun chevauchement entre panneaux, barre d'outils et éléments du monde.
- [ ] Textes entièrement visibles, pas de troncature, hiérarchie claire.
- [ ] Mobile : barre d'outils atteignable au pouce, pas de contrôle hors écran.

> Limite assumée : les captures permettent de repérer incohérences et problèmes de lisibilité, mais ne remplacent
> pas un vrai playtest humain. Le verdict sur le « fun » reste celui de Pierre ; Claude Code signale ses doutes.

## Accessibilité

### Interface DOM (testée automatiquement)

- [ ] `axe-core` : **zéro violation** de gravité serious ou critical sur chaque écran du jeu.
- [ ] Contraste du texte ≥ 4,5:1 ; icônes et contrôles ≥ 3:1.
- [ ] Navigation au clavier complète : ordre de tabulation logique, **focus visible**, `Échap` annule l'outil actif.
- [ ] Tous les boutons à icône ont `aria-label` et `title` (clés i18n).
- [ ] Zones tactiles ≥ 44×44 px (test automatique sur la taille des boîtes englobantes).
- [ ] Échelle d'interface réglable (100 / 125 / 150 %), sans casse de mise en page.
- [ ] Événements majeurs annoncés dans une zone `aria-live` (« Animal mort », « Faillite proche », « Objectif atteint »).

### Rendu 3D (non couvert par axe : vérifié par captures)

- [ ] **Jamais la couleur seule** : chaque état = icône + forme + couleur ; l'aperçu de placement valide/invalide
  se distingue aussi par un symbole (✓ / ✗) et un motif, pas seulement vert/rouge.
- [ ] Captures `four-species`, `animal-needs` et `crisis` refaites sous **protanopie, deutéranopie, tritanopie et achromatopsie** :
  les états et l'aperçu restent distinguables.
- [ ] `prefers-reduced-motion` : particules, tremblements et transitions réduits ou supprimés.
- [ ] Pas de flash plus de 3 fois par seconde.
- [ ] Aucune information transmise uniquement par le son (tout retour sonore est doublé d'un retour visuel).
- [ ] Option de palette adaptée au daltonisme prévue (V0.7, voir `06-roadmap-suite.md`).

## Quand lancer quoi

| Moment | Commande |
|---|---|
| Avant chaque commit | `npm run check` |
| Fin d'itération | `npm run test:e2e` puis `npm run shots` et boucle de revue |
| Avant mise en ligne publique | tout ce qui précède + essai manuel sur mobile réel et lecteur d'écran |
