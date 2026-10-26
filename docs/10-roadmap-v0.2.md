# 10 : Roadmap du palier V0.2 : contenu et vie du zoo

Premier palier après le POC (`06-roadmap-suite.md`). Sept itérations, numérotées à la suite du POC (5 à 11) pour que
`/jalon-suivant N` et `artifacts/review/<N>.md` restent valables. Durées indicatives avec Claude Code : **35 à 47 h au total**.
Choix validés par Pierre le 2026-10-26 (ADR-034).

## Pourquoi ce palier en premier

- Le playtest du POC (2026-10-26) confirme que le moteur du fun est « placer un animal de plus » : du **contenu**
  (espèces, biomes, comportements) nourrit directement cette envie.
- Un zoo complet rapporte ~2 000 par jour sans rien à acheter et les objectifs sont atteints vers le jour 5 :
  il faut des **choses à viser et à acheter** (nouvelles espèces, services, saisons à préparer).
- Les paliers V0.3 (personnel) et V0.4 (progression) ont besoin de ce contenu pour avoir du sens : des gardiens pour
  4 espèces ou un arbre de recherche de 4 entrées n'apportent pas grand-chose.

## Règles communes du palier

Elles s'ajoutent à celles de `05-roadmap-poc.md` (vérification visuelle et accessibilité à chaque itération) :

- **Sauvegarde** : chaque changement de forme de l'état incrémente `saveVersion` et ajoute une migration
  (`MIGRATIONS[n]`) ; le test aller-retour couvre une sauvegarde de la version précédente.
- **Nouvelle espèce** = une entrée dans `sim/data/species.ts`, ses textes, un modèle procédural, une icône et le
  **test de silhouette** (`04-direction-artistique.md`). Pas de code de système propre à une espèce.
- **Nouveau type de sol** : ajouté **à la fin** de `TILE_TYPES` (l'état stocke l'indice) ; distinguable sans la couleur
  (relief ou motif).
- **Équilibrage** : les parties scriptées d'ADR-029 (`tests/sim/balance.test.ts`) passent à chaque itération ;
  on les étend quand une itération change l'économie.
- **Règles du jeu** : les nouvelles règles s'ajoutent à `02-regles-du-jeu-poc.md` (un seul document de règles).
- La carte reste plate (relief : V0.5). Elle part de **48×48** et s'agrandit par parcelles achetées jusqu'à **96×96**
  (itération 7) ; au-delà : V0.5.

## Hors palier (ne pas anticiper)

Personnel et salaires (V0.3), reproduction et recherche (V0.4), relief (V0.5), Web Worker et VAT (V0.6, sur signal
mesuré), audio et localisation (V0.7). Toutes les espèces sont disponibles dès le départ ; leur prix (et celui des
parcelles) fait office de progression jusqu'à la recherche de V0.4. Un seul **abri** d'enclos protège du froid comme
du chaud (itération 10).

---

## Itération 5 : Nouveaux biomes et trois espèces (5 à 7 h)

**Objectif** : trois paysages nouveaux, chacun avec un animal qui en a besoin.

**Tâches**
- Sols : `snow` (neige) et `jungle` ajoutés ; `sand` devient le biome **désert**, une simple tuile de sol (texte
  « Désert », motif de rides, sans relief) : pas de troisième type, et la confusion sable / chemin (dette du POC) se
  règle au passage.
- Espèces : **manchot** (neige), **dromadaire** (désert), **gorille** (jungle). Chiffres de départ dans le tableau
  ci-dessous.
- Score d'habitat généralisé, en données :
  - `toleratedBiomes` : une tuile de biome toléré compte pour moitié dans le critère « Biome » ;
  - `waterShare` (optionnel) : part d'eau voulue dans l'enclos ; le critère « Eau » vaut
    `min(1, part réelle / part voulue)` au lieu de « au moins une tuile ».
- Décors de biome : cactus (désert), bloc de glace (neige), fougère géante (jungle), dans `likedDecor` des espèces.
- Rendu : textures des deux nouveaux sols et du désert, modèles des trois espèces et des trois décors, icônes.
- UI : les trois biomes dans l'outil de peinture ; panneau d'enclos qui affiche biome toléré et part d'eau.
- Scénario `new-biomes` : un enclos par nouveau biome, avec son espèce.

