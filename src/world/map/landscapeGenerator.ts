import type { Rng } from '../../core/rng';
import { LANDSCAPE_RECIPES, type LandscapePattern } from './landscapeGrammar';
import { cellCenter, sampleContinuous } from './worldGrid';
import type { Vec2 } from './mapTypes';
import type {
  Footprint,
  GridSpec,
  LandscapeFeature,
  LandscapeSize,
  MacroStructure,
  RegionInfo,
  RegionMap,
  RoutedCorridor,
  Site,
  SpatialReservation,
  WorldFields,
} from './worldTypes';

export interface LandscapeContext {
  grid: GridSpec;
  fields: WorldFields;
  regions: RegionMap;
  macro: MacroStructure;
  sites: readonly Site[];
  corridors: readonly RoutedCorridor[];
  reservations: readonly SpatialReservation[];
}

export interface LandscapeGenerationResult {
  features: LandscapeFeature[];
  negativeSpace: SpatialReservation[];
}

interface Emission {
  features: LandscapeFeature[];
  negativeSpace: SpatialReservation[];
}

export function rotatedFeatureEnvelope(feature: LandscapeFeature): Footprint {
  const cos = Math.abs(Math.cos(feature.rotation));
  const sin = Math.abs(Math.sin(feature.rotation));
  return {
    halfX: cos * feature.footprint.halfX + sin * feature.footprint.halfZ,
    halfZ: sin * feature.footprint.halfX + cos * feature.footprint.halfZ,
  };
}

export function featureFitsReservations(
  feature: LandscapeFeature,
  reservations: readonly SpatialReservation[],
): boolean {
  if (feature.traversal === 'driveable') return true;
  const envelope = rotatedFeatureEnvelope(feature);
  for (const reservation of reservations) {
    if (reservation.allowedRoles.includes(feature.role)) continue;
    const halfCell = reservation.grid.cellSize / 2;
    for (const cell of reservation.cells) {
      const point = cellCenter(reservation.grid, cell);
      if (
        Math.abs(feature.position.x - point.x) <= envelope.halfX + halfCell + feature.clearance + reservation.clearance
        && Math.abs(feature.position.z - point.z) <= envelope.halfZ + halfCell + feature.clearance + reservation.clearance
      ) return false;
    }
  }
  return true;
}

export function featureFitsBounds(feature: LandscapeFeature, grid: GridSpec): boolean {
  const envelope = rotatedFeatureEnvelope(feature);
  return Math.abs(feature.position.x) + envelope.halfX + feature.clearance <= grid.extents.halfX
    && Math.abs(feature.position.z) + envelope.halfZ + feature.clearance <= grid.extents.halfZ;
}

export function featuresOverlap(a: LandscapeFeature, b: LandscapeFeature): boolean {
  if (a.traversal === 'driveable' || b.traversal === 'driveable') return false;
  const ae = rotatedFeatureEnvelope(a), be = rotatedFeatureEnvelope(b);
  return Math.abs(a.position.x - b.position.x) < ae.halfX + be.halfX + a.clearance + b.clearance
    && Math.abs(a.position.z - b.position.z) < ae.halfZ + be.halfZ + a.clearance + b.clearance;
}

function scaleFor(size: LandscapeSize, rng: Rng): number {
  switch (size) {
    case 'large': return rng.range(9, 14);
    case 'medium': return rng.range(6, 9);
    case 'small': return rng.range(3, 5.5);
  }
}

function offset(origin: Vec2, along: number, across: number, angle: number): Vec2 {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return {
    x: origin.x + cos * along - sin * across,
    z: origin.z + sin * along + cos * across,
  };
}

function feature(
  anchor: Vec2,
  pattern: LandscapePattern,
  region: RegionInfo,
  position: Vec2,
  footprint: Footprint,
  rotation: number,
): LandscapeFeature {
  return {
    id: '',
    demandClass: pattern.demandClass,
    biomeId: region.biomeId,
    regionId: region.id,
    shape: pattern.kind === 'island' ? 'blob' : pattern.kind === 'cluster' ? 'point' : pattern.kind,
    size: pattern.size,
    traversal: pattern.traversal,
    role: pattern.role,
    placementMode: pattern.placementMode,
    footprint,
    clearance: pattern.clearance,
    position: { x: anchor.x + position.x, z: anchor.z + position.z },
    rotation,
  };
}

function emptyEmission(): Emission { return { features: [], negativeSpace: [] }; }

