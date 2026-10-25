import { balance } from './data/balance';
import { type PaintableBiome, tileCode } from './data/terrain';
import type { GameState, World } from './state';
import {
  type Edge,
  edgeInBounds,
  edgeIndex,
  inBounds,
  sameTile,
  type TileCoord,
  tileIndex,
} from './world/grid';

// Commandes du joueur : de la donnée, validée puis appliquée par la simulation (règle d'architecture n° 2).

export type DemolishTarget = { kind: 'tile'; tile: TileCoord } | { kind: 'fence'; edge: Edge };

export type Command =
  | { type: 'PlacePath'; tile: TileCoord }
  | { type: 'PlaceFence'; edge: Edge }
  | { type: 'PaintBiome'; tile: TileCoord; biome: PaintableBiome }
  | { type: 'Demolish'; target: DemolishTarget };

/** Raison d'un refus. L'UI l'affiche via la clé i18n `error.<raison>`. */
export type CommandError =
  | 'outOfBounds'
  | 'notEnoughMoney'
  | 'alreadyPath'
  | 'alreadyFenced'
  | 'alreadyBiome'
  | 'protectedTile'
  | 'tileIsPath'
  | 'nothingToDemolish';

/** Résultat d'une commande : `moneyDelta` est négatif pour une dépense, positif pour un remboursement. */
export type CommandResult = { ok: true; moneyDelta: number } | { ok: false; error: CommandError };

function refused(error: CommandError): CommandResult {
  return { ok: false, error };
}

function spend(state: GameState, cost: number): CommandResult {
  return state.money < cost ? refused('notEnoughMoney') : { ok: true, moneyDelta: -cost };
}

function isProtected(world: World, tile: TileCoord): boolean {
  return sameTile(tile, world.entrance) || sameTile(tile, world.exit);
}

/** Valide une commande sans modifier l'état (sert aussi à l'aperçu de placement). */
export function validateCommand(state: Readonly<GameState>, command: Command): CommandResult {
  const { world } = state;
  switch (command.type) {
    case 'PlacePath': {
      if (!inBounds(world, command.tile)) return refused('outOfBounds');
      if (world.tiles[tileIndex(world, command.tile)] === tileCode('path')) return refused('alreadyPath');
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
      return spend(state, balance.costs.biome);
    }
    case 'Demolish':
      return validateDemolish(world, command.target);
  }
}

function validateDemolish(world: World, target: DemolishTarget): CommandResult {
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
  if (world.tiles[tileIndex(world, target.tile)] !== tileCode('path')) return refused('nothingToDemolish');
  return refund(balance.costs.path);
}

/** Valide puis applique une commande. L'état n'est modifié que si elle est acceptée. */
export function applyCommand(state: GameState, command: Command): CommandResult {
  const result = validateCommand(state, command);
  if (!result.ok) return result;
  const { world } = state;
  state.money += result.moneyDelta;
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
      else world.tiles[tileIndex(world, command.target.tile)] = tileCode('grass');
      break;
  }
  return result;
}

function fencesOf(world: Readonly<World>, edge: Edge): readonly number[] {
  return edge.axis === 'h' ? world.fencesH : world.fencesV;
}

function setFence(world: World, edge: Edge, value: 0 | 1): void {
  const fences = edge.axis === 'h' ? world.fencesH : world.fencesV;
  fences[edgeIndex(world, edge)] = value;
  world.enclosuresDirty = true;
}
