import type { Enclosure, EnclosureId, World } from '../state';

// Détection des enclos par remplissage (flood fill).
//
// Les tuiles reliées sans traverser de clôture forment une zone. Une zone est un **enclos** si elle est fermée :
// aucune de ses tuiles de bord de carte n'a son arête de bord ouverte (le bord de carte n'est pas une clôture).

/** Zones fermées, chacune comme liste triée d'indices de tuiles, dans l'ordre de balayage de la grille. */
export function findClosedRegions(world: World): number[][] {
  const { width, height } = world;
  const visited = new Uint8Array(width * height);
  const regions: number[][] = [];
  const stack: number[] = [];

  for (let start = 0; start < width * height; start++) {
    if (visited[start]) continue;
    visited[start] = 1;
    stack.push(start);
    const region: number[] = [];
    let open = false;
    while (stack.length > 0) {
      const index = stack.pop() as number;
      region.push(index);
      const x = index % width;
      const y = (index - x) / width;
      // Arêtes ouvertes (sans clôture) autour de la tuile.
      const west = world.fencesV[y * (width + 1) + x] === 0;
      const east = world.fencesV[y * (width + 1) + x + 1] === 0;
      const north = world.fencesH[y * width + x] === 0;
      const south = world.fencesH[(y + 1) * width + x] === 0;
      if (
        (x === 0 && west) ||
        (x === width - 1 && east) ||
        (y === 0 && north) ||
        (y === height - 1 && south)
      ) {
        open = true;
      }
      visit(x > 0 && west, index - 1);
      visit(x < width - 1 && east, index + 1);
      visit(y > 0 && north, index - width);
      visit(y < height - 1 && south, index + width);
    }
    if (!open) regions.push(region.sort((a, b) => a - b));
  }
  return regions;

  function visit(passable: boolean, neighbour: number): void {
    if (!passable || visited[neighbour]) return;
    visited[neighbour] = 1;
    stack.push(neighbour);
  }
}

export interface EnclosureDetection {
  enclosures: Record<EnclosureId, Enclosure>;
  enclosureOf: number[];
  nextEnclosureId: EnclosureId;
}

/**
 * Recalcule les enclos. Un enclos garde son id tant que la nouvelle zone reprend la majorité de ses tuiles
 * (agrandissement, petite retouche) ; sinon il reçoit un nouvel id.
 */
export function detectEnclosures(
  world: World,
  previous: Record<EnclosureId, Enclosure>,
  nextEnclosureId: EnclosureId,
): EnclosureDetection {
  const enclosures: Record<EnclosureId, Enclosure> = {};
  const enclosureOf = new Array<number>(world.width * world.height).fill(0);
  const claimed = new Set<EnclosureId>();
  let nextId = nextEnclosureId;

  for (const tiles of findClosedRegions(world)) {
    const id = inheritedId(world.enclosureOf, tiles, previous, claimed) ?? nextId++;
    claimed.add(id);
    enclosures[id] = { id, tiles, area: tiles.length };
    for (const index of tiles) enclosureOf[index] = id;
  }
  return { enclosures, enclosureOf, nextEnclosureId: nextId };
}

function inheritedId(
  oldEnclosureOf: number[],
  tiles: number[],
  previous: Record<EnclosureId, Enclosure>,
  claimed: Set<EnclosureId>,
): EnclosureId | undefined {
  const overlap = new Map<EnclosureId, number>();
  for (const index of tiles) {
    const old = oldEnclosureOf[index] ?? 0;
    if (old !== 0) overlap.set(old, (overlap.get(old) ?? 0) + 1);
  }
  let best: EnclosureId | undefined;
  let bestCount = 0;
  for (const [id, count] of overlap) {
    const old = previous[id];
    if (!old || claimed.has(id) || count * 2 <= old.area) continue;
    if (count > bestCount || (count === bestCount && best !== undefined && id < best)) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}