export function emitCluster(
  anchor: Vec2,
  angle: number,
  pattern: LandscapePattern,
  region: RegionInfo,
  _grid: GridSpec,
  rng: Rng,
): Emission {
  const base = scaleFor(pattern.size, rng);
  const features = Array.from({ length: 3 }, (_, index) => {
    const theta = angle + index * Math.PI * 2 / 3 + rng.range(-0.25, 0.25);
    const radius = base * rng.range(1.5, 2.1);
    const pos = { x: Math.cos(theta) * radius, z: Math.sin(theta) * radius };
    return feature(anchor, pattern, region, pos, { halfX: base * 0.65, halfZ: base * 0.5 }, theta);
  });
  return { features, negativeSpace: [] };
}

export function emitLine(
  anchor: Vec2,
  angle: number,
  pattern: LandscapePattern,
  region: RegionInfo,
  _grid: GridSpec,
  rng: Rng,
): Emission {
  const base = scaleFor(pattern.size, rng);
  const features = [-1, 0, 1].map((step) => feature(
    anchor,
    pattern,
    region,
    offset({ x: 0, z: 0 }, step * base * 2.25, rng.range(-base * 0.12, base * 0.12), angle),
    { halfX: base, halfZ: base * 0.32 },
    angle,
  ));
  return { features, negativeSpace: [] };
}

export function emitArc(
  anchor: Vec2,
  angle: number,
  pattern: LandscapePattern,
  region: RegionInfo,
  _grid: GridSpec,
  rng: Rng,
): Emission {
  const base = scaleFor(pattern.size, rng);
  const radius = base * 2.25;
  const features = [-0.65, 0, 0.65].map((delta) => {
    const theta = angle + delta;
    return feature(
      anchor,
      pattern,
      region,
      { x: Math.cos(theta) * radius, z: Math.sin(theta) * radius },
      { halfX: base * 0.72, halfZ: base * 0.28 },
      theta + Math.PI / 2,
    );
  });
  return { features, negativeSpace: [] };
}

export function emitBlob(
  anchor: Vec2,
  angle: number,
  pattern: LandscapePattern,
  region: RegionInfo,
  _grid: GridSpec,
  rng: Rng,
): Emission {
  const base = scaleFor(pattern.size, rng);
  return {
    features: [
      feature(anchor, pattern, region, offset({ x: 0, z: 0 }, -base * 0.65, 0, angle), { halfX: base, halfZ: base * 0.72 }, angle),
      feature(anchor, pattern, region, offset({ x: 0, z: 0 }, base * 0.75, base * 0.35, angle), { halfX: base * 0.78, halfZ: base * 0.58 }, angle + 0.4),
    ],
    negativeSpace: [],
  };
}

export function emitEdge(
  anchor: Vec2,
  angle: number,
  pattern: LandscapePattern,
  region: RegionInfo,
  _grid: GridSpec,
  rng: Rng,
): Emission {
  const base = scaleFor(pattern.size, rng);
  return {
    features: [-0.75, 0.75].map((step) => feature(
      anchor,
      pattern,
      region,
      offset({ x: 0, z: 0 }, step * base * 1.7, 0, angle),
      { halfX: base * 0.9, halfZ: base * 0.25 },
      angle,
    )),
    negativeSpace: [],
  };
}

function discCells(grid: GridSpec, center: Vec2, radius: number): number[] {
  const result: number[] = [];
  for (let cell = 0; cell < grid.cols * grid.rows; cell++) {
    const point = cellCenter(grid, cell);
    if (Math.hypot(point.x - center.x, point.z - center.z) <= radius + grid.cellSize * Math.SQRT2 / 2) result.push(cell);
  }
  return result;
}

export function emitIsland(
  anchor: Vec2,
  angle: number,
  pattern: LandscapePattern,
  region: RegionInfo,
  grid: GridSpec,
  rng: Rng,
): Emission {
  const base = scaleFor(pattern.size, rng);
  const radius = base * 2.3;
  const features = Array.from({ length: 4 }, (_, index) => {
    const theta = angle + index * Math.PI / 2 + rng.range(-0.12, 0.12);
    return feature(
      anchor,
      pattern,
      region,
      { x: Math.cos(theta) * radius, z: Math.sin(theta) * radius },
      { halfX: base * 0.62, halfZ: base * 0.45 },
      theta + Math.PI / 2,
    );
  });
  return {
    features,
    negativeSpace: [{
      id: '',
      type: 'clearing',
      grid,
      cells: discCells(grid, anchor, base * 0.9),
      clearance: base * 0.35,
      allowedRoles: pattern.role === 'clearing-anchor' ? ['clearing-anchor'] : ['clearing-anchor', pattern.role],
    }],
  };
}

