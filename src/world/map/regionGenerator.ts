import type { Rng } from '../../core/rng';
import { neighbors4 } from './worldGrid';
import type {
  ActiveBiomeSelection,
  BiomeId,
  DerivedPotentials,
  GridSpec,
  RegionInfo,
  RegionMap,
  RegionSeed,
  WorldDNA,
  WorldFields,
} from './worldTypes';

type SpecialBiome = Exclude<BiomeId, 'wasteland'>;

const SPECIAL_BIOMES: readonly SpecialBiome[] = ['scrap', 'industrial', 'mud', 'ruins', 'crater'];

function valuesFor(potentials: DerivedPotentials, biome: SpecialBiome): Float32Array {
  switch (biome) {
    case 'scrap': return potentials.scrap;
    case 'industrial': return potentials.building;
    case 'mud': return potentials.mud;
    case 'ruins': return potentials.ruin;
    case 'crater': return potentials.crater;
  }
}

function relevance(values: Float32Array): number {
  let sum = 0;
  for (const value of values) sum += value;
  const sorted = [...values].sort((a, b) => a - b);
  const p90 = sorted[Math.floor((sorted.length - 1) * 0.9)] ?? 0;
  return (sum / Math.max(1, values.length)) * 0.7 + p90 * 0.3;
}

export function selectActiveBiomes(potentials: DerivedPotentials): ActiveBiomeSelection {
  const scores = Object.fromEntries(
    SPECIAL_BIOMES.map((biome) => [biome, relevance(valuesFor(potentials, biome))]),
  ) as Record<SpecialBiome, number>;
  const ranked = [...SPECIAL_BIOMES].sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
  const biomes = ranked.filter((biome) => scores[biome] >= 0.42).slice(0, 4);
  if (biomes.length === 0) biomes.push(ranked[0]!);
  return { biomes, relevance: scores };
}

interface QueueNode { cost: number; cell: number; region: number; seq: number }

class MinQueue {
  private readonly items: QueueNode[] = [];

  get size(): number { return this.items.length; }

  push(node: QueueNode): void {
    this.items.push(node);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.items[parent]!, node) <= 0) break;
      this.items[index] = this.items[parent]!;
      index = parent;
    }
    this.items[index] = node;
  }

  pop(): QueueNode | undefined {
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

  private compare(a: QueueNode, b: QueueNode): number {
    return a.cost - b.cost || a.seq - b.seq;
  }
}

function preferredPair(a: BiomeId, b: BiomeId): boolean {
  const key = [a, b].sort().join('|');
  return key === 'industrial|ruins'
    || key === 'industrial|scrap'
    || key === 'mud|scrap'
    || key === 'crater|ruins';
}

function rarePair(a: BiomeId, b: BiomeId): boolean {
  const key = [a, b].sort().join('|');
  return key === 'industrial|mud' || key === 'crater|industrial';
}

function adjacencyCost(grid: GridSpec, cell: number, biome: SpecialBiome, assigned: readonly (BiomeId | null)[]): number {
  let cost = 0;
  let count = 0;
  for (const neighbor of neighbors4(grid, cell)) {
    const other = assigned[neighbor];
    if (!other || other === biome || other === 'wasteland') continue;
    cost += preferredPair(biome, other) ? 0.1 : rarePair(biome, other) ? 0.8 : 0.4;
    count++;
  }
  return count === 0 ? 0 : cost / count;
}

function seedDistanceSquared(a: number, b: number, cols: number): number {
  const ax = a % cols, az = Math.floor(a / cols);
  const bx = b % cols, bz = Math.floor(b / cols);
  return (ax - bx) ** 2 + (az - bz) ** 2;
}

