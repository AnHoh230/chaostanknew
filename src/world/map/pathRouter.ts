import { cellCenter, neighbors4, sampleCategorical, sampleContinuous } from './worldGrid';
import { DEFAULT_ROUTING, type RoutingOptions } from './traversalGraph';
import type { Vec2 } from './mapTypes';
import type {
  GridSpec,
  RegionMap,
  RoutedCorridor,
  Site,
  TraversalGraph,
  WorldFields,
} from './worldTypes';

export interface CorridorExclusion {
  center: Vec2;
  radius: number;
}

export interface PathRoutingOptions extends RoutingOptions {
  corridorWidth: number;
  corridorClearance: number;
}

export const DEFAULT_PATH_ROUTING: PathRoutingOptions = {
  ...DEFAULT_ROUTING,
  turnCost: 0,
  corridorWidth: 12,
  corridorClearance: 3,
};

interface QueueItem {
  state: number;
  cell: number;
  direction: number;
  cost: number;
  score: number;
  sequence: number;
}

class MinQueue {
  private readonly values: QueueItem[] = [];

  get size(): number { return this.values.length; }

  push(value: QueueItem): void {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.values[parent]!, value) <= 0) break;
      this.values[index] = this.values[parent]!;
      index = parent;
    }
    this.values[index] = value;
  }

  pop(): QueueItem | undefined {
    const first = this.values[0];
    const last = this.values.pop();
    if (!first || !last || this.values.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.values.length) break;
      let child = left;
      if (right < this.values.length && this.compare(this.values[right]!, this.values[left]!) < 0) child = right;
      if (this.compare(last, this.values[child]!) <= 0) break;
      this.values[index] = this.values[child]!;
      index = child;
    }
    this.values[index] = last;
    return first;
  }

  private compare(a: QueueItem, b: QueueItem): number {
    return a.score - b.score || a.cost - b.cost || a.sequence - b.sequence;
  }
}

export function corridorFits(
  grid: GridSpec,
  cell: number,
  width: number,
  clearance: number,
  exclusions: readonly CorridorExclusion[],
): boolean {
  const point = cellCenter(grid, cell);
  const requiredRadius = width / 2 + clearance;
  if (
    point.x - requiredRadius < -grid.extents.halfX ||
    point.x + requiredRadius > grid.extents.halfX ||
    point.z - requiredRadius < -grid.extents.halfZ ||
    point.z + requiredRadius > grid.extents.halfZ
  ) return false;
  return exclusions.every((exclusion) => (
    Math.hypot(point.x - exclusion.center.x, point.z - exclusion.center.z)
      >= exclusion.radius + requiredRadius
  ));
}

export function corridorReuseMultiplier(previousUses: number): number {
  if (previousUses <= 0) return 1;
  if (previousUses === 1) return 0.75;
  if (previousUses === 2) return 1.25;
  return 2;
}

function accessBandCells(
  grid: GridSpec,
  site: Site,
  width: number,
  clearance: number,
  exclusions: readonly CorridorExclusion[],
): number[] {
  const result: number[] = [];
  const count = grid.cols * grid.rows;
  for (let cell = 0; cell < count; cell++) {
    const point = cellCenter(grid, cell);
    const distance = Math.hypot(point.x - site.center.x, point.z - site.center.z);
    if (distance < site.radius || distance > site.radius + site.accessBand) continue;
    if (corridorFits(grid, cell, width, clearance, exclusions)) result.push(cell);
  }
  return result;
}

function startCellToward(grid: GridSpec, candidates: readonly number[], source: Site, target: Site): number {
  const dx = target.center.x - source.center.x;
  const dz = target.center.z - source.center.z;
  const length = Math.hypot(dx, dz) || 1;
  const desiredDistance = source.radius + Math.min(source.accessBand, grid.cellSize / 2);
  const desired = {
    x: source.center.x + dx / length * desiredDistance,
    z: source.center.z + dz / length * desiredDistance,
  };
  return [...candidates].sort((a, b) => {
    const pa = cellCenter(grid, a), pb = cellCenter(grid, b);
    const da = (pa.x - desired.x) ** 2 + (pa.z - desired.z) ** 2;
    const db = (pb.x - desired.x) ** 2 + (pb.z - desired.z) ** 2;
    return da - db || a - b;
  })[0]!;
}

