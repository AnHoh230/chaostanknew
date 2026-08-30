import { featureFitsReservations } from './landscapeGenerator';
import { corridorFits } from './pathRouter';
import { isRegionConnected } from './regionGenerator';
import { cellAtWorld, cellCenter, neighbors4 } from './worldGrid';
import type {
  GenerierteWelt,
  LandscapeFeature,
  ValidationFailure,
  WorldDebugData,
  WorldQualityMetrics,
  WorldValidation,
} from './worldTypes';

export class WorldGenerationError extends Error {
  readonly seed: number;
  readonly stage: string;
  readonly invariant: string;
  readonly diagnostics: Record<string, unknown>;

  constructor(
    seed: number,
    stage: string,
    invariant: string,
    diagnostics: Record<string, unknown>,
  ) {
    super(`world-generation-failed:${seed}:${stage}:${invariant}`);
    this.name = 'WorldGenerationError';
    this.seed = seed;
    this.stage = stage;
    this.invariant = invariant;
    this.diagnostics = diagnostics;
  }
}

function graphReachable(siteIds: readonly string[], edges: readonly { a: string; b: string }[]): boolean {
  if (siteIds.length === 0) return false;
  const visited = new Set<string>([siteIds[0]!]);
  const pending = [siteIds[0]!];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const edge of edges) {
      const next = edge.a === current ? edge.b : edge.b === current ? edge.a : undefined;
      if (next && !visited.has(next)) {
        visited.add(next);
        pending.push(next);
      }
    }
  }
  return siteIds.every((id) => visited.has(id));
}

function featureEnvelope(feature: LandscapeFeature): { halfX: number; halfZ: number } {
  const cos = Math.abs(Math.cos(feature.rotation)), sin = Math.abs(Math.sin(feature.rotation));
  return {
    halfX: cos * feature.footprint.halfX + sin * feature.footprint.halfZ,
    halfZ: sin * feature.footprint.halfX + cos * feature.footprint.halfZ,
  };
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function reservationFloodReachesSites(world: GenerierteWelt): boolean {
  const grid = world.reservations[0]?.grid;
  if (!grid) return false;
  const traversable = new Set<number>();
  for (const reservation of world.reservations) {
    if (reservation.grid.cols !== grid.cols || reservation.grid.rows !== grid.rows || reservation.grid.cellSize !== grid.cellSize) {
      return false;
    }
    if (reservation.type === 'clearing') continue;
    reservation.cells.forEach((cell) => traversable.add(cell));
  }
  const spawn = world.reservations.find((entry) => entry.type === 'spawn');
  const start = spawn?.cells.find((cell) => traversable.has(cell));
  if (start === undefined) return false;
  const visited = new Set<number>([start]);
  const pending = [start];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const neighbor of neighbors4(grid, current)) {
      if (!traversable.has(neighbor) || visited.has(neighbor)) continue;
      visited.add(neighbor);
      pending.push(neighbor);
    }
  }
  return world.sites.every((site) => {
    const reservation = world.reservations.find((entry) => entry.id === `reservation_site_${site.id}`);
    return reservation?.cells.some((cell) => visited.has(cell)) ?? false;
  });
}