function fieldGradient(context: LandscapeContext, point: Vec2): number {
  const step = context.fields.grid.cellSize;
  const x0 = sampleContinuous(context.fields.grid, context.fields.destruction, { x: point.x - step, z: point.z });
  const x1 = sampleContinuous(context.fields.grid, context.fields.destruction, { x: point.x + step, z: point.z });
  const z0 = sampleContinuous(context.fields.grid, context.fields.industrial, { x: point.x, z: point.z - step });
  const z1 = sampleContinuous(context.fields.grid, context.fields.industrial, { x: point.x, z: point.z + step });
  const dx = x1 - x0, dz = z1 - z0;
  return Math.hypot(dx, dz) < 1e-5 ? context.macro.axisAngle : Math.atan2(dz, dx);
}

function nearestCorridorAngle(context: LandscapeContext, point: Vec2): number | undefined {
  let bestDistance = Infinity;
  let bestAngle: number | undefined;
  for (const corridor of context.corridors) {
    for (let index = 1; index < corridor.centerline.length; index++) {
      const a = corridor.centerline[index - 1]!, b = corridor.centerline[index]!;
      const midpoint = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      const distance = Math.hypot(point.x - midpoint.x, point.z - midpoint.z);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestAngle = Math.atan2(b.z - a.z, b.x - a.x);
      }
    }
  }
  return bestAngle;
}

function orientationFor(context: LandscapeContext, pattern: LandscapePattern, anchor: Vec2): number {
  if (pattern.kind === 'line') return context.macro.axisAngle;
  if (pattern.kind === 'edge') return context.macro.axisAngle + Math.PI / 2;
  if (pattern.kind === 'cluster') return nearestCorridorAngle(context, anchor) ?? fieldGradient(context, anchor);
  return fieldGradient(context, anchor);
}

function emit(
  context: LandscapeContext,
  anchor: Vec2,
  pattern: LandscapePattern,
  region: RegionInfo,
  rng: Rng,
): Emission {
  const angle = orientationFor(context, pattern, anchor);
  switch (pattern.kind) {
    case 'cluster': return emitCluster(anchor, angle, pattern, region, context.grid, rng);
    case 'line': return emitLine(anchor, angle, pattern, region, context.grid, rng);
    case 'arc': return emitArc(anchor, angle, pattern, region, context.grid, rng);
    case 'blob': return emitBlob(anchor, angle, pattern, region, context.grid, rng);
    case 'edge': return emitEdge(anchor, angle, pattern, region, context.grid, rng);
    case 'island': return emitIsland(anchor, angle, pattern, region, context.grid, rng);
  }
}

function tryComposition(
  context: LandscapeContext,
  region: RegionInfo,
  pattern: LandscapePattern,
  reservations: readonly SpatialReservation[],
  occupied: readonly LandscapeFeature[],
  rng: Rng,
): Emission {
  if (region.cells.length === 0) return emptyEmission();
  for (let attempt = 0; attempt < 16; attempt++) {
    const fieldCell = region.cells[rng.int(region.cells.length)]!;
    const anchor = cellCenter(context.regions.grid, fieldCell);
    const emission = emit(context, anchor, pattern, region, rng);
    const accepted = emission.features.every((candidate) => (
      featureFitsBounds(candidate, context.grid)
      && featureFitsReservations(candidate, reservations)
      && occupied.every((existing) => !featuresOverlap(candidate, existing))
    ));
    if (accepted) return emission;
  }
  return emptyEmission();
}

export function generateLandscape(context: LandscapeContext, rng: Rng): LandscapeGenerationResult {
  const features: LandscapeFeature[] = [];
  const negativeSpace: SpatialReservation[] = [];
  const activeReservations = [...context.reservations];
  const sizeOrder: LandscapeSize[] = ['large', 'medium', 'small'];
  const regions = [...context.regions.regions].sort((a, b) => a.id.localeCompare(b.id));

  for (const size of sizeOrder) {
    for (const region of regions) {
      const patterns = LANDSCAPE_RECIPES[region.biomeId].patterns.filter((pattern) => pattern.size === size);
      for (const pattern of patterns) {
        for (let composition = 0; composition < pattern.compositionsPerRegion; composition++) {
          const emission = tryComposition(context, region, pattern, activeReservations, features, rng);
          for (const candidate of emission.features) {
            candidate.id = `landscape_${features.length}`;
            features.push(candidate);
          }
          for (const reservation of emission.negativeSpace) {
            reservation.id = `negative_space_${negativeSpace.length}`;
            negativeSpace.push(reservation);
            activeReservations.push(reservation);
          }
        }
      }
    }
  }
  return { features, negativeSpace };
}
