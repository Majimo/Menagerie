// Équilibrage du jeu (coûts, durées, seuils) : aucun chiffre en dur dans les systèmes.
// Valeurs de départ de docs/02-regles-du-jeu-poc.md, à équilibrer à l'itération 4.

export const balance = {
  startingMoney: 50_000,
  map: {
    width: 48,
    height: 48,
    /** Entrée et sortie du zoo, sur le bord sud de la carte (le plus proche de la caméra par défaut). */
    entrance: { x: 21, y: 47 },
    exit: { x: 26, y: 47 },
  },
  costs: {
    path: 5,
    fence: 10,
    biome: 2,
    /** Point d'eau : une tuile de sol `water`, dans un enclos. */
    water: 30,
  },
  /** Part du coût rendue à la démolition. */
  demolishRefundRatio: 0.5,
  time: {
    tickMs: 100,
    /** Plafond de ticks rattrapés par frame : évite la spirale quand l'onglet a été mis en veille. */
    maxTicksPerFrame: 8,
    /** 1 jour de jeu = 1 200 ticks (2 minutes réelles à ×1). */
    ticksPerDay: 1200,
    /** Heure de jeu au tick 0. */
    startHour: 8,
    /** Les animaux dorment de `sleepHour` à `wakeHour`. */
    sleepHour: 21,
    wakeHour: 6,
    /** Nuit visuelle (éclairage) : de `nightStartHour` à `nightEndHour`. */
    nightStartHour: 20,
    nightEndHour: 7,
  },
  animals: {
    startHunger: 100,
    startThirst: 100,
    startWellbeing: 70,
    startHealth: 100,
    /** En dessous, l'animal va manger ou boire s'il le peut. */
    seekFoodBelow: 60,
    seekWaterBelow: 60,
    /** En dessous, l'état affiché devient « faim » / « soif » / « mal-être ». */
    hungryBelow: 30,
    thirstyBelow: 30,
    unhappyBelow: 40,
    /** Repas et boisson : durée en ticks, gain de jauge à la fin. */
    eatTicks: 30,
    eatGain: 70,
    drinkTicks: 20,
    drinkGain: 70,
    /** Vitesse à laquelle le bien-être rejoint sa cible, en points par jour. */
    wellbeingPerDay: 80,
    /** Jours avec une jauge à 0 avant que la santé baisse. */
    deprivationDays: 2,
    healthLossPerDay: 100,
    healthRegenPerDay: 30,
    /** Durée d'affichage d'un animal mort avant qu'il disparaisse. */
    corpseTicks: 400,
    /** Pause entre deux promenades, en ticks : [min, max). */
    idleTicks: [20, 80],
    /** Une promenade vise une tuile à au plus cette distance (en tuiles, sur chaque axe). */
    wanderRadius: 4,
    /** Essais de tirage d'une destination de promenade avant d'abandonner pour ce tour. */
    wanderTries: 6,
  },
  habitat: {
    weights: { space: 0.35, biome: 0.25, water: 0.15, food: 0.1, enrichment: 0.15 },
    /** Nombre de décors aimés pour un enrichissement complet. */
    enrichmentCap: 4,
    /** Sous ces parts, le panneau signale le critère comme un problème. */
    wrongBiomeBelow: 0.5,
    lowEnrichmentBelow: 0.5,
    lonelyMalus: 20,
    overcrowdedMalus: 20,
    incompatibleMalus: 40,
  },
  visitors: {
    /** Arrivées de `openHour` à `lastArrivalHour` ; à `closeHour`, tout le monde se dirige vers la sortie. */
    openHour: 8,
    lastArrivalHour: 17,
    closeHour: 19,
    /** Visiteurs par jour pour un zoo de référence (3 étoiles, 4 espèces, billet au prix juste). */
    basePerDay: 160,
    /** Plafond de visiteurs présents en même temps. */
    maxActive: 220,
    /** Prix juste du billet : `fairPriceBase + fairPricePerStar × note`. */
    fairPriceBase: 8,
    fairPricePerStar: 6,
    /** Sensibilité au prix : chaque tranche de 100 % au-dessus du prix juste retire `priceSensitivity`. */
    priceSensitivity: 1.6,
    /** Facteur prix : borné dans [min, max] (un billet bon marché attire un peu plus). */
    priceFactorMin: 0.03,
    priceFactorMax: 1.3,
    /** Espèces visibles pour une diversité complète. */
    diversityCap: 4,
    startSatisfaction: 50,
    startPatience: 100,
    /** Faim de départ : [min, max) ; en dessous de `hungryBelow`, le visiteur cherche un snack. */
    startHunger: [55, 100],
    hungryBelow: 35,
    /** Satisfaction perdue par tick quand il a faim sans stand de snacks accessible. */
    hungryNoFoodLossPerTick: 0.03,
    /** Patience perdue en plus par tick quand il n'y a rien à voir. */
    nothingToSeeLossPerTick: 0.3,
    /** Patience rendue à la fin d'une observation. */
    viewPatienceGain: 25,
    /** Durée d'une observation en ticks : [min, max) (8 à 20 s de jeu à ×1). */
    viewTicks: [80, 200],
    /** Satisfaction gagnée par tick d'observation pour un enclos idéal (bien-être 100, animaux visibles, intérêt 10). */
    viewGainPerTick: 0.35,
    /** Un animal est visible à cette distance (en tuiles) de la zone d'observation. */
    visibleRadius: 4,
    /** Satisfaction perdue par tick devant un enclos où un animal est mort ou très malheureux. */
    sadViewLossPerTick: 0.1,
    /** En dessous de ce bien-être moyen, la réaction est triste. */
    sadWellbeingBelow: 35,
    /** Durée d'affichage d'une réaction (éclat de joie, tristesse), en ticks. */
    reactionTicks: 25,
    /** Lassitude : intérêt multiplié par ce facteur pour chaque visite déjà faite du même enclos. */
    boredomFactor: 0.25,
    /** Portée de la distance dans le choix : poids × 1 / (1 + distance / distanceScale). */
    distanceScale: 15,
    eatTicks: 30,
    /** Satisfaction perdue quand la patience est épuisée. */
    impatientPenalty: 15,
    /** Ticks sans trajet possible avant que le visiteur abandonne (il disparaît, mécontent). */
    blockedGiveUpTicks: 300,
  },
  economy: {
    /** Prix du billet : défaut et bornes. */
    ticketPrice: { default: 20, min: 5, max: 50 },
    snackPrice: 8,
    /** Part du prix du snack qui revient au zoo. */
    snackMargin: 0.6,
    /** Entretien quotidien : part du coût de construction (chemins, clôtures, eau, objets). */
    upkeepRatio: 0.01,
  },
  rating: {
    /** Pondération de la note (somme = 1). */
    weights: { wellbeing: 0.4, satisfaction: 0.4, diversity: 0.2 },
    /** Satisfaction supposée quand aucun visiteur n'est encore reparti. */
    defaultSatisfaction: 50,
    /** Étoiles retirées par animal mort dans les `deathMemoryDays` derniers jours. */
    deathPenalty: 0.4,
    deathMemoryDays: 7,
    historyDays: 7,
    /** Recalcul de la note tous les N ticks. */
    everyTicks: 10,
  },
  pathfinding: {
    /** Recherches A* par tick au plus ; les suivantes attendent le tick suivant. */
    searchesPerTick: 24,
    /** Taille maximale du cache de trajets avant purge. */
    cacheSize: 4000,
  },
} as const;
