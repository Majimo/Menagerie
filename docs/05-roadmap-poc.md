# 05 : Roadmap du POC

Cinq itérations courtes. Chacune se termine par un jeu **qui tourne** et qu'on peut essayer.
Durées indicatives avec Claude Code : **16 à 25 h au total**, soit 2 à 3 week-ends.

Règle : ne pas commencer une itération tant que les critères de la précédente ne sont pas cochés
et que `npm run check` passe.

Règle commune dès qu'une itération touche au rendu ou à l'UI : **vérification visuelle et accessibilité**
(`09-verification-visuelle-et-accessibilite.md`) : scénarios seedés, captures, revue avec la grille, tests axe, rapport
`artifacts/review/<iteration>.md`. Les critères « Revue visuelle » ci-dessous s'ajoutent à `npm run check`.

---

## Itération 0 : Setup (1 à 2 h)

**Objectif** : un projet vide mais propre, déployé en ligne.

**Tâches**
- Initialiser Vite + TypeScript strict + Three.js + Vitest + Biome.
- Créer l'arborescence de `docs/03-architecture.md` (dossiers vides avec un fichier minimal).
- Écran de base : canvas plein écran, cube de test, compteur de FPS (`?debug`).
- Scripts `dev`, `test`, `check`, `build`.
- Déploiement automatique sur hébergement statique (voir `07-deploiement.md`).
- Playwright + axe-core, `playwright.config.ts`, scripts `test:e2e` et `shots`, API `window.__game` (squelette), dossier `artifacts/` dans `.gitignore`.

**Critères d'acceptation**
- [ ] `npm run check` passe sur un projet neuf.
- [ ] L'URL publique affiche le canvas.
- [ ] Une règle de lint ou de test interdit l'import de `three` et du DOM dans `src/sim/`.
- [ ] `npm run shots` produit une capture du canvas dans `artifacts/screenshots/0/` et un test axe passe sur la page.

**Prompt de lancement** : « Lis CLAUDE.md et docs/03-architecture.md, puis réalise l'itération 0 de docs/05-roadmap-poc.md. »

---

## Itération 1 : Monde, caméra, construction (3 à 5 h)

**Objectif** : voir un terrain isométrique et y construire chemins et enclos.

**Tâches**
- Simulation : grille 48×48, types de sol, boucle de tick fixe, PRNG seedé, système de commandes.
- Commandes : `PlacePath`, `PlaceFence`, `PaintBiome`, `Demolish`, avec coûts et validation.
- Détection d'enclos par flood fill ; surface calculée.
- Rendu : terrain par chunks, caméra isométrique (pan, zoom, rotation 90°), picking de tuile, aperçu de placement.
- UI : barre d'outils (chemin, clôture, biome, démolir), affichage de l'argent.
- Entrée et sortie du zoo pré-placées.

**Critères d'acceptation**
- [ ] On peint un biome, on trace un chemin, on ferme un enclos à la clôture ; l'enclos est détecté et sa surface s'affiche au survol.
- [ ] Un aperçu vert/rouge indique si le placement est valide ; l'argent se décrémente.
- [ ] Les commandes invalides affichent un message clair.
- [ ] Tests : flood fill (enclos simple, enclos en L, enclos non fermé), coûts, déterminisme du PRNG.
- [ ] 60 fps sur la carte pleine.
- [ ] Revue visuelle : scénarios `empty-map` et `first-enclosure` capturés (desktop et mobile, 3 zooms) et conformes à la grille ; aperçu valide/invalide distinguable sans la couleur ; boutons de la barre d'outils étiquetés et ≥ 44 px.

**Prompt** : « Réalise l'itération 1 de docs/05-roadmap-poc.md. Propose d'abord un plan en 8 points maximum. »

---

## Itération 2 : Animaux (4 à 6 h)

**Objectif** : des animaux vivants qui ont des besoins et un habitat.

**Tâches**
- Données des 4 espèces (`species.ts`), registre d'assets avec modèles procéduraux distinctifs par espèce.
- Commande `BuyAnimal` : choisir une espèce, la placer dans un enclos ; règles de compatibilité (carnivore / herbivore).
- Nourrisseur, point d'eau, décor (arbre, rocher, bambou).
- Systèmes : besoins (faim, soif, bien-être, santé), score d'habitat, errance dans l'enclos, états.
- Rendu : vues animaux animées (au minimum `idle` et `walk`, même procédurales), icônes d'état, icône d'espèce sur l'enclos.
- UI : panneau d'inspection d'un animal et d'un enclos (jauges, score d'habitat détaillé, ce qui manque).
- Cycle jour/nuit, pause et vitesses ×1/×2/×4.

