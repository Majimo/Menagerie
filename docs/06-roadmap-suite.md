# 06 : Roadmap de la suite (après le POC)

Objectif : passer du POC à un jeu plus conséquent **sans tout réécrire**.
Les paliers ci-dessous sont ordonnés mais indépendants : on les réordonne selon ce qui s'est révélé fun au playtest.

## Ce qu'on prépare dès le POC

Ces choix coûtent peu maintenant et évitent de gros chantiers plus tard :

| Choix du POC | Ce qu'il rend possible |
|---|---|
| Simulation pure, sans dépendance au rendu | Web Worker, simulation en Rust/WASM, tests, replays |
| Commandes en données | Annuler/refaire, replays, multijoueur coopératif éventuel |
| État sérialisable + `saveVersion` | Sauvegardes durables, migrations, partage de zoos |
| Contenu piloté par les données | Nouvelles espèces et bâtiments sans code, mods |
| Registre d'assets avec repli | Remplacer les modèles à tout moment |
| Abstraction des entrées | Tactile, manette |
| Textes en clés i18n | Traductions |
| PRNG seedé, tick fixe | Déterminisme, scénarios reproductibles |

## Paliers

Chaque palier est détaillé en itérations (numérotées à la suite du POC) dans son propre fichier au moment de le commencer.

| Palier | Statut | Détail |
|---|---|---|
| V0.2 : Contenu et vie du zoo | en cours | [`10-roadmap-v0.2.md`](10-roadmap-v0.2.md), itérations 5 à 11 |
| V0.3 : Personnel et opérations | suivant (validé) | à détailler à la clôture de V0.2 |
| V0.4 : Progression | ensuite (validé) | à détailler à la clôture de V0.3 |
| V0.5 à V1.0 | plus tard | à détailler palier par palier |

**Ordre retenu après le playtest du POC, validé par Pierre** (ADR-034) : V0.2 d'abord, parce que le fun tient à « placer un animal de
plus » et qu'un zoo complet n'a rien à acheter ; puis V0.3, dont les salaires et les gardiens donnent un vrai poids à
l'argent accumulé ; puis V0.4, dont la recherche aura assez d'espèces et de bâtiments à débloquer. V0.6 s'insère dès
qu'un signal du tableau « Signaux pour changer de technique » est mesuré, pas avant.

### V0.2 : Contenu et vie du zoo

Détaillé dans [`10-roadmap-v0.2.md`](10-roadmap-v0.2.md).

- 10 à 12 espèces, nouveaux biomes (neige, jungle, désert), préférences de climat.
- Variation d'espèces par âge (jeune / adulte), comportements propres (sieste, jeu, bain).
- Événements aléatoires : météo, fête, visite scolaire, inspection.
- Plus de décor et de bâtiments : toilettes, restaurant, boutique de souvenirs, aire de jeux.
- Saisons et variation de fréquentation.

### V0.3 : Personnel et opérations

- Gardiens (nourrissage, nettoyage), vétérinaires, agents d'entretien, vendeurs.
- Salaires, formation, fatigue, planning simple, zones de travail.
- Les nourrisseurs automatiques deviennent un choix (auto vs gardien).
- Portails d'enclos, chemins de service.
- Visiteurs plus variés : familles, groupes scolaires, passionnés, avec des attentes différentes.

### V0.4 : Progression

- Recherche et déblocages (espèces, bâtiments, améliorations).
- Conservation et reproduction, génétique simple, échanges entre zoos.
- Campagne de scénarios (objectifs, contraintes, cartes prédéfinies), mode bac à sable.
- Succès et statistiques à long terme.

### V0.5 : Terrain et construction avancée

- Relief par paliers (terraformation simple), rivières, lacs, ponts, rampes.
- Enclos multi-niveaux, tunnels ou vitres d'observation.
- Éditeur de plans (blueprints) de bâtiments et de zones, copier/coller de sections.
- Cartes au-delà de 96×96 (V0.2 permet déjà d'acheter des parcelles 12×12 jusqu'à 96×96), rendu par chunks et visibilité.

### V0.6 : Performance et technique

Déclencheurs (voir tableau plus bas) :
- **Web Worker** pour la simulation, communication par snapshots + événements.
- **Foules** : animation par texture de vertex (VAT) ou billboards animés à distance + `InstancedMesh`.
- **LOD** des modèles et désactivation des ombres lointaines.
- **ECS** (bitECS ou équivalent) si les boucles sur entités deviennent le goulot.
- **Rust/WASM** pour la simulation seulement si le profilage montre que le TypeScript n'y suffit plus
  (pathfinding et IA de foule en premier candidat).

### V0.7 : Plateformes et finition