export function validateWorld(world: GenerierteWelt): WorldValidation {
  const hardFailures: ValidationFailure[] = [];
  const fail = (invariant: string, detail: string): void => { hardFailures.push({ invariant, detail }); };
  const fieldCount = world.fields.grid.cols * world.fields.grid.rows;
  const fieldArrays = [world.fields.openness, world.fields.industrial, world.fields.wetness, world.fields.destruction];
  if (fieldArrays.some((values) => values.length !== fieldCount || [...values].some((value) => !Number.isFinite(value)))) {
    fail('field-grid-complete', `expected=${fieldCount}`);
  }
  if (world.regions.regionByCell.length !== fieldCount || world.regions.biomeByCell.length !== fieldCount) {
    fail('region-grid-complete', `expected=${fieldCount}`);
  } else {
    const regionsById = new Map(world.regions.regions.map((region) => [region.id, region]));
    for (let cell = 0; cell < fieldCount; cell++) {
      const region = regionsById.get(world.regions.regionByCell[cell]!);
      if (!region || region.biomeId !== world.regions.biomeByCell[cell]) {
        fail('region-cell-consistency', `cell=${cell}`);
        break;
      }
    }
    const disconnected = world.regions.regions.find((region) => !isRegionConnected(world.regions, region.id));
    if (disconnected) fail('regions-contiguous', disconnected.id);
  }

  const siteIds = world.sites.map((site) => site.id);
  if (new Set(siteIds).size !== siteIds.length) fail('site-ids-unique', 'duplicate-site-id');
  for (const site of world.sites) {
    const envelope = site.radius + site.accessBand;
    if (
      Math.abs(site.center.x) + envelope > world.extents.halfX
      || Math.abs(site.center.z) + envelope > world.extents.halfZ
    ) fail('sites-inside-extents', site.id);
  }
  for (let left = 0; left < world.sites.length; left++) {
    for (let right = left + 1; right < world.sites.length; right++) {
      const a = world.sites[left]!, b = world.sites[right]!;
      const freeDistance = Math.hypot(a.center.x - b.center.x, a.center.z - b.center.z)
        - (a.radius + a.accessBand) - (b.radius + b.accessBand);
      if (freeDistance < 35 - 1e-6) fail('site-minimum-spacing', `${a.id}|${b.id}:${freeDistance}`);
    }
  }

  if (!graphReachable(siteIds, world.intentGraph.edges)) fail('all-sites-reachable', 'intent-graph');
  const degrees = new Map(siteIds.map((id) => [id, 0]));
  for (const edge of world.intentGraph.edges) {
    degrees.set(edge.a, (degrees.get(edge.a) ?? 0) + 1);
    degrees.set(edge.b, (degrees.get(edge.b) ?? 0) + 1);
  }
  if ([...degrees.values()].some((degree) => degree > 4)) fail('intent-degree-at-most-four', JSON.stringify(Object.fromEntries(degrees)));
  const extraEdges = world.dna.roadDensity < 1 / 3 ? 1 : world.dna.roadDensity < 2 / 3 ? 2 : 3;
  if (world.intentGraph.edges.length !== Math.max(0, siteIds.length - 1 + extraEdges)) {
    fail('intent-loop-budget', `${world.intentGraph.edges.length}/${siteIds.length - 1 + extraEdges}`);
  }

  const corridorKeys = world.corridors.map((corridor) => edgeKey(corridor.fromSiteId, corridor.toSiteId)).sort();
  const intentKeys = world.intentGraph.edges.map((edge) => edgeKey(edge.a, edge.b)).sort();
  if (JSON.stringify(corridorKeys) !== JSON.stringify(intentKeys)) fail('one-corridor-per-intent-edge', 'edge-set-mismatch');
  for (const corridor of world.corridors) {
    const ownSites = new Set([corridor.fromSiteId, corridor.toSiteId]);
    const exclusions = world.sites
      .filter((site) => !ownSites.has(site.id))
      .map((site) => ({ center: site.center, radius: site.radius }));
    const contiguous = corridor.cells.every((cell, index) => {
      if (index === 0) return true;
      const previous = corridor.cells[index - 1]!;
      const col = cell % world.reservations[0]!.grid.cols, row = Math.floor(cell / world.reservations[0]!.grid.cols);
      const pcol = previous % world.reservations[0]!.grid.cols, prow = Math.floor(previous / world.reservations[0]!.grid.cols);
      return Math.abs(col - pcol) + Math.abs(row - prow) === 1;
    });
    const fits = corridor.cells.every((cell) => corridorFits(
      world.reservations[0]!.grid,
      cell,
      corridor.width,
      3,
      exclusions,
    ));
    if (!contiguous || !fits) fail('corridors-wide-and-contiguous', corridor.id);
  }

  const realizedSiteNodes = world.realizedGraph.nodes.filter((node) => node.siteId);
  if (!graphReachable(
    realizedSiteNodes.map((node) => node.id),
    world.realizedGraph.edges,
  )) fail('realized-sites-reachable', 'realized-graph');

  const illegalFeature = world.features.find((feature) => !featureFitsReservations(feature, world.reservations));
  if (illegalFeature) fail('hard-reservations-unblocked', illegalFeature.id);
  for (const feature of world.features) {
    const envelope = featureEnvelope(feature);
    if (
      Math.abs(feature.position.x) + envelope.halfX + feature.clearance > world.extents.halfX
      || Math.abs(feature.position.z) + envelope.halfZ + feature.clearance > world.extents.halfZ
    ) fail('feature-footprints-inside-extents', feature.id);
  }
  if (!reservationFloodReachesSites(world)) fail('traversal-flood-reaches-sites', 'reservation-grid');
  return { hardFailures };
}

