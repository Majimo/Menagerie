import { balance } from './data/balance';
import type { BuildingKind } from './data/buildings';
import { FIRST_STEPS } from './data/scenario';
import type { SpeciesId } from './data/species';
import { tileCode } from './data/terrain';
import type { VisitorKind } from './data/visitors';
import { type TileCoord, tileIndex } from './world/grid';

// État global de la simulation : de la donnée pure, sérialisable en JSON (règle d'architecture n° 4).
// Il s'enrichit à chaque itération (animaux, visiteurs…).

export const SAVE_VERSION = 4;

export type EnclosureId = number;

export interface Enclosure {
  id: EnclosureId;
  /** Indices des tuiles de l'enclos, triés. */
  tiles: number[];
  /** Surface en tuiles. */
  area: number;
}

export type AnimalId = number;
export type BuildingId = number;

/** Ce que fait l'animal en ce moment (pilote l'animation). */
export type AnimalActivity = 'idle' | 'walk' | 'eat' | 'drink' | 'sleep' | 'dead';

/** But du trajet en cours. */
export type AnimalGoal = 'wander' | 'eat' | 'drink';

export interface Animal {
  id: AnimalId;
  species: SpeciesId;
  /** Enclos qui contient l'animal, 0 s'il n'est dans aucun (clôture démolie). */
  enclosureId: EnclosureId;
  /** Position continue en tuiles : le centre de la tuile (x, y) est (x + 0,5 ; y + 0,5). */
  x: number;
  y: number;
  /** Position au tick précédent, pour l'interpolation au rendu. */
  prevX: number;
  prevY: number;
  /** Direction du regard, en radians dans le plan (0 = vers l'est, sens horaire vu de dessus). */
  heading: number;
  activity: AnimalActivity;
  /** Ticks restants de l'activité en cours (pause, repas, boisson). */
  activityTicks: number;
  goal: AnimalGoal;
  /** Tuiles restantes du trajet (indices), la prochaine en tête. */
  path: number[];
  /** Jauges de 0 à 100. */
  hunger: number;
  thirst: number;
  wellbeing: number;
  health: number;
  /** Ticks consécutifs avec au moins une jauge à 0. */
  deprivationTicks: number;
  /** Tick de la mort, -1 si vivant. */
  diedAt: number;
}

export type VisitorId = number;

/** Machine à états des visiteurs (docs/02). `GONE` = retiré de l'état. */
export type VisitorState =
  | 'arriving'
  | 'wandering'
  | 'walkingToView'
  | 'viewing'
  | 'walkingToFood'
  | 'eating'
  | 'walkingToBench'
  | 'resting'
  | 'leaving';

/** Avancement de la demande de trajet : le système `pathfinding` la traite avec un budget par tick. */
export type PathStatus = 'none' | 'pending' | 'ready' | 'failed';

/** Réaction visible au-dessus du visiteur pendant quelques ticks. */
export type VisitorReaction = 'none' | 'joy' | 'sad';

export interface Visitor {
  id: VisitorId;
  kind: VisitorKind;
  /** Variante de couleur du modèle. */
  variant: number;
  /** Position continue en tuiles, comme les animaux, et position du tick précédent. */
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  heading: number;
  state: VisitorState;
  /** Ticks restants de l'observation, du repas ou de la pause sur un banc. */
  stateTicks: number;
  /** Tuile visée (zone d'observation, stand, banc, sortie), -1 si aucune. */
  goal: number;
  pathStatus: PathStatus;
  /** Tuiles restantes du trajet, la prochaine en tête. */
  path: number[];
  /** Enclos visé ou observé, 0 sinon. */
  targetEnclosure: EnclosureId;
  /** Jauges de 0 à 100 (faim : 100 = rassasié, comme les animaux). */
  satisfaction: number;
  hunger: number;
  patience: number;
  /** Enclos à voir avant de partir. */
  viewsWanted: number;
  /** Enclos déjà observés (un id par observation : sert à la lassitude). */
  seen: EnclosureId[];
  /** Ticks consécutifs sans trajet possible. */
  blockedTicks: number;
  reaction: VisitorReaction;
  reactionTick: number;
  /** Raison du départ, si le visiteur s'en va. */
  leaveReason: VisitorLeaveReason | null;
  arrivedAt: number;
}

export type VisitorLeaveReason = 'done' | 'impatient' | 'closing' | 'blocked';

/** Recettes et dépenses d'une journée (le bilan). Dépenses en valeurs positives. */
export interface DayLedger {
  day: number;
  tickets: number;
  snacks: number;
  /** Constructions nettes des remboursements de démolition. */
  construction: number;
  animalPurchases: number;
  animalFood: number;
  upkeep: number;
  visitors: number;
  /** Somme des satisfactions des visiteurs repartis et leur nombre. */
  satisfactionSum: number;
  departures: number;
}

