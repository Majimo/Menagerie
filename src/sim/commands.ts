import { balance } from './data/balance';
import { BUILDINGS, type BuildingKind } from './data/buildings';
import { canCohabit, SPECIES, type SpeciesId } from './data/species';
import { type PaintableBiome, tileCode } from './data/terrain';
import { createAnimal } from './entities/animals';
import type { Building, DayLedger, GameState, World } from './state';
import {
  type Edge,
  edgeInBounds,
  edgeIndex,
  inBounds,
  sameTile,
  type TileCoord,
  tileIndex,
} from './world/grid';
import { openNeighbours } from './world/paths';

// Commandes du joueur : de la donnée, validée puis appliquée par la simulation (règle d'architecture n° 2).

export type DemolishTarget = { kind: 'tile'; tile: TileCoord } | { kind: 'fence'; edge: Edge };

export type Command =
  | { type: 'PlacePath'; tile: TileCoord }
  | { type: 'PlaceFence'; edge: Edge }
  | { type: 'PaintBiome'; tile: TileCoord; biome: PaintableBiome }
  | { type: 'Demolish'; target: DemolishTarget }
  | { type: 'PlaceBuilding'; tile: TileCoord; kind: BuildingKind }
  | { type: 'BuyAnimal'; tile: TileCoord; species: SpeciesId }
  | { type: 'SetTicketPrice'; price: number };

/** Raison d'un refus. L'UI l'affiche via la clé i18n `error.<raison>`. */
export type CommandError =
  | 'outOfBounds'
  | 'notEnoughMoney'
  | 'alreadyPath'
  | 'alreadyFenced'
  | 'alreadyBiome'
  | 'protectedTile'
  | 'tileIsPath'
  | 'nothingToDemolish'
  | 'notInEnclosure'
  | 'tileOccupied'
  | 'tileIsWater'
  | 'incompatibleSpecies'
  | 'groupFull'
  | 'notBesidePath'
  | 'insideEnclosure'
  | 'invalidPrice';

/** Précisions pour le message : l'espèce refusée et celle qui la gêne. */
export interface CommandErrorDetail {
  species: SpeciesId;
  other: SpeciesId;
}

/** Résultat d'une commande : `moneyDelta` est négatif pour une dépense, positif pour un remboursement. */
export type CommandResult =
  | { ok: true; moneyDelta: number }
  | { ok: false; error: CommandError; detail?: CommandErrorDetail };

function refused(error: CommandError, detail?: CommandErrorDetail): CommandResult {
  return detail ? { ok: false, error, detail } : { ok: false, error };
}

function spend(state: GameState, cost: number): CommandResult {
  return state.money < cost ? refused('notEnoughMoney') : { ok: true, moneyDelta: -cost };
}

function isProtected(world: World, tile: TileCoord): boolean {
  return sameTile(tile, world.entrance) || sameTile(tile, world.exit);
}

/** Objet posé sur la tuile, s'il y en a un. */
export function buildingAt(state: Readonly<GameState>, tile: TileCoord): Building | undefined {
  return Object.values(state.buildings).find((b) => sameTile(b.tile, tile));
}

/** Valide une commande sans modifier l'état (sert aussi à l'aperçu de placement). */
export function validateCommand(state: Readonly<GameState>, command: Command): CommandResult {
  const { world } = state;
  switch (command.type) {
    case 'PlacePath': {
      if (!inBounds(world, command.tile)) return refused('outOfBounds');
      if (world.tiles[tileIndex(world, command.tile)] === tileCode('path')) return refused('alreadyPath');
      if (buildingAt(state, command.tile)) return refused('tileOccupied');
      return spend(state, balance.costs.path);
    }
    case 'PlaceFence': {
      if (!edgeInBounds(world, command.edge)) return refused('outOfBounds');
      if (fencesOf(world, command.edge)[edgeIndex(world, command.edge)] === 1)
        return refused('alreadyFenced');
      return spend(state, balance.costs.fence);
    }
    case 'PaintBiome': {
      if (!inBounds(world, command.tile)) return refused('outOfBounds');
      const current = world.tiles[tileIndex(world, command.tile)];
      if (current === tileCode('path'))
        return refused(isProtected(world, command.tile) ? 'protectedTile' : 'tileIsPath');
      if (current === tileCode(command.biome)) return refused('alreadyBiome');
      if (command.biome !== 'water') return spend(state, balance.costs.biome);
      if (world.enclosureOf[tileIndex(world, command.tile)] === 0) return refused('notInEnclosure');
      if (buildingAt(state, command.tile)) return refused('tileOccupied');
      return spend(state, balance.costs.water);
    }
    case 'Demolish':
      return validateDemolish(state, command.target);
    case 'PlaceBuilding':
      return validatePlaceBuilding(state, command.tile, command.kind);
    case 'BuyAnimal':
      return validateBuyAnimal(state, command.tile, command.species);
    case 'SetTicketPrice': {
      const { min, max } = balance.economy.ticketPrice;
      if (!Number.isInteger(command.price) || command.price < min || command.price > max)
        return refused('invalidPrice');
      return { ok: true, moneyDelta: 0 };
    }
  }
}

/** Raison commune d'un refus de poser quelque chose sur une tuile : chemin, eau ou objet déjà là. */
function tileBlocked(state: Readonly<GameState>, tile: TileCoord): CommandError | null {
  const code = state.world.tiles[tileIndex(state.world, tile)];
  if (code === tileCode('path')) return 'tileIsPath';
  if (code === tileCode('water')) return 'tileIsWater';
  if (buildingAt(state, tile)) return 'tileOccupied';
  return null;
}