function directionBetween(grid: GridSpec, from: number, to: number): number {
  const delta = to - from;
  if (delta === -grid.cols) return 0;
  if (delta === 1) return 1;
  if (delta === grid.cols) return 2;
  if (delta === -1) return 3;
  throw new Error('non-adjacent-route-step');
}

function targetHeuristic(grid: GridSpec, cell: number, targets: readonly number[]): number {
  const col = cell % grid.cols;
  const row = Math.floor(cell / grid.cols);
  let best = Infinity;
  for (const target of targets) {
    const targetCol = target % grid.cols;
    const targetRow = Math.floor(target / grid.cols);
    best = Math.min(best, Math.hypot(col - targetCol, row - targetRow));
  }
  return best;
}

interface RoutingSurface {
  terrainByCell: Float32Array;
  regionByCell: Array<string | undefined>;
}

function buildRoutingSurface(
  grid: GridSpec,
  fields: WorldFields,
  regions: RegionMap,
  options: PathRoutingOptions,
): RoutingSurface {
  const terrainByCell = new Float32Array(grid.cols * grid.rows);
  const regionByCell: Array<string | undefined> = Array(terrainByCell.length);
  for (let cell = 0; cell < terrainByCell.length; cell++) {
    const point = cellCenter(grid, cell);
    const openness = sampleContinuous(fields.grid, fields.openness, point);
    const wetness = sampleContinuous(fields.grid, fields.wetness, point);
    const destruction = sampleContinuous(fields.grid, fields.destruction, point);
    terrainByCell[cell] = options.baseCost
      + (1 - openness) * options.denseWeight
      + wetness * options.wetnessWeight
      + destruction * options.destructionWeight;
    regionByCell[cell] = sampleCategorical(regions.grid, regions.regionByCell, point);
  }
  return { terrainByCell, regionByCell };
}

function routeOne(
  grid: GridSpec,
  start: number,
  targets: readonly number[],
  allowed: Uint8Array,
  usage: Uint16Array,
  surface: RoutingSurface,
  options: PathRoutingOptions,
): number[] {
  const directionStates = 5;
  const stateCount = grid.cols * grid.rows * directionStates;
  const best = new Float64Array(stateCount).fill(Infinity);
  const previous = new Int32Array(stateCount).fill(-1);
  const queue = new MinQueue();
  const targetSet = new Set(targets);
  let sequence = 0;
  const startDirection = 4;
  const startState = start * directionStates + startDirection;
  best[startState] = 0;
  queue.push({
    state: startState,
    cell: start,
    direction: startDirection,
    cost: 0,
    score: targetHeuristic(grid, start, targets) * options.baseCost * 0.75,
    sequence: sequence++,
  });

  let foundState = -1;
  while (queue.size > 0) {
    const current = queue.pop()!;
    if (current.cost !== best[current.state]) continue;
    if (targetSet.has(current.cell)) {
      foundState = current.state;
      break;
    }
    for (const neighbor of neighbors4(grid, current.cell)) {
      if (!allowed[neighbor]) continue;
      const direction = directionBetween(grid, current.cell, neighbor);
      const turnCost = current.direction === 4 || current.direction === direction ? 0 : options.turnCost;
      const rawTerrain = surface.terrainByCell[neighbor]!
        + (surface.regionByCell[neighbor] === surface.regionByCell[current.cell]
          ? 0
          : options.regionTransitionCost);
      const stepCost = rawTerrain * corridorReuseMultiplier(usage[neighbor]!) + turnCost;
      const cost = current.cost + stepCost;
      const state = neighbor * directionStates + direction;
      if (cost >= best[state]!) continue;
      best[state] = cost;
      previous[state] = current.state;
      queue.push({
        state,
        cell: neighbor,
        direction,
        cost,
        score: cost + targetHeuristic(grid, neighbor, targets) * options.baseCost * 0.75,
        sequence: sequence++,
      });
    }
  }
  if (foundState < 0) throw new Error('corridor-route-unreachable');

  const reversed: number[] = [];
  let cursor = foundState;
  while (cursor >= 0) {
    reversed.push(Math.floor(cursor / directionStates));
    if (cursor === startState) break;
    cursor = previous[cursor]!;
  }
  reversed.reverse();
  return reversed;
}

