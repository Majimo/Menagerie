// Scénario « Premiers pas » (docs/02) : objectifs successifs et condition de défaite.
// Pas de victoire finale au POC : la partie continue en bac à sable une fois les objectifs atteints.

export type ObjectiveCondition =
  /** Espèces différentes vivantes dans le zoo. */
  | { kind: 'species'; min: number }
  /** Visiteurs arrivés dans la journée en cours. */
  | { kind: 'visitorsInDay'; min: number }
  /** Note du zoo, en étoiles. */
  | { kind: 'rating'; min: number };

export interface ObjectiveDef {
  /** Clé des textes (`objective.<id>` dans ui/i18n/fr.ts). */
  id: string;
  /** Toutes les conditions doivent être remplies en même temps. */
  conditions: readonly ObjectiveCondition[];
}

export interface ScenarioDef {
  objectives: readonly ObjectiveDef[];
  /** Défaite : argent négatif à minuit pendant ce nombre de jours consécutifs. */
  bankruptcyDays: number;
  /** Vérification des objectifs tous les N ticks. */
  checkEveryTicks: number;
}

export const FIRST_STEPS: ScenarioDef = {
  objectives: [
    { id: 'twoSpecies', conditions: [{ kind: 'species', min: 2 }] },
    { id: 'hundredVisitors', conditions: [{ kind: 'visitorsInDay', min: 100 }] },
    { id: 'threeStars', conditions: [{ kind: 'rating', min: 3 }] },
    {
      id: 'fourSpeciesFourStars',
      conditions: [
        { kind: 'species', min: 4 },
        { kind: 'rating', min: 4 },
      ],
    },
  ],
  bankruptcyDays: 10,
  checkEveryTicks: 10,
};