**Critères d'acceptation**
- [ ] Les trois nouvelles espèces sont reconnaissables à la silhouette, entre elles et face aux quatre du POC.
- [ ] Neige, jungle, désert, herbe, savane, forêt et chemin se distinguent sans la couleur (capture en niveaux de gris).
- [ ] Un manchot dans un enclos sans assez d'eau voit son bien-être baisser ; le panneau dit « pas assez d'eau (12 % / 25 %) ».
- [ ] Une tuile de biome toléré compte pour moitié (test).
- [ ] Une sauvegarde du format 4 se charge (migration) et la partie continue à l'identique.
- [ ] Tests : score d'habitat généralisé, migration, nouvelles espèces dans les règles de cohabitation.
- [ ] Revue visuelle : `new-biomes` capturé (3 viewports, 3 zooms) ; test de silhouette à 7 espèces ; sols sous les 4 simulations de daltonisme.

**Prompt** : « Réalise l'itération 5 de docs/10-roadmap-v0.2.md. Commence par les données et le score d'habitat. »

---

## Itération 6 : Ménagerie élargie (5 à 7 h)

**Objectif** : douze espèces et un catalogue qui aide à choisir.

**Tâches**
- Espèces : **éléphant** (savane), **hippopotame** (savane, beaucoup d'eau), **ours polaire** (neige),
  **flamant rose** (désert, beaucoup d'eau), **kangourou** (désert, herbe tolérée).
- Cohabitation en données : `diet` remplacé par `predator` (un prédateur ne vit qu'avec sa propre espèce) ;
  liste d'exceptions `avoids` si un cas le demande. L'ours polaire ne cohabite pas avec les manchots.
- Catalogue d'animaux (outil Animaux) : espèces groupées par biome, fiche avant achat (biome, surface par animal,
  groupe, eau, prix, intérêt) ; au survol d'un enclos, chaque espèce indique si elle y serait bien, mal ou interdite
  (icône + texte, jamais la couleur seule).
- Panneau d'enclos : « Espèces adaptées à cet enclos ».
- Rendu : modèles, icônes ; l'éléphant et l'hippopotame (grands) ne traversent pas les clôtures à l'affichage.
- Scénario `menagerie` : les douze espèces dans des enclos adaptés.

**Critères d'acceptation**
- [ ] Les douze espèces passent le test de silhouette (le kangourou se distingue du dromadaire et du gorille).
- [ ] Depuis le catalogue, on sait **avant d'acheter** si une espèce convient à l'enclos survolé, et pourquoi.
- [ ] Un ours polaire ne peut pas être placé avec des manchots, message explicite ; des zèbres et des girafes cohabitent toujours.
- [ ] Le catalogue se parcourt au clavier et au tactile (zones ≥ 44 px), y compris en mobile portrait.
- [ ] Tests : cohabitation par `predator`, besoins en eau des espèces aquatiques, données complètes pour chaque espèce.
- [ ] Revue visuelle : `menagerie` capturé ; catalogue capturé ouvert (desktop et mobile) ; zéro violation axe serious/critical.

**Prompt** : « Réalise l'itération 6. Le catalogue d'animaux doit rester utilisable sur mobile portrait. »

---

## Itération 7 : Agrandir le zoo (5 à 7 h)

**Objectif** : acheter du terrain quand le zoo devient trop serré.

**Tâches**
- Parcelles de **12×12** : le monde passe à une taille maximale de **96×96** (8×8 parcelles) ; le zoo de départ reste
  un bloc de 48×48 (4×4 parcelles) au bord sud, celui de l'entrée et de la sortie. On achète les parcelles voisines au
  nord, à l'est et à l'ouest.
- État : parcelles possédées (`ownedParcels`, en données simples) ; toute construction, peinture ou démolition hors
  terrain possédé est refusée avec un message clair. Migration : une ancienne sauvegarde est replacée dans le bloc de
  départ (coordonnées décalées), sans changement de déroulement.
- Commande `BuyParcel` : parcelle adjacente au terrain possédé, argent suffisant.
- Prix en données (`balance.ts`), croissant avec le nombre de parcelles achetées ; départ indicatif
  **15 000 la première, +20 % par parcelle**, à régler par les parties scriptées pour rester équilibré avec les espèces
  (1 500 à 20 000) et les services. La bonne stratégie scriptée achète au moins une parcelle.
- Parcelles vierges (herbe) à l'achat ; pas de terrain préexistant au palier V0.2.
- Rendu : terrain par chunks étendu à 96×96 ; parcelles non possédées assombries **et** hachurées, contour et prix
  affichés au survol ; la caméra peut voir les parcelles à vendre mais pas au-delà de la carte.
- UI : outil « Terrain » (acheter une parcelle), confirmation avec le prix, refus expliqué (non adjacente, trop chère).
- Scénario `land-expansion` : zoo serré de départ, deux parcelles achetées et aménagées, parcelles à vendre visibles.

**Critères d'acceptation**
- [ ] On achète une parcelle adjacente, on y construit ; une parcelle non adjacente ou trop chère est refusée, message explicite.
- [ ] Le terrain possédé et le terrain à vendre se distinguent sans la couleur (hachures, contour).
- [ ] Une sauvegarde de la version précédente se charge dans le bloc de départ et se poursuit à l'identique.
- [ ] Les visiteurs atteignent les enclos des nouvelles parcelles ; la marche plus longue est mesurée (alimente la revue
  du rythme de l'itération 11).
- [ ] 60 fps sur une carte 96×96 entièrement possédée et construite.
- [ ] Tests : adjacence, prix croissant, refus hors terrain possédé, migration, déterminisme.
- [ ] Revue visuelle : `land-expansion` capturé (3 viewports, 3 zooms) ; outil Terrain au clavier et au tactile.

**Prompt** : « Réalise l'itération 7. Commence par l'état des parcelles, la migration et leurs tests. »

---

## Itération 8 : Âge et comportements (4 à 6 h)

**Objectif** : des animaux qui vivent, pas seulement qui errent.

**Tâches**
- Âge : on peut acheter un **jeune** (prix ×0,6, taille ×0,6, mignonnerie +0,3) qui devient adulte après
  `growDays` jours de jeu. Pas de vieillesse ni de naissance (V0.4).
- Comportements en données (`behaviours` par espèce) :
  - **sieste** en journée (durée et fréquence par espèce) ;
  - **jeu** entre deux animaux du même enclos (espèces sociales, jeunes surtout) ;
  - **bain** dans ou au bord de l'eau (espèces qui aiment l'eau).
- Les comportements actifs (jeu, bain) n'apparaissent que si le bien-être est haut (≥ 70) : ils **montrent** qu'un
  animal va bien.
- Visiteurs : regarder un animal qui joue ou se baigne rapporte plus de satisfaction (éclat de joie).
- Rendu : animations procédurales des comportements, icônes d'état (sieste distincte du sommeil de nuit).
- Scénario `behaviours` : un enclos par comportement, jeunes et adultes mêlés.

**Critères d'acceptation**
- [ ] On distingue un jeune d'un adulte d'un coup d'œil (taille et proportions) ; il grandit au bout de `growDays`.
- [ ] On voit des animaux faire la sieste, jouer et se baigner sans ouvrir de panneau ; un animal malheureux ne joue pas.
- [ ] Les visiteurs se massent davantage devant un enclos où les animaux jouent (mesuré en simulation).
- [ ] `prefers-reduced-motion` : les comportements restent lisibles avec des animations réduites.
- [ ] Tests : croissance, déclenchement des comportements (bien-être, eau, congénère), bonus de satisfaction, déterminisme.
- [ ] Revue visuelle : `behaviours` capturé de jour ; états lisibles sous daltonisme.

**Prompt** : « Réalise l'itération 8. Les comportements sont des données d'espèce, pas du code par espèce. »

---

## Itération 9 : Services aux visiteurs (5 à 7 h)

**Objectif** : de quoi dépenser son argent pour le confort des visiteurs, et des recettes en retour.

**Tâches**
- Emprise des bâtiments sur plusieurs tuiles (`footprint` en données, rotation 90°) ; les bâtiments 1×1 ne changent pas.
- **Toilettes** : nouvelle jauge visiteur « besoin pressant » (monte après avoir mangé) ; sans toilettes accessibles,
  la satisfaction baisse.
- **Restaurant** (2×2) : repas assis, dépense plus élevée qu'au stand, abri en cas de pluie (itération 10).
- **Boutique de souvenirs** : achat en fin de visite, probabilité et montant liés à la satisfaction.
- **Aire de jeux** (2×2) : les enfants y regagnent énergie et patience, les adultes attendent sur place.
- Décors de chemin (massif de fleurs, fontaine, lampadaire) : petit bonus de satisfaction à proximité, plafonné.
- Économie : recettes par bâtiment dans le bilan du jour ; entretien de chaque service ; parties scriptées
  mises à jour (la bonne stratégie construit les services).
- Scénario `services` : zoo équipé, file aux toilettes et enfants à l'aire de jeux.

**Critères d'acceptation**
- [ ] Un zoo sans toilettes perd nettement en satisfaction après les repas ; l'alerte le dit.
- [ ] Le bilan du jour détaille les recettes par type de service.
- [ ] Un bâtiment 2×2 se pose, se tourne et se démolit ; l'aperçu montre toute son emprise.
- [ ] La bonne stratégie scriptée reste rentable, la mauvaise fait toujours faillite.
- [ ] Tests : emprise et validation de placement, jauge « besoin pressant », achats de souvenirs, recettes.
- [ ] Revue visuelle : `services` capturé ; chaque service reconnaissable sans étiquette ; panneau d'un bâtiment au clavier.

**Prompt** : « Réalise l'itération 9. Commence par l'emprise multi-tuiles et ses tests. »

---

## Itération 10 : Saisons, climat et météo (5 à 7 h)

**Objectif** : le temps qui passe change la façon de jouer.

**Tâches**
- Calendrier : année de 4 saisons de `seasonDays` jours (départ : 7) ; date et saison affichées.
- Fréquentation saisonnière (multiplicateur par saison en données).
- Climat des espèces (`climate` : `cold`, `temperate`, `warm`) : en hiver, une espèce `warm` sans **abri** dans son
  enclos voit son bien-être cible baisser ; en été, une espèce `cold` sans abri ni assez d'eau aussi.
- **Abri** (bâtiment d'enclos) ; état « inconfort climatique » avec icône (thermomètre) et raison dans le panneau.
- Météo du jour tirée au PRNG selon la saison (soleil, pluie, neige, canicule), annoncée la veille : la pluie réduit
  les arrivées et accélère la perte de patience hors abri (restaurant, toilettes) ; la canicule assoiffe les animaux.
- Rendu : teinte saisonnière du terrain et des arbres, particules de pluie et de neige (coupées avec
  `prefers-reduced-motion`), ciel selon la météo.
- Scénario `seasons` : même zoo en été et en hiver, dont un enclos sans abri.

**Critères d'acceptation**
- [ ] On reconnaît la saison et la météo sur une capture sans lire l'interface.
- [ ] Un lion sans abri en hiver va moins bien et le panneau dit pourquoi ; avec un abri, non.
- [ ] La fréquentation varie selon la saison et la météo, visible dans les bilans des jours.
- [ ] Météo et saisons déterministes (même seed, même calendrier) et conservées par la sauvegarde.
- [ ] Tests : calendrier, climat et abri, tirage météo, effets sur les arrivées.
- [ ] Revue visuelle : `seasons` capturé (été, hiver, pluie) ; contraste des icônes et des textes suffisant sur fond de neige.

**Prompt** : « Réalise l'itération 10. Les effets de saison et de météo sont des multiplicateurs en données. »

---

## Itération 11 : Événements, objectifs et équilibrage V0.2 (4 à 6 h)

**Objectif** : un palier qui se joue une heure avec des buts et des surprises.

**Tâches**
- Événements en données (`sim/data/events.ts` : déclencheur, probabilité par saison, préavis, durée, effets) :
  - **fête** : arrivées ×1,5 pendant une journée ;
  - **visite scolaire** : un groupe d'enfants arrive ensemble, suit un parcours et repart ensemble ;
  - **inspection** : annoncée deux jours avant ; verdict selon le bien-être des animaux et la propreté
    (bonus de note ou amende).
- UI : prochains événements dans la colonne d'information ; annonce `aria-live` à l'arrivée d'un événement
  (et des alertes, dette du POC).
- Scénario « Tour du monde », suite de « Premiers pas » en données : par exemple 3 biomes, 8 espèces, une parcelle
  achetée, passer un hiver sans perte, réussir une inspection.
- Rythme (dette du POC) : revoir durée de journée et vitesse de marche au vu des parties scriptées et des distances
  mesurées sur un zoo agrandi (itération 7), décision notée.
- Équilibrage : parties scriptées étendues aux contenus V0.2, prix des parcelles compris ; performance mesurée.
- Playtest humain : critères de succès du palier ci-dessous, à consigner dans le journal des playtests.
- Scénario `events` : jour de fête et visite scolaire.

**Critères d'acceptation**
- [ ] Chaque événement est annoncé avant d'arriver et son effet se voit (foule, groupe, verdict).
- [ ] « Tour du monde » est gagnable avec une bonne stratégie scriptée, perdable avec une mauvaise.
- [ ] 60 fps avec ~80 animaux et ~200 visiteurs sur un zoo agrandi (sinon, cause notée dans `08-decisions.md`).
- [ ] Les critères de succès du palier sont évalués et cochés (ou ce qui manque est listé).
- [ ] Revue complète : tous les scénarios du palier sur les 3 viewports ; zéro violation axe serious/critical ;
  références de régression visuelle mises à jour.

**Prompt** : « Réalise l'itération 11, puis fais-moi un compte rendu des critères de succès du palier V0.2. »

---

## Critères de succès du palier V0.2

Le palier est réussi si, après une heure de jeu :

- [ ] On a encore un but ou une envie d'achat au jour 20 (pas de bac à sable vide après le jour 5).
- [ ] Chaque biome a son identité ; on reconnaît les douze espèces sans étiquette.
- [ ] Le zoo ne paraît plus trop serré : on agrandit quand on en a besoin, et l'achat d'une parcelle se mérite sans se faire attendre.
- [ ] On **prépare** l'hiver (abris, eau, services) plutôt que de le subir.
- [ ] Les événements créent des pics d'intérêt sans frustration (annoncés, jamais punitifs sans prévenir).
- [ ] L'argent a des usages : un zoo riche investit dans du terrain, des services et des espèces chères au lieu d'accumuler.

## Données de départ des nouvelles espèces

Valeurs à équilibrer (comme `02-regles-du-jeu-poc.md`). Climat des espèces du POC : zèbre, girafe et lion `warm`,
panda `temperate`.

| Espèce | Itération | Biome préféré (toléré) | Eau voulue | Climat | Groupe | Surface / animal | Prix | Intérêt | Particularités |
|---|---|---|---|---|---|---|---|---|---|
| Manchot | 5 | neige | 25 % | `cold` | 4 à 12 | 6 | 2 500 | 7 | très mignon, se baigne |
| Dromadaire | 5 | désert (savane) | non | `warm` | 1 à 4 | 15 | 4 000 | 5 | boit peu, aime les cactus |
| Gorille | 5 | jungle (forêt) | non | `warm` | 2 à 6 | 25 | 14 000 | 9 | joue, aime les fougères |
| Éléphant | 6 | savane | 10 % | `warm` | 2 à 6 | 45 | 20 000 | 10 | se baigne, très coûteux à nourrir |
| Hippopotame | 6 | savane (jungle) | 40 % | `warm` | 1 à 4 | 25 | 10 000 | 8 | passe ses journées dans l'eau |
| Ours polaire | 6 | neige | 20 % | `cold` | 1 à 2 | 35 | 15 000 | 9 | prédateur, se baigne |
| Flamant rose | 6 | désert (savane) | 30 % | `warm` | 6 à 20 | 4 | 1 500 | 5 | groupe nombreux, cohabite volontiers |
| Kangourou | 6 | désert (herbe) | non | `warm` | 3 à 10 | 12 | 5 000 | 7 | bondit, jeunes très mignons |
