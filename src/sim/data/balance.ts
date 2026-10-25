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
} as const;
