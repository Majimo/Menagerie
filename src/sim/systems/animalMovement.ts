import { balance } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { SPECIES } from '../data/species';
import { tileCode } from '../data/terrain';
import { nextInt } from '../rng';
import type { Animal, GameState } from '../state';
import { timeOfDay } from '../time';
import { inBounds, tileAt, tileIndex } from '../world/grid';
import { findPath, isWalkable, occupiedTiles, openNeighbours } from '../world/paths';

// Système `animalMovement` : errance dans l'enclos, trajets vers le nourrisseur et l'eau, repas, sommeil.

interface MoveContext {
  state: GameState;
  occupied: Set<number>;
  feeders: Set<number>;
  sleeping: boolean;
}

export function updateAnimalMovement(state: GameState): void {
  const occupied = occupiedTiles(state);
  const feeders = new Set<number>();
  for (const building of Object.values(state.buildings)) {
    if (BUILDINGS[building.kind].feeds) feeders.add(tileIndex(state.world, building.tile));
  }
  const ctx: MoveContext = { state, occupied, feeders, sleeping: timeOfDay(state.tick).sleeping };
  for (const animal of Object.values(state.animals)) {
    animal.prevX = animal.x;
    animal.prevY = animal.y;
    if (animal.diedAt < 0) moveAnimal(ctx, animal);
  }
}

function moveAnimal(ctx: MoveContext, animal: Animal): void {
  if (animal.enclosureId === 0) {
    animal.activity = 'idle';
    animal.path = [];
    return;
  }
  if (ctx.sleeping) {
    if (animal.activity !== 'sleep') {
      animal.activity = 'sleep';
      animal.path = [];
    }
    return;
  }
  switch (animal.activity) {
    case 'sleep':
      rest(ctx, animal, 0);
      return;
    case 'eat':
    case 'drink':
      if (--animal.activityTicks > 0) return;
      finishMeal(animal);
      rest(ctx, animal);
      return;
    case 'walk':
      walk(ctx, animal);
      return;
    default:
      if (--animal.activityTicks > 0) return;
      decide(ctx, animal);
  }
}

/** Pause sur place, de durée aléatoire par défaut. */
function rest(ctx: MoveContext, animal: Animal, ticks?: number): void {
  const [min, max] = balance.animals.idleTicks;
  animal.activity = 'idle';
  animal.goal = 'wander';
  animal.path = [];
  animal.activityTicks = ticks ?? nextInt(ctx.state, min, max);
}

function finishMeal(animal: Animal): void {
  const { eatGain, drinkGain } = balance.animals;
  if (animal.activity === 'eat') animal.hunger = Math.min(100, animal.hunger + eatGain);
  else animal.thirst = Math.min(100, animal.thirst + drinkGain);
}

function decide(ctx: MoveContext, animal: Animal): void {
  const { seekFoodBelow, seekWaterBelow } = balance.animals;
  const { world } = ctx.state;
  const water = tileCode('water');
  const nextTo = (predicate: (n: number) => boolean) => (index: number) =>
    openNeighbours(world, index).some(predicate);

  if (
    animal.thirst < seekWaterBelow &&
    startTrip(
      ctx,
      animal,
      'drink',
      nextTo((n) => world.tiles[n] === water),
    )
  )
    return;
  if (
    animal.hunger < seekFoodBelow &&
    startTrip(
      ctx,
      animal,
      'eat',
      nextTo((n) => ctx.feeders.has(n)),
    )
  )
    return;

  const target = wanderTarget(ctx, animal);
  if (target !== null && startTrip(ctx, animal, 'wander', (index) => index === target)) return;
  rest(ctx, animal);
}

/** Tuile praticable de l'enclos, proche de l'animal, tirée au hasard ; null si aucun essai n'aboutit. */
function wanderTarget(ctx: MoveContext, animal: Animal): number | null {
  const { wanderRadius, wanderTries } = balance.animals;
  const { world } = ctx.state;
  for (let i = 0; i < wanderTries; i++) {
    const tile = {
      x: Math.floor(animal.x) + nextInt(ctx.state, -wanderRadius, wanderRadius + 1),
      y: Math.floor(animal.y) + nextInt(ctx.state, -wanderRadius, wanderRadius + 1),
    };
    if (!inBounds(world, tile)) continue;
    const index = tileIndex(world, tile);
    if (isWalkable(world, ctx.occupied, animal.enclosureId, index)) return index;
  }
  return null;
}

function startTrip(
  ctx: MoveContext,
  animal: Animal,
  goal: Animal['goal'],
  isGoal: (index: number) => boolean,
): boolean {
  const start = tileIndex(ctx.state.world, { x: Math.floor(animal.x), y: Math.floor(animal.y) });
  const path = findPath(ctx.state.world, ctx.occupied, animal.enclosureId, start, isGoal);
  if (!path) return false;
  animal.goal = goal;
  animal.path = path;
  animal.activity = 'walk';
  walk(ctx, animal);
  return true;
}

function walk(ctx: MoveContext, animal: Animal): void {
  const { world } = ctx.state;
  const next = animal.path[0];
  if (next === undefined) {
    arrive(ctx, animal);
    return;
  }
  if (!isWalkable(world, ctx.occupied, animal.enclosureId, next)) {
    // Un objet ou de l'eau a été posé sur le trajet : on repart d'ici.
    rest(ctx, animal, 0);
    return;
  }
  const tile = tileAt(world, next);
  const dx = tile.x + 0.5 - animal.x;
  const dy = tile.y + 0.5 - animal.y;
  const distance = Math.hypot(dx, dy);
  const speed = SPECIES[animal.species].walkSpeed;
  if (distance > 0) animal.heading = Math.atan2(dy, dx);
  if (distance <= speed) {
    animal.x = tile.x + 0.5;
    animal.y = tile.y + 0.5;
    animal.path.shift();
  } else {
    animal.x += (dx / distance) * speed;
    animal.y += (dy / distance) * speed;
  }
}

function arrive(ctx: MoveContext, animal: Animal): void {
  const { world } = ctx.state;
  const here = tileIndex(world, { x: Math.floor(animal.x), y: Math.floor(animal.y) });
  const water = tileCode('water');
  const target = openNeighbours(world, here).find((n) =>
    animal.goal === 'eat' ? ctx.feeders.has(n) : animal.goal === 'drink' && world.tiles[n] === water,
  );
  if (target === undefined) {
    rest(ctx, animal);
    return;
  }
  const tile = tileAt(world, target);
  animal.heading = Math.atan2(tile.y + 0.5 - animal.y, tile.x + 0.5 - animal.x);
  animal.activity = animal.goal === 'eat' ? 'eat' : 'drink';
  animal.activityTicks = animal.goal === 'eat' ? balance.animals.eatTicks : balance.animals.drinkTicks;
  animal.path = [];
}