function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function featureOccupiedCells(world: GenerierteWelt): Set<number> {
  const grid = world.reservations[0]!.grid;
  const result = new Set<number>();
  for (let cell = 0; cell < grid.cols * grid.rows; cell++) {
    const point = cellCenter(grid, cell);
    if (world.features.some((feature) => {
      const envelope = featureEnvelope(feature);
      return Math.abs(point.x - feature.position.x) <= envelope.halfX
        && Math.abs(point.z - feature.position.z) <= envelope.halfZ;
    })) result.add(cell);
  }
  return result;
}

function largestUncomposedArea(world: GenerierteWelt, occupied: ReadonlySet<number>): number {
  const grid = world.reservations[0]!.grid;
  const visited = new Set<number>();
  let largest = 0;
  for (let start = 0; start < grid.cols * grid.rows; start++) {
    if (occupied.has(start) || visited.has(start)) continue;
    let count = 0;
    const pending = [start];
    visited.add(start);
    while (pending.length > 0) {
      const current = pending.pop()!;
      count++;
      for (const neighbor of neighbors4(grid, current)) {
        if (occupied.has(neighbor) || visited.has(neighbor)) continue;
        visited.add(neighbor);
        pending.push(neighbor);
      }
    }
    largest = Math.max(largest, count);
  }
  return largest * grid.cellSize * grid.cellSize;
}

export function measureWorldQuality(world: GenerierteWelt): WorldQualityMetrics {
  const occupied = featureOccupiedCells(world);
  const grid = world.reservations[0]!.grid;
  const signatureSource = JSON.stringify({
    seed: world.seed,
    dna: world.dna,
    macro: world.macro,
    regionByCell: world.regions.regionByCell,
    sites: world.sites,
    intentGraph: world.intentGraph,
    corridors: world.corridors,
    features: world.features,
  });
  return {
    signature: fnv1a(signatureSource),
    composedRatio: occupied.size / (grid.cols * grid.rows),
    maxUncomposedArea: largestUncomposedArea(world, occupied),
    longestCorridorWithoutNode: Math.max(0, ...world.realizedGraph.edges.map((edge) => edge.length)),
  };
}

function stats(values: Float32Array): { min: number; max: number; mean: number } {
  let min = Infinity, max = -Infinity, sum = 0;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
    sum += value;
  }
  return { min, max, mean: sum / Math.max(1, values.length) };
}

export function buildWorldDebugData(world: GenerierteWelt, validation: WorldValidation): WorldDebugData {
  const traversalGrid = world.reservations[0]!.grid;
  return {
    validation,
    quality: measureWorldQuality(world),
    fieldStats: {
      openness: stats(world.fields.openness),
      industrial: stats(world.fields.industrial),
      wetness: stats(world.fields.wetness),
      destruction: stats(world.fields.destruction),
    },
    selectedCandidates: {
      regionSeeds: world.regions.seeds.map((seed) => seed.cell),
      sites: world.sites.map((site) => cellAtWorld(traversalGrid, site.center)?.index ?? -1),
    },
  };
}

export function assertValidWorld(world: GenerierteWelt): void {
  const validation = validateWorld(world);
  const failure = validation.hardFailures[0];
  if (!failure) return;
  throw new WorldGenerationError(world.seed, 'validation', failure.invariant, {
    detail: failure.detail,
    failureCount: validation.hardFailures.length,
  });
}
