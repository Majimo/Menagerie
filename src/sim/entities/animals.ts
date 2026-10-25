import { balance } from '../data/balance';
import type { SpeciesId } from '../data/species';
import { nextFloat } from '../rng';
import type { Animal, GameState } from '../state';
import { type TileCoord, tileIndex } from '../world/grid';

// Création des animaux et état affiché.

/** État visible d'un animal (icône au-dessus de lui, panneau d'inspection). */
export type AnimalStatus = 'dead' | 'sick' | 'thirsty' | 'hungry' | 'unhappy' | 'sleeping' | 'content';

export function createAnimal(state: GameState, species: SpeciesId, tile: TileCoord): Animal {
  const { animals } = balance;
  const animal: Animal = {
    id: state.nextAnimalId,
    species,
    enclosureId: state.world.enclosureOf[tileIndex(state.world, tile)] ?? 0,
    x: tile.x + 0.5,
    y: tile.y + 0.5,
    prevX: tile.x + 0.5,
    prevY: tile.y + 0.5,
    heading: nextFloat(state) * Math.PI * 2,
    activity: 'idle',
    activityTicks: 0,
    goal: 'wander',
    path: [],
    hunger: animals.startHunger,
    thirst: animals.startThirst,
    wellbeing: animals.startWellbeing,
    health: animals.startHealth,
    deprivationTicks: 0,
    diedAt: -1,
  };
  state.animals[animal.id] = animal;
  state.nextAnimalId += 1;
  return animal;
}

/** État le plus important à signaler : la mort et la maladie passent avant le reste. */
export function animalStatus(animal: Readonly<Animal>): AnimalStatus {
  const { hungryBelow, thirstyBelow, unhappyBelow, startHealth } = balance.animals;
  if (animal.diedAt >= 0) return 'dead';
  if (animal.health < startHealth) return 'sick';
  if (animal.thirst < thirstyBelow) return 'thirsty';
  if (animal.hunger < hungryBelow) return 'hungry';
  if (animal.wellbeing < unhappyBelow) return 'unhappy';
  if (animal.activity === 'sleep') return 'sleeping';
  return 'content';
}
