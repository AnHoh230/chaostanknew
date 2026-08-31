import type { Rng } from '../../core/rng';
import {
  FIELD_ENVIRONMENT_RULES,
  type FieldChannel,
  type FieldEnvironmentRule,
} from './fieldEnvironmentGrammar';
import {
  featureFitsBounds,
  featuresOverlap,
  rotatedFeatureEnvelope,
} from './landscapeGenerator';
import { cellCenter } from './worldGrid';
import type {
  GridSpec,
  LandscapeFeature,
  RegionMap,
  SpatialReservation,
  WorldFields,
} from './worldTypes';

export interface FieldEnvironmentContext {
  grid: GridSpec;
  fields: WorldFields;
  regions: RegionMap;
  reservations: readonly SpatialReservation[];
  occupied: readonly LandscapeFeature[];
}

interface Candidate {
  cell: number;
  score: number;
  tieBreaker: number;
}

function fieldValue(fields: WorldFields, channel: FieldChannel, cell: number): number {
  return fields[channel][cell]!;
}

function qualifies(context: FieldEnvironmentContext, rule: FieldEnvironmentRule, cell: number): boolean {
  const biome = context.regions.biomeByCell[cell];
  if (!biome || !rule.allowedBiomes.includes(biome)) return false;
  return Object.entries(rule.thresholds).every(([channel, threshold]) => {
    const value = fieldValue(context.fields, channel as FieldChannel, cell);
    return (threshold.min === undefined || value >= threshold.min)
      && (threshold.max === undefined || value <= threshold.max);
  });
}

function candidateScore(context: FieldEnvironmentContext, rule: FieldEnvironmentRule, cell: number): number {
  let score = 0;
  let weights = 0;
  for (const [channel, preference] of Object.entries(rule.preferences)) {
    const value = fieldValue(context.fields, channel as FieldChannel, cell);
    score += preference === 1 ? value : 1 - value;
    weights++;
  }
  return weights === 0 ? 0 : score / weights;
}

function targetCount(rule: FieldEnvironmentRule, structuralDensity: number): number {
  const density = Math.max(0, Math.min(1, structuralDensity));
  return Math.round(rule.minOccurrences + (rule.maxOccurrences - rule.minOccurrences) * density);
}

function strictReservationFit(
  feature: LandscapeFeature,
  reservations: readonly SpatialReservation[],
): boolean {
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

function createFeature(
  context: FieldEnvironmentContext,
  rule: FieldEnvironmentRule,
  cell: number,
  rng: Rng,
): LandscapeFeature {
  const center = cellCenter(context.fields.grid, cell);
  const jitter = context.fields.grid.cellSize * 0.18;
  return {
    id: '',
    demandClass: rule.demandClass,
    biomeId: context.regions.biomeByCell[cell]!,
    regionId: context.regions.regionByCell[cell]!,
    shape: rule.shape,
    size: rule.size,
    traversal: rule.traversal,
    role: rule.role,
    placementMode: rule.placementMode,
    footprint: {
      halfX: rng.range(rule.minFootprint.halfX, rule.maxFootprint.halfX),
      halfZ: rng.range(rule.minFootprint.halfZ, rule.maxFootprint.halfZ),
    },
    clearance: rule.clearance,
    position: {
      x: center.x + rng.range(-jitter, jitter),
      z: center.z + rng.range(-jitter, jitter),
    },
    rotation: rng.range(0, Math.PI * 2),
  };
}

export function generateFieldEnvironment(
  context: FieldEnvironmentContext,
  structuralDensity: number,
  rng: Rng,
): LandscapeFeature[] {
  const result: LandscapeFeature[] = [];
  const occupied = [...context.occupied];

  for (const rule of FIELD_ENVIRONMENT_RULES) {
    const candidates: Candidate[] = [];
    for (let cell = 0; cell < context.fields.grid.cols * context.fields.grid.rows; cell++) {
      if (!qualifies(context, rule, cell)) continue;
      candidates.push({ cell, score: candidateScore(context, rule, cell), tieBreaker: rng.next() });
    }
    candidates.sort((a, b) => b.score - a.score || b.tieBreaker - a.tieBreaker || a.cell - b.cell);

    const acceptedForRule: LandscapeFeature[] = [];
    for (const candidate of candidates) {
      if (acceptedForRule.length >= targetCount(rule, structuralDensity)) break;
      const feature = createFeature(context, rule, candidate.cell, rng);
      if (!featureFitsBounds(feature, context.grid)) continue;
      if (!strictReservationFit(feature, context.reservations)) continue;
      if (occupied.some((existing) => featuresOverlap(feature, existing))) continue;
      if (acceptedForRule.some((existing) => (
        Math.hypot(feature.position.x - existing.position.x, feature.position.z - existing.position.z) < rule.minSpacing
      ))) continue;
      feature.id = `environment_${result.length}`;
      result.push(feature);
      acceptedForRule.push(feature);
      occupied.push(feature);
    }
  }

  return result;
}
