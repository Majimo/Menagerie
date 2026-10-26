# 02 : Règles du jeu (POC)

Tous les chiffres sont des **valeurs de départ à équilibrer** pendant l'itération 4.
Ils vivent dans `src/sim/data/balance.ts` et `src/sim/data/species.ts`, jamais en dur dans les systèmes.

## Temps

- Tick de simulation : **10 Hz** (100 ms).
- 1 jour de jeu = **1 200 ticks** (2 minutes réelles à vitesse ×1).
- Vitesses : pause, ×1, ×2, ×4.
- Phases : jour (ouverture 08:00 → fermeture 20:00 de jeu), nuit (les visiteurs partent, les animaux dorment).

## Carte et terrain

- Grille 48×48, 1 tuile = 1 unité Three.js. Terrain plat.
- Types de sol : `grass`, `savanna`, `forest`, `sand`, `water`, `path`.
- Le sol non-chemin s'appelle un **biome** et sert à la compatibilité avec les espèces.
- **Entrée** et **sortie** du zoo : pré-placées sur un bord de carte, non déplaçables.

## Construction

| Élément | Taille | Coût | Notes |
|---|---|---|---|
| Chemin | 1 tuile | 5 | Les visiteurs ne marchent que dessus |
| Clôture | 1 segment (arête de tuile) | 10 | Une boucle fermée de clôtures = un **enclos** |
| Peinture de biome | 1 tuile | 2 | `savanna`, `forest`, `grass`, `sand` |
| Point d'eau | 1 tuile | 30 | Sol `water` dans un enclos |
| Nourrisseur | 1×1 | 150 | Dans un enclos, se remplit automatiquement (coût de nourriture journalier) |
| Arbre / rocher / bambou | 1×1 | 20 | Décor : « enrichissement » pour l'habitat |
| Banc | 1×1 | 40 | Sur un chemin, augmente légèrement le confort des visiteurs |
| Stand de snacks | 1×2 | 400 | Visiteurs affamés y dépensent ; revenu + satisfaction |

**Enclos** : détecté par remplissage (flood fill) à partir des tuiles délimitées par clôtures.
Un enclos a un id stable tant que sa forme ne change pas radicalement ; sinon les animaux sont
réassignés au nouvel enclos qui contient leur position. Un enclos sans portail est autorisé au POC
(pas de gardiens à faire entrer).

**Zones d'observation** : tuile de chemin adjacente à une clôture d'enclos qui contient au moins un animal.

## Espèces (données de départ)

| Espèce | Biome préféré | Surface min. / animal | Groupe | Prix | Particularités |
|---|---|---|---|---|---|
| Zèbre | `savanna` | 12 tuiles | social, ≥ 2 | 3 000 | herbivore |
| Girafe | `savanna` | 20 tuiles | social, ≥ 2 | 6 000 | herbivore, aime les arbres |
| Lion | `savanna` | 25 tuiles | 1 à 4 | 9 000 | carnivore : **refuse** de cohabiter avec des herbivores |
| Panda | `forest` | 30 tuiles | solitaire | 12 000 | aime le bambou |

Chaque espèce définit aussi : `interest` (attractivité pour les visiteurs, 1 à 10), `foodPerDay`,
`waterPerDay`, `modelId`, `iconId`, taille d'affichage.

## Besoins des animaux

Chaque animal a trois jauges de 0 à 100 :

- **Faim** : baisse de `foodPerDay` par jour ; remonte quand il mange au nourrisseur.
- **Soif** : baisse de `waterPerDay` par jour ; remonte au point d'eau.
- **Bien-être** : tend lentement vers le **score d'habitat** de son enclos.

États visibles : `content`, `hungry`, `thirsty`, `unhappy`, `sick`, `sleeping`.
Si une jauge reste à 0 pendant 2 jours, la **santé** baisse ; santé à 0 = l'animal meurt (gros malus de note).

### Score d'habitat (0 à 100)

| Critère | Poids | Calcul |
|---|---|---|
| Surface | 35 % | surface réelle / (surface min. × nb d'animaux), plafonné à 1 |
| Biome | 25 % | part des tuiles de l'enclos du biome préféré |
| Eau | 15 % | 1 si au moins 1 tuile d'eau, sinon 0 |
| Nourriture | 10 % | 1 si au moins 1 nourrisseur, sinon 0 |
| Enrichissement | 15 % | nb de décors liés à l'espèce, plafonné (ex. 4 = 1) |

Malus : espèce sociale seule (−20 de bien-être cible), cohabitation interdite (−40, bloquée à l'achat si possible).

## Visiteurs

Deux types au POC : **adulte** et **enfant** (modèles et paramètres distincts : l'enfant a plus d'intérêt
pour les animaux « mignons », se fatigue vite).

Jauges : **satisfaction** (0 à 100), **faim**, **patience**, **énergie** (baisse en marchant, plus vite chez l'enfant).

Machine à états :

```
ARRIVING → WANDERING → WALKING_TO_VIEW → VIEWING → (WALKING_TO_FOOD → EATING)? → WANDERING … → LEAVING → GONE
```

- Choix de la cible : zone d'observation pondérée par `interest` de l'espèce, bien-être des animaux,
  distance, et ce qui a déjà été vu (lassitude).
- `VIEWING` dure 8 à 20 s de jeu ; le gain de satisfaction dépend du bien-être et de la visibilité
  (animal proche de la clôture).
- Faim élevée → cherche un stand de snacks ; s'il n'y en a pas, la satisfaction baisse.
- Patience épuisée (trop de marche, rien à voir) → part mécontent.
- Énergie basse → cherche un **banc** libre (2 places), s'y assoit et récupère énergie, patience et un peu de
  satisfaction. Sans banc, un visiteur fatigué perd patience deux fois plus vite.
- Satisfaction finale au départ → alimente la **note du zoo**.

## Économie

- Argent de départ : **50 000**.
- Billet d'entrée : réglable 5 à 50, défaut 15. Prix accepté ≈ 6 + 4 × note ; au-delà, les arrivées chutent.
- Arrivées : `visitorsPerDay = base × f(note du zoo, prix du billet, diversité d'espèces)`.
- Dépenses récurrentes (par jour) : nourriture des animaux, entretien des équipements (1 % du coût de construction).
- Revenus : billets, snacks (marge 60 %).
- **Note du zoo** (1 à 5 étoiles) : moyenne pondérée du bien-être moyen des animaux, de la satisfaction
  moyenne des visiteurs (7 derniers jours), de la diversité d'espèces ; pénalité par animal mort récent. Un zoo qui
  ouvre part de 2,5 étoiles ; la note rejoint peu à peu la note visée (+0,6 étoile par jour au plus, −1,2 en baisse).
- Équilibrage vérifié par deux parties scriptées (`tests/sim/balance.test.ts`), voir ADR-029.

## Objectifs et fin de partie

Scénario « Premiers pas » :

1. Accueillir 2 espèces.
2. Atteindre 100 visiteurs sur un même jour.
3. Atteindre 3 étoiles.
4. Atteindre 4 espèces et 4 étoiles.

Objectifs successifs (un seul en cours, affiché en haut à gauche). **Défaite** : argent < 0 pendant 10 jours consécutifs
(compté à chaque fin de journée, alerte « Faillite dans N jours »). Pas de victoire « finale » au POC : mode bac à sable après les objectifs.

## Sauvegarde

Un fichier JSON versionné (`saveVersion`), contenant l'état de simulation complet + la seed du PRNG.
Stockage local (localStorage au début, IndexedDB si la taille l'exige). Une migration est écrite dès qu'on change le format.
