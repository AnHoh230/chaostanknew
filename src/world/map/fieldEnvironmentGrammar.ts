import type {
  BiomeId,
  EnvironmentDemandClassId,
  Footprint,
  LandscapeRole,
  LandscapeShape,
  LandscapeSize,
  PlacementMode,
  TraversalType,
} from './worldTypes';

export type FieldChannel = 'openness' | 'industrial' | 'wetness' | 'destruction';

export interface FieldThreshold {
  min?: number;
  max?: number;
}

export interface FieldEnvironmentRule {
  demandClass: EnvironmentDemandClassId;
  allowedBiomes: BiomeId[];
  thresholds: Partial<Record<FieldChannel, FieldThreshold>>;
  preferences: Partial<Record<FieldChannel, 1 | -1>>;
  minFootprint: Footprint;
  maxFootprint: Footprint;
  shape: LandscapeShape;
  size: LandscapeSize;
  traversal: TraversalType;
  role: LandscapeRole;
  placementMode: PlacementMode;
  clearance: number;
  minSpacing: number;
  minOccurrences: number;
  maxOccurrences: number;
}

export const FIELD_ENVIRONMENT_RULES: readonly FieldEnvironmentRule[] = [
  {
    demandClass: 'environment.dryBrush',
    allowedBiomes: ['wasteland', 'scrap', 'ruins'],
    thresholds: {
      wetness: { max: 0.54 },
    },
    preferences: { openness: 1, wetness: -1, industrial: -1 },
    minFootprint: { halfX: 1.5, halfZ: 1.5 },
    maxFootprint: { halfX: 3.5, halfZ: 3 },
    shape: 'point',
    size: 'small',
    traversal: 'destructible',
    role: 'filler',
    placementMode: 'cluster',
    clearance: 1,
    minSpacing: 30,
    minOccurrences: 4,
    maxOccurrences: 14,
  },
  {
    demandClass: 'environment.wetBrush',
    allowedBiomes: ['mud', 'wasteland'],
    thresholds: {
      wetness: { min: 0.46 },
    },
    preferences: { wetness: 1, industrial: -1, openness: -1 },
    minFootprint: { halfX: 2, halfZ: 2 },
    maxFootprint: { halfX: 4, halfZ: 3.5 },
    shape: 'point',
    size: 'small',
    traversal: 'destructible',
    role: 'cover',
    placementMode: 'cluster',
    clearance: 1,
    minSpacing: 28,
    minOccurrences: 4,
    maxOccurrences: 14,
  },
  {
    demandClass: 'environment.rockOutcrop',
    allowedBiomes: ['crater', 'ruins', 'scrap', 'wasteland'],
    thresholds: {
      destruction: { min: 0.55 },
      wetness: { max: 0.72 },
    },
    preferences: { destruction: 1, wetness: -1, openness: -1 },
    minFootprint: { halfX: 3, halfZ: 3 },
    maxFootprint: { halfX: 6.5, halfZ: 5.5 },
    shape: 'blob',
    size: 'medium',
    traversal: 'blocking',
    role: 'cover',
    placementMode: 'single',
    clearance: 2,
    minSpacing: 38,
    minOccurrences: 3,
    maxOccurrences: 10,
  },
] as const;