export interface ZooStats {
  /** Note du zoo, de 1 à 5 étoiles (décimale). */
  rating: number;
  today: DayLedger;
  /** Bilans des derniers jours terminés, le plus récent en dernier. */
  history: DayLedger[];
  /** Ticks des morts d'animaux récentes (pénalité de note). */
  deathTicks: number[];
}

export interface Building {
  id: BuildingId;
  kind: BuildingKind;
  tile: TileCoord;
}

export interface World {
  width: number;
  height: number;
  /** Type de sol de chaque tuile : indice dans `TILE_TYPES` (data/terrain.ts). */
  tiles: number[];
  /** Clôture (1) ou non (0) sur chaque arête horizontale, voir world/grid.ts. */
  fencesH: number[];
  /** Clôture (1) ou non (0) sur chaque arête verticale. */
  fencesV: number[];
  entrance: TileCoord;
  exit: TileCoord;
  /** Enclos de chaque tuile, 0 si aucun. Recalculé quand les clôtures changent. */
  enclosureOf: number[];
  /** Les clôtures ont changé depuis la dernière détection d'enclos. */
  enclosuresDirty: boolean;
  /** Incrémenté à chaque changement de sol, de clôture ou d'objet : invalide les caches (réseau des visiteurs, trajets). */
  revision: number;
}

/** Avancement du scénario « Premiers pas » (data/scenario.ts). */
export interface ScenarioProgress {
  /** Tick d'obtention de chaque objectif, dans l'ordre des objectifs ; -1 tant qu'il n'est pas atteint. */
  completedAt: number[];
  /** Jours consécutifs terminés avec un argent négatif. */
  debtDays: number;
  /** Dernier jour dont la fin a été comptée. */
  lastDayChecked: number;
  /** `lost` : faillite, la partie est terminée. */
  outcome: 'playing' | 'lost';
}

export interface GameState {
  saveVersion: number;
  seed: number;
  /** Compteur de ticks écoulés depuis le début de la partie (10 Hz). */
  tick: number;
  rngState: number;
  money: number;
  ticketPrice: number;
  world: World;
  enclosures: Record<EnclosureId, Enclosure>;
  nextEnclosureId: EnclosureId;
  animals: Record<AnimalId, Animal>;
  nextAnimalId: AnimalId;
  buildings: Record<BuildingId, Building>;
  nextBuildingId: BuildingId;
  visitors: Record<VisitorId, Visitor>;
  nextVisitorId: VisitorId;
  stats: ZooStats;
  scenario: ScenarioProgress;
}

export function createInitialState(seed = 1): GameState {
  return {
    saveVersion: SAVE_VERSION,
    seed,
    tick: 0,
    rngState: seed >>> 0,
    money: balance.startingMoney,
    ticketPrice: balance.economy.ticketPrice.default,
    world: createWorld(),
    enclosures: {},
    nextEnclosureId: 1,
    animals: {},
    nextAnimalId: 1,
    buildings: {},
    nextBuildingId: 1,
    visitors: {},
    nextVisitorId: 1,
    stats: {
      rating: 1 + 4 * balance.rating.weights.satisfaction * (balance.rating.defaultSatisfaction / 100),
      today: createLedger(1),
      history: [],
      deathTicks: [],
    },
    scenario: {
      completedAt: FIRST_STEPS.objectives.map(() => -1),
      debtDays: 0,
      lastDayChecked: 0,
      outcome: 'playing',
    },
  };
}

export function createLedger(day: number): DayLedger {
  return {
    day,
    tickets: 0,
    snacks: 0,
    construction: 0,
    animalPurchases: 0,
    animalFood: 0,
    upkeep: 0,
    visitors: 0,
    satisfactionSum: 0,
    departures: 0,
  };
}

function createWorld(): World {
  const { width, height, entrance, exit } = balance.map;
  const size = { width, height };
  const tiles = new Array<number>(width * height).fill(tileCode('grass'));
  tiles[tileIndex(size, entrance)] = tileCode('path');
  tiles[tileIndex(size, exit)] = tileCode('path');
  return {
    width,
    height,
    tiles,
    fencesH: new Array<number>(width * (height + 1)).fill(0),
    fencesV: new Array<number>((width + 1) * height).fill(0),
    entrance: { ...entrance },
    exit: { ...exit },
    enclosureOf: new Array<number>(width * height).fill(0),
    enclosuresDirty: false,
    revision: 0,
  };
}