- PWA installable, mode hors ligne.
- Desktop (Tauri ou Electron) ; intégration Steam si pertinent.
- Mobile (Capacitor) avec interface tactile dédiée.
- Audio complet (ambiances, cris d'animaux, musique adaptative).
- Localisation (FR, EN, puis d'autres), accessibilité (contraste, daltonisme, taille de texte).
- Sauvegardes cloud optionnelles.

### V1.0 : Sortie

- Campagne complète + bac à sable, équilibrage final, tutoriel complet.
- Nom définitif, identité visuelle, page de présentation, bande-annonce.
- Politique de télémétrie (aucune par défaut, ou opt-in claire).

### Au-delà

- Mods et partage (export de zoo en code/fichier, bibliothèque de plans).
- Mode défi hebdomadaire (seed commune).
- Multijoueur coopératif asynchrone ou visites de zoos d'amis.

## Signaux pour changer de technique

| Symptôme mesuré | Réponse envisagée |
|---|---|
| Tick de simulation > 30 ms sur un zoo moyen | Profiler ; Web Worker ; optimiser pathfinding ; envisager WASM |
| FPS < 50 avec 300+ visiteurs | Instancing / VAT, LOD, billboards à distance |
| Mémoire > 1 Go sur mobile | Textures partagées, compression (KTX2), moins de variantes |
| Les systèmes deviennent difficiles à faire évoluer (logique « spaghetti ») | Introduire un ECS |
| Temps de chargement > 5 s sur connexion moyenne | Compression Draco/meshopt, chargement progressif |

## Dettes assumées du POC (à rembourser)

Reprises dans le palier V0.2 (`10-roadmap-v0.2.md`) : confusion sable / chemin (itération 5, le sable devient le
désert), annonce vocale des alertes et rythme de la journée (itération 11).

- Pas de relief : la grille 2D plate est simple mais devra devenir une grille de hauteurs.
- Animation des foules par `AnimationMixer` : coûteux au-delà de quelques centaines d'entités.
- Pas de gardiens : les nourrisseurs sont automatiques.
- UI en DOM natif : acceptable jusqu'à une UI riche, puis envisager un petit framework (Preact, Lit).
- Équilibrage par scénario scripté unique : prévoir un banc de simulations multi-scénarios.
- Tests e2e contre le serveur de dev seulement : ajouter un passage sur le build de production (`vite preview`) en CI.
- Construction (itération 1) : on peut poser un chemin dans un enclos et fermer un enclos autour de l'entrée ;
  à interdire quand les visiteurs et les animaux arriveront (validation par simulation du remplissage).
- Pas d'annuler / refaire : les commandes sont des données, l'historique (tick, commande) suffira à l'implémenter.
- Aperçu de démolition « en rectangle » limité aux chemins et clôtures : les biomes ne se démolissent pas (on repeint).
- Performance mesurée sur un seul poste (Apple M3 Pro, 60 fps) : mesurer sur mobile milieu de gamme.
- Sable et chemin ont des couleurs proches ; le relief du chemin les distingue, à revoir si les retours de jeu le signalent.
- Animaux (itération 2) : pas de collision entre animaux, trajets recalculés à chaque promenade (parcours en largeur dans
  l'enclos, ~2 000 tuiles au plus) ; prévoir un cache de distances par enclos si le nombre d'animaux grimpe.
- Animations procédurales simples (pattes en balancier, cou qui s'abaisse) : à remplacer par des modèles glTF animés.
- Le score d'habitat est recalculé à chaque tick pour chaque couple (enclos, espèce) : à mettre en cache par enclos
  si le profilage le montre.
- Une clôture démolie laisse l'animal « hors enclos » sur place (immobile, bien-être cible 0) : pas d'évasion au POC.
- Coût de nourriture des animaux forfaitaire par espèce et par jour, qu'il y ait un nourrisseur ou non (itération 3).
- Le panneau d'inspection se reconstruit (4 fois par seconde au plus) quand son contenu change : suffisant au POC,
  à revoir avec un petit framework d'UI.

- Visiteurs (itération 3) : pas de collision ni d'évitement entre visiteurs ; cache A* purgé en entier à chaque changement du
  monde et vidé au-delà de 4 000 trajets ; le réseau des visiteurs est recalculé entièrement à chaque construction.
- Rythme : journée de 1 200 ticks pour une marche de 0,2 tuile/tick : sur une grande carte, la visite est surtout de la marche.
  À revoir avec la taille de carte et la durée d'une journée (itération 4 ou palier V0.2).
- Économie : rééquilibrée à l'itération 4 (ADR-029) sur deux parties scriptées seulement ; un zoo complet rapporte encore
  ~2 000 par jour sans dépense à venir (salaires en V0.3, objectifs au-delà de « Premiers pas »).
- Alertes du zoo non annoncées vocalement à leur apparition (seul le bilan de minuit l'est, avec la faillite proche).
- Sauvegarde (itération 4) : un seul emplacement localStorage, JSON non compacté (~125 Ko pour `busy-day`, 40 animaux et ~150 visiteurs) ; plusieurs
  emplacements, export de fichier et IndexedDB à prévoir.
- Tutoriel : avancement global au navigateur (pas par partie) ; pas de flèche vers l'outil concerné.
- Bancs : place choisie par parité d'id (deux assis de même parité se superposent) ; pas de bulle « fatigué ».
- Message (toast) en haut au centre : à grande échelle d'interface sur mobile, il chevauche les barres du haut un instant.
- Écran titre sur fond de carte vide ; pas de sons ni de nouvelles particules (polish optionnel non fait).
- Références de régression visuelle propres au poste de développement ; e2e pas encore en CI.

## Questions ouvertes

- Vue : garder l'isométrique strict ou autoriser une caméra libre (pitch/yaw) ? À décider après le POC.
- Doit-on viser Steam ? Détermine l'investissement Tauri/Electron, succès, cloud saves.
- Quelle ambition de contenu (nombre d'espèces) pour la 1.0 ?