**Critères d'acceptation**
- [ ] Les 4 espèces sont **reconnaissables à la silhouette** (test de silhouette de `04-direction-artistique.md`).
- [ ] Un enclos trop petit ou sans eau fait baisser le bien-être ; le panneau dit pourquoi.
- [ ] Un animal sans nourriture finit par tomber malade puis mourir, de façon visible.
- [ ] Un lion ne peut pas être placé avec des zèbres, message explicite.
- [ ] Tests : score d'habitat, évolution des besoins, mort par privation, règles de cohabitation.
- [ ] Revue visuelle : scénarios `four-species` et `animal-needs` capturés ; test de silhouette réussi pour les 4 espèces ; états visibles sans panneau ; vérification sous les 4 simulations de daltonisme ; navigation clavier des panneaux.

**Prompt** : « Réalise l'itération 2. Les modèles sont procéduraux pour l'instant, avec le repli du registre d'assets. »

---

## Itération 3 : Visiteurs et économie (5 à 7 h)

**Objectif** : des visiteurs qui viennent voir les animaux et font vivre le zoo.

**Tâches**
- Spawn à l'entrée selon note du zoo et prix du billet ; sortie en fin de visite.
- Pathfinding A* sur les chemins (cache, budget par tick) ; visiteurs bloqués = message d'avertissement au joueur.
- Machine à états des visiteurs, zones d'observation, choix de cibles pondérés.
- Deux gabarits (adulte, enfant) avec variantes de couleur ; animations `walk`, `idle`, `watch`.
- Économie : billets, snacks, dépenses journalières, bilan de fin de journée.
- Note du zoo (1 à 5 étoiles) et satisfaction moyenne.
- UI : panneau d'économie (revenus/dépenses), note du zoo, réglage du prix du billet, inspection d'un visiteur.
- Bulles d'humeur et éclats de joie.

**Critères d'acceptation**
- [ ] On **voit** des visiteurs s'arrêter devant les enclos et réagir aux animaux.
- [ ] Un zoo sans chemin vers un enclos n'attire pas de visiteurs vers lui ; l'UI signale le problème.
- [ ] Un prix de billet trop élevé réduit nettement les arrivées.
- [ ] Les revenus et dépenses du jour sont détaillés dans un bilan.
- [ ] Tests : pathfinding, machine à états, calcul de revenus, note du zoo, déterminisme avec visiteurs.
- [ ] Revue visuelle : scénarios `busy-day` et `crisis` capturés ; adultes et enfants distincts, foule variée et répartie ; problème « visiteurs bloqués » ou « déficit » repérable en moins de 3 secondes ; `prefers-reduced-motion` respecté.
- [ ] 60 fps avec ~150 visiteurs et ~40 animaux (sinon, noter la cause dans `docs/08-decisions.md`).

**Prompt** : « Réalise l'itération 3. Commence par la logique de simulation et ses tests, puis le rendu des visiteurs. »

---

## Itération 4 : Boucle de jeu, équilibrage, sauvegarde (3 à 5 h)

**Objectif** : un POC qui se joue 20 minutes et donne envie de continuer.

**Tâches**
- Objectifs du scénario « Premiers pas », condition de défaite, écran de fin.
- Stand de snacks et bancs ; effet sur satisfaction et revenus.
- Équilibrage des chiffres de `balance.ts` avec un scénario scripté de référence (test de rentabilité).
- Sauvegarde / chargement JSON versionné ; sauvegarde auto en fin de journée.
- Tutoriel minimal (3 à 5 bulles d'aide contextuelles).
- Polish : ombres, particules, sons simples (optionnel), écran titre.
- Premier playtest : noter ce qui est fun et ce qui ne l'est pas dans `docs/08-decisions.md`.

**Critères d'acceptation**
- [ ] Un joueur qui n'a jamais vu le jeu comprend quoi faire en moins de 3 minutes.
- [ ] Le scénario est gagnable avec une bonne stratégie et perdable avec une mauvaise.
- [ ] Sauvegarder puis recharger redonne un état identique (test aller-retour).
- [ ] Les critères de succès de `01-vision-et-scope.md` sont évalués et cochés (ou ce qui manque est listé).
- [ ] Revue complète : tous les scénarios sur les 3 viewports ; zéro violation axe serious/critical sur tous les écrans ; échelle d'interface 150 % sans casse ; rapport `artifacts/review/4.md` sans ❌ ; régression visuelle (`toHaveScreenshot`) en place sur les scénarios stables.

**Prompt** : « Réalise l'itération 4, puis fais-moi un compte rendu des critères de succès du POC. »

---

## Hors itérations (backlog léger du POC)

- Raccourcis clavier, annuler/refaire (les commandes en données facilitent le `undo`).
- Mode debug : afficher chemins A*, zones d'observation, scores d'habitat.
- Statistiques d'évolution (courbes sur 30 jours).