export function generateRegions(
  grid: GridSpec,
  _fields: WorldFields,
  potentials: DerivedPotentials,
  dna: WorldDNA,
  rng: Rng,
): RegionMap {
  const active = selectActiveBiomes(potentials);
  const targetRegionCount = Math.max(active.biomes.length, Math.round(8 + (3 - 8) * dna.targetRegionScale));
  const biomeCounts = Object.fromEntries(active.biomes.map((biome) => [biome, 1])) as Partial<Record<SpecialBiome, number>>;
  const seedBiomes = [...active.biomes];
  while (seedBiomes.length < targetRegionCount) {
    const next = [...active.biomes].sort((a, b) => {
      const scoreA = active.relevance[a] / ((biomeCounts[a] ?? 0) + 1);
      const scoreB = active.relevance[b] / ((biomeCounts[b] ?? 0) + 1);
      return scoreB - scoreA || a.localeCompare(b);
    })[0]!;
    seedBiomes.push(next);
    biomeCounts[next] = (biomeCounts[next] ?? 0) + 1;
  }

  const tie = new Float32Array(grid.cols * grid.rows);
  for (let i = 0; i < tie.length; i++) tie[i] = rng.next() * 0.005;
  const chosenCells: number[] = [];
  const minSeedDistance = Math.max(4, Math.round(5 + dna.targetRegionScale * 5));
  const seeds: RegionSeed[] = seedBiomes.map((biome, regionIndex) => {
    const candidates = Array.from({ length: tie.length }, (_, cell) => cell).sort((a, b) => {
      const values = valuesFor(potentials, biome);
      return (values[b]! + tie[b]!) - (values[a]! + tie[a]!) || a - b;
    });
    const cell = candidates.find((candidate) =>
      !chosenCells.includes(candidate)
      && chosenCells.every((other) => seedDistanceSquared(candidate, other, grid.cols) >= minSeedDistance ** 2),
    ) ?? candidates.find((candidate) => !chosenCells.includes(candidate));
    if (cell === undefined) throw new Error('region-seed-unplaceable');
    chosenCells.push(cell);
    return { id: `region_${regionIndex}_${biome}`, biomeId: biome, cell };
  });

  const size = grid.cols * grid.rows;
  const assignedBiome: (BiomeId | null)[] = Array(size).fill(null);
  const assignedRegion: (string | null)[] = Array(size).fill(null);
  const cellsByRegion = seeds.map(() => [] as number[]);
  const specialTarget = Math.floor(size * (0.42 + dna.structuralDensity * 0.28));
  const rawWeights = seeds.map((seed) => active.relevance[seed.biomeId]);
  const weightSum = rawWeights.reduce((sum, value) => sum + value, 0) || 1;
  const budgets = rawWeights.map((weight) => Math.max(12, Math.floor(specialTarget * weight / weightSum)));
  const queue = new MinQueue();
  let seq = 0;

  const pushNeighbors = (cell: number, regionIndex: number, pathCost: number): void => {
    const biome = seeds[regionIndex]!.biomeId;
    const suitability = valuesFor(potentials, biome);
    for (const neighbor of neighbors4(grid, cell)) {
      if (assignedRegion[neighbor] !== null) continue;
      const cost = pathCost * 0.06 + (1 - suitability[neighbor]!)
        + adjacencyCost(grid, neighbor, biome, assignedBiome) + tie[neighbor]!;
      queue.push({ cost, cell: neighbor, region: regionIndex, seq: seq++ });
    }
  };

  seeds.forEach((seed, regionIndex) => {
    assignedBiome[seed.cell] = seed.biomeId;
    assignedRegion[seed.cell] = seed.id;
    cellsByRegion[regionIndex]!.push(seed.cell);
    pushNeighbors(seed.cell, regionIndex, 0);
  });

  while (queue.size > 0) {
    const node = queue.pop()!;
    if (assignedRegion[node.cell] !== null) continue;
    if (cellsByRegion[node.region]!.length >= budgets[node.region]!) continue;
    const seed = seeds[node.region]!;
    assignedBiome[node.cell] = seed.biomeId;
    assignedRegion[node.cell] = seed.id;
    cellsByRegion[node.region]!.push(node.cell);
    pushNeighbors(node.cell, node.region, node.cost);
  }

  const regions: RegionInfo[] = seeds.map((seed, index) => ({
    id: seed.id,
    biomeId: seed.biomeId,
    cells: cellsByRegion[index]!,
  }));

  let wastelandIndex = 0;
  for (let start = 0; start < size; start++) {
    if (assignedRegion[start] !== null) continue;
    const id = `region_wasteland_${wastelandIndex++}`;
    const cells: number[] = [];
    const pending = [start];
    assignedRegion[start] = id;
    assignedBiome[start] = 'wasteland';
    while (pending.length > 0) {
      const cell = pending.pop()!;
      cells.push(cell);
      for (const neighbor of neighbors4(grid, cell)) {
        if (assignedRegion[neighbor] !== null) continue;
        assignedRegion[neighbor] = id;
        assignedBiome[neighbor] = 'wasteland';
        pending.push(neighbor);
      }
    }
    regions.push({ id, biomeId: 'wasteland', cells });
  }

  return {
    grid,
    biomeByCell: assignedBiome as BiomeId[],
    regionByCell: assignedRegion as string[],
    regions,
    seeds,
  };
}

export function isRegionConnected(map: RegionMap, regionId: string): boolean {
  const target = map.regions.find((region) => region.id === regionId);
  if (!target || target.cells.length === 0) return false;
  const visited = new Set<number>([target.cells[0]!]);
  const pending = [target.cells[0]!];
  while (pending.length > 0) {
    const cell = pending.pop()!;
    for (const neighbor of neighbors4(map.grid, cell)) {
      if (map.regionByCell[neighbor] !== regionId || visited.has(neighbor)) continue;
      visited.add(neighbor);
      pending.push(neighbor);
    }
  }
  return visited.size === target.cells.length;
}