function validatePlaceBuilding(
  state: Readonly<GameState>,
  tile: TileCoord,
  kind: BuildingKind,
): CommandResult {
  const { world } = state;
  if (!inBounds(world, tile)) return refused('outOfBounds');
  const blocked = tileBlocked(state, tile);
  if (blocked) return refused(blocked);
  const inEnclosure = world.enclosureOf[tileIndex(world, tile)] !== 0;
  switch (BUILDINGS[kind].placement) {
    case 'inEnclosure':
      if (!inEnclosure) return refused('notInEnclosure');
      break;
    case 'besidePath':
      if (inEnclosure) return refused('insideEnclosure');
      if (!besidePath(world, tile)) return refused('notBesidePath');
      break;
    case 'anywhere':
      break;
  }
  return spend(state, BUILDINGS[kind].cost);
}

/** Une tuile de chemin hors enclos touche-t-elle cette tuile (sans clôture entre les deux) ? */
function besidePath(world: Readonly<World>, tile: TileCoord): boolean {
  const index = tileIndex(world, tile);
  return openNeighbours(world, index).some(
    (n) => world.tiles[n] === tileCode('path') && world.enclosureOf[n] === 0,
  );
}

function validateBuyAnimal(state: Readonly<GameState>, tile: TileCoord, species: SpeciesId): CommandResult {
  const { world } = state;
  if (!inBounds(world, tile)) return refused('outOfBounds');
  const enclosureId = world.enclosureOf[tileIndex(world, tile)];
  if (!enclosureId) return refused('notInEnclosure');
  const blocked = tileBlocked(state, tile);
  if (blocked) return refused(blocked);
  let sameSpecies = 0;
  for (const animal of Object.values(state.animals)) {
    if (animal.enclosureId !== enclosureId || animal.diedAt >= 0) continue;
    if (!canCohabit(species, animal.species))
      return refused('incompatibleSpecies', { species, other: animal.species });
    if (animal.species === species) sameSpecies++;
  }
  if (sameSpecies >= SPECIES[species].maxGroup) return refused('groupFull', { species, other: species });
  return spend(state, SPECIES[species].price);
}

function validateDemolish(state: Readonly<GameState>, target: DemolishTarget): CommandResult {
  const { world } = state;
  const refund = (cost: number): CommandResult => ({
    ok: true,
    moneyDelta: Math.floor(cost * balance.demolishRefundRatio),
  });
  if (target.kind === 'fence') {
    if (!edgeInBounds(world, target.edge)) return refused('outOfBounds');
    if (fencesOf(world, target.edge)[edgeIndex(world, target.edge)] !== 1)
      return refused('nothingToDemolish');
    return refund(balance.costs.fence);
  }
  if (!inBounds(world, target.tile)) return refused('outOfBounds');
  if (isProtected(world, target.tile)) return refused('protectedTile');
  const building = buildingAt(state, target.tile);
  if (building) return refund(BUILDINGS[building.kind].cost);
  const code = world.tiles[tileIndex(world, target.tile)];
  if (code === tileCode('path')) return refund(balance.costs.path);
  if (code === tileCode('water')) return refund(balance.costs.water);
  return refused('nothingToDemolish');
}

/** Valide puis applique une commande. L'état n'est modifié que si elle est acceptée. */
export function applyCommand(state: GameState, command: Command): CommandResult {
  const result = validateCommand(state, command);
  if (!result.ok) return result;
  const { world } = state;
  state.money += result.moneyDelta;
  recordSpending(state.stats.today, command, result.moneyDelta);
  if (command.type !== 'BuyAnimal' && command.type !== 'SetTicketPrice') world.revision += 1;
  switch (command.type) {
    case 'PlacePath':
      world.tiles[tileIndex(world, command.tile)] = tileCode('path');
      break;
    case 'PaintBiome':
      world.tiles[tileIndex(world, command.tile)] = tileCode(command.biome);
      break;
    case 'PlaceFence':
      setFence(world, command.edge, 1);
      break;
    case 'Demolish':
      if (command.target.kind === 'fence') setFence(world, command.target.edge, 0);
      else demolishTile(state, command.target.tile);
      break;
    case 'PlaceBuilding':
      state.buildings[state.nextBuildingId] = {
        id: state.nextBuildingId,
        kind: command.kind,
        tile: { ...command.tile },
      };
      state.nextBuildingId += 1;
      break;
    case 'BuyAnimal':
      createAnimal(state, command.species, command.tile);
      break;
    case 'SetTicketPrice':
      state.ticketPrice = command.price;
      break;
  }
  return result;
}

/** Inscrit la dépense (ou le remboursement) d'une commande dans le bilan du jour. */
function recordSpending(ledger: DayLedger, command: Command, moneyDelta: number): void {
  if (command.type === 'BuyAnimal') ledger.animalPurchases -= moneyDelta;
  else ledger.construction -= moneyDelta;
}

/** Démolit l'objet de la tuile s'il y en a un, sinon rend la tuile (chemin ou eau) à l'herbe. */
function demolishTile(state: GameState, tile: TileCoord): void {
  const building = buildingAt(state, tile);
  if (building) delete state.buildings[building.id];
  else state.world.tiles[tileIndex(state.world, tile)] = tileCode('grass');
}

function fencesOf(world: Readonly<World>, edge: Edge): readonly number[] {
  return edge.axis === 'h' ? world.fencesH : world.fencesV;
}

function setFence(world: World, edge: Edge, value: 0 | 1): void {
  const fences = edge.axis === 'h' ? world.fencesH : world.fencesV;
  fences[edgeIndex(world, edge)] = value;
  world.enclosuresDirty = true;
}
