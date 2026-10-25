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
  },
  /** Part du coût rendue à la démolition. */
  demolishRefundRatio: 0.5,
  time: {
    tickMs: 100,
    /** Plafond de ticks rattrapés par frame : évite la spirale quand l'onglet a été mis en veille. */
    maxTicksPerFrame: 8,
  },
} as const;