function simplifyCenterline(grid: GridSpec, cells: readonly number[]): Vec2[] {
  const points = cells.map((cell) => cellCenter(grid, cell));
  if (points.length <= 2) return points;
  const distanceToSegment = (point: Vec2, a: Vec2, b: Vec2): number => {
    const dx = b.x - a.x, dz = b.z - a.z;
    const length2 = dx * dx + dz * dz;
    if (length2 === 0) return Math.hypot(point.x - a.x, point.z - a.z);
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / length2));
    return Math.hypot(point.x - (a.x + dx * t), point.z - (a.z + dz * t));
  };
  const simplify = (from: number, to: number): Vec2[] => {
    let furthest = -1;
    let furthestDistance = grid.cellSize * 0.9;
    for (let index = from + 1; index < to; index++) {
      const distance = distanceToSegment(points[index]!, points[from]!, points[to]!);
      if (distance > furthestDistance) {
        furthestDistance = distance;
        furthest = index;
      }
    }
    if (furthest < 0) return [points[from]!, points[to]!];
    const left = simplify(from, furthest);
    const right = simplify(furthest, to);
    return [...left.slice(0, -1), ...right];
  };
  return simplify(0, points.length - 1);
}

export function routeCorridors(
  graph: TraversalGraph,
  sites: readonly Site[],
  traversalGrid: GridSpec,
  fields: WorldFields,
  regions: RegionMap,
  options: PathRoutingOptions,
): RoutedCorridor[] {
  const sitesById = new Map(sites.map((site) => [site.id, site]));
  const usage = new Uint16Array(traversalGrid.cols * traversalGrid.rows);
  const corridors: RoutedCorridor[] = [];
  const surface = buildRoutingSurface(traversalGrid, fields, regions, options);

  graph.edges.forEach((edge, index) => {
    const source = sitesById.get(edge.a);
    const target = sitesById.get(edge.b);
    if (!source || !target) throw new Error(`unknown-site-in-traversal-edge:${edge.a}:${edge.b}`);
    const exclusions = sites
      .filter((site) => site.id !== source.id && site.id !== target.id)
      .map((site) => ({ center: site.center, radius: site.radius }));
    const allowed = new Uint8Array(traversalGrid.cols * traversalGrid.rows);
    for (let cell = 0; cell < allowed.length; cell++) {
      allowed[cell] = corridorFits(
        traversalGrid,
        cell,
        options.corridorWidth,
        options.corridorClearance,
        exclusions,
      ) ? 1 : 0;
    }
    const starts = accessBandCells(
      traversalGrid,
      source,
      options.corridorWidth,
      options.corridorClearance,
      exclusions,
    );
    const targets = accessBandCells(
      traversalGrid,
      target,
      options.corridorWidth,
      options.corridorClearance,
      exclusions,
    );
    if (starts.length === 0 || targets.length === 0) {
      throw new Error(`site-access-band-unroutable:${source.id}:${target.id}`);
    }
    const start = startCellToward(traversalGrid, starts, source, target);
    const cells = routeOne(traversalGrid, start, targets, allowed, usage, surface, options);
    for (const cell of cells) usage[cell]++;
    corridors.push({
      id: `corridor_${index}_${source.id}_${target.id}`,
      fromSiteId: source.id,
      toSiteId: target.id,
      centerline: simplifyCenterline(traversalGrid, cells),
      width: options.corridorWidth,
      cells,
    });
  });
  return corridors;
}
