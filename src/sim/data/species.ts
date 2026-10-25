import type { BuildingKind } from './buildings';
import type { TileType } from './terrain';

// Espèces (docs/02). Ajouter une espèce = ajouter une entrée ici, plus ses textes et, au besoin, un modèle.

export type Diet = 'herbivore' | 'carnivore';

export interface SpeciesDef {
  diet: Diet;
  preferredBiome: TileType;
  /** Surface minimale par animal, en tuiles. */
  minAreaPerAnimal: number;
  /** Taille de groupe : en dessous de `minGroup`, l'animal se sent seul ; au-delà de `maxGroup`, achat refusé. */
  minGroup: number;
  maxGroup: number;
  price: number;
  /** Attractivité pour les visiteurs, 1 à 10 (itération 3). */
  interest: number;
  /** Points de faim et de soif perdus par jour de jeu. */
  foodPerDay: number;
  waterPerDay: number;
  /** Décors qui comptent comme enrichissement pour l'espèce. */
  likedDecor: readonly BuildingKind[];
  /** Vitesse de marche, en tuiles par tick. */
  walkSpeed: number;
  modelId: string;
  iconId: string;
  /** Échelle d'affichage du modèle. */
  displayScale: number;
}

export const SPECIES = {
  zebra: {
    diet: 'herbivore',
    preferredBiome: 'savanna',
    minAreaPerAnimal: 12,
    minGroup: 2,
    maxGroup: 8,
    price: 3_000,
    interest: 5,
    foodPerDay: 60,
    waterPerDay: 70,
    likedDecor: ['tree', 'rock'],
    walkSpeed: 0.12,
    modelId: 'animal.zebra',
    iconId: 'zebra',
    displayScale: 1,
  },
  giraffe: {
    diet: 'herbivore',
    preferredBiome: 'savanna',
    minAreaPerAnimal: 20,
    minGroup: 2,
    maxGroup: 6,
    price: 6_000,
    interest: 7,
    foodPerDay: 60,
    waterPerDay: 50,
    likedDecor: ['tree'],
    walkSpeed: 0.1,
    modelId: 'animal.giraffe',
    iconId: 'giraffe',
    displayScale: 1,
  },
  lion: {
    diet: 'carnivore',
    preferredBiome: 'savanna',
    minAreaPerAnimal: 25,
    minGroup: 1,
    maxGroup: 4,
    price: 9_000,
    interest: 9,
    foodPerDay: 50,
    waterPerDay: 60,
    likedDecor: ['rock', 'tree'],
    walkSpeed: 0.1,
    modelId: 'animal.lion',
    iconId: 'lion',
    displayScale: 1,
  },
  panda: {
    diet: 'herbivore',
    preferredBiome: 'forest',
    minAreaPerAnimal: 30,
    minGroup: 1,
    maxGroup: 1,
    price: 12_000,
    interest: 10,
    foodPerDay: 70,
    waterPerDay: 50,
    likedDecor: ['bamboo'],
    walkSpeed: 0.07,
    modelId: 'animal.panda',
    iconId: 'panda',
    displayScale: 1.15,
  },
} as const satisfies Record<string, SpeciesDef>;

export type SpeciesId = keyof typeof SPECIES;

export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];

export function speciesDef(id: SpeciesId): SpeciesDef {
  return SPECIES[id];
}

/** Deux espèces peuvent-elles partager un enclos ? Carnivores et herbivores sont séparés. */
export function canCohabit(a: SpeciesId, b: SpeciesId): boolean {
  return a === b || SPECIES[a].diet === SPECIES[b].diet;
}
