import { cellAtWorld, neighbors4 } from './worldGrid';
import type {
  GridSpec,
  RegionMap,
  Site,
  TerrainCostEdge,
  TerrainCostGraph,
  TraversalEdge,
  TraversalGraph,
  WorldFields,
} from './worldTypes';

export interface RoutingOptions {
  baseCost: number;
  denseWeight: number;
  wetnessWeight: number;
  destructionWeight: number;
  regionTransitionCost: number;
  turnCost: number;
}

export const DEFAULT_ROUTING: RoutingOptions = {
  baseCost: 1,
  denseWeight: 2,
  wetnessWeight: 0.8,
  destructionWeight: 0.6,
  regionTransitionCost: 0.25,
  turnCost: 0.15,
};

interface QueueItem { cell: number; cost: number; score: number; seq: number }

class MinQueue {
  private readonly items: QueueItem[] = [];
  get size(): number { return this.items.length; }

  push(value: QueueItem): void {
    this.items.push(value);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.items[parent]!, value) <= 0) break;
      this.items[index] = this.items[parent]!;
      index = parent;
    }
    this.items[index] = value;
  }

  pop(): QueueItem | undefined {
    const first = this.items[0];
    const last = this.items.pop();
    if (!first || !last || this.items.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.items.length) break;
      let child = left;
      if (right < this.items.length && this.compare(this.items[right]!, this.items[left]!) < 0) child = right;
      if (this.compare(last, this.items[child]!) <= 0) break;
      this.items[index] = this.items[child]!;
      index = child;
    }
    this.items[index] = last;
    return first;
  }

  private compare(a: QueueItem, b: QueueItem): number {
    return a.score - b.score || a.cost - b.cost || a.seq - b.seq;
  }
}

function heuristic(grid: GridSpec, from: number, to: number): number {
  const ax = from % grid.cols, az = Math.floor(from / grid.cols);
  const bx = to % grid.cols, bz = Math.floor(to / grid.cols);
  return Math.abs(ax - bx) + Math.abs(az - bz);
}

function terrainStepCost(
  cell: number,
  previous: number,
  fields: WorldFields,
  regions: RegionMap,
  options: RoutingOptions,
): number {
  return options.baseCost
    + (1 - fields.openness[cell]!) * options.denseWeight
    + fields.wetness[cell]! * options.wetnessWeight
    + fields.destruction[cell]! * options.destructionWeight
    + (regions.regionByCell[cell] === regions.regionByCell[previous] ? 0 : options.regionTransitionCost);
}

function estimatePath(
  start: number,
  target: number,
  grid: GridSpec,
  fields: WorldFields,
  regions: RegionMap,
  options: RoutingOptions,
): { cost: number; cells: number[] } {
  const count = grid.cols * grid.rows;
  const best = new Float64Array(count).fill(Infinity);
  const previous = new Int32Array(count).fill(-1);
  const queue = new MinQueue();
  let seq = 0;
  best[start] = 0;
  queue.push({ cell: start, cost: 0, score: heuristic(grid, start, target), seq: seq++ });
  while (queue.size > 0) {
    const current = queue.pop()!;
    if (current.cost !== best[current.cell]) continue;
    if (current.cell === target) break;
    for (const neighbor of neighbors4(grid, current.cell)) {
      const cost = current.cost + terrainStepCost(neighbor, current.cell, fields, regions, options);
      if (cost >= best[neighbor]!) continue;
      best[neighbor] = cost;
      previous[neighbor] = current.cell;
      queue.push({ cell: neighbor, cost, score: cost + heuristic(grid, neighbor, target), seq: seq++ });
    }
  }
  if (!Number.isFinite(best[target])) throw new Error('coarse-route-unreachable');
  const cells: number[] = [];
  let cursor = target;
  while (cursor >= 0) {
    cells.push(cursor);
    if (cursor === start) break;
    cursor = previous[cursor]!;
  }
  cells.reverse();
  return { cost: best[target]!, cells };
}

export function buildTerrainCostGraph(
  sites: readonly Site[],
  grid: GridSpec,
  fields: WorldFields,
  regions: RegionMap,
  options: RoutingOptions,
): TerrainCostGraph {
  const edges: TerrainCostEdge[] = [];
  for (let i = 0; i < sites.length; i++) {
    for (let j = i + 1; j < sites.length; j++) {
      const a = sites[i]!, b = sites[j]!;
      const start = cellAtWorld(grid, a.center);
      const target = cellAtWorld(grid, b.center);
      if (!start || !target) throw new Error('site-outside-cost-grid');
      const route = estimatePath(start.index, target.index, grid, fields, regions, options);
      edges.push({ a: a.id, b: b.id, cost: route.cost, coarseCells: route.cells });
    }
  }
  return { siteIds: sites.map((site) => site.id), edges };
}

function edgeKey(edge: Pick<TerrainCostEdge, 'a' | 'b'>): string {
  return edge.a < edge.b ? `${edge.a}|${edge.b}` : `${edge.b}|${edge.a}`;
}

export function buildTraversalGraph(
  costGraph: TerrainCostGraph,
  roadDensity: number,
  maxDegree = 4,
): TraversalGraph {
  if (costGraph.siteIds.length <= 1) return { siteIds: [...costGraph.siteIds], edges: [] };
  const sorted = [...costGraph.edges].sort((a, b) => a.cost - b.cost || edgeKey(a).localeCompare(edgeKey(b)));
  const visited = new Set<string>([costGraph.siteIds[0]!]);
  const degrees = new Map(costGraph.siteIds.map((id) => [id, 0]));
  const selected: TerrainCostEdge[] = [];
  const selectedKeys = new Set<string>();

  while (visited.size < costGraph.siteIds.length) {
    const edge = sorted.find((candidate) => {
      const aVisited = visited.has(candidate.a);
      const bVisited = visited.has(candidate.b);
      return aVisited !== bVisited
        && degrees.get(candidate.a)! < maxDegree
        && degrees.get(candidate.b)! < maxDegree;
    });
    if (!edge) throw new Error('bounded-spanning-tree-unreachable');
    selected.push(edge);
    selectedKeys.add(edgeKey(edge));
    visited.add(edge.a);
    visited.add(edge.b);
    degrees.set(edge.a, degrees.get(edge.a)! + 1);
    degrees.set(edge.b, degrees.get(edge.b)! + 1);
  }

  const extraEdges = roadDensity < 1 / 3 ? 1 : roadDensity < 2 / 3 ? 2 : 3;
  for (const edge of sorted) {
    if (selected.length >= costGraph.siteIds.length - 1 + extraEdges) break;
    if (selectedKeys.has(edgeKey(edge))) continue;
    if (degrees.get(edge.a)! >= maxDegree || degrees.get(edge.b)! >= maxDegree) continue;
    selected.push(edge);
    selectedKeys.add(edgeKey(edge));
    degrees.set(edge.a, degrees.get(edge.a)! + 1);
    degrees.set(edge.b, degrees.get(edge.b)! + 1);
  }
  if (selected.length !== costGraph.siteIds.length - 1 + extraEdges) {
    throw new Error('bounded-loop-budget-unreachable');
  }
  const edges: TraversalEdge[] = selected.map((edge) => ({
    a: edge.a,
    b: edge.b,
    estimatedCost: edge.cost,
  }));
  return { siteIds: [...costGraph.siteIds], edges };
}
