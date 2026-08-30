import type {
  BiomeId,
  LandscapeRole,
  LandscapeSize,
  PlacementMode,
  TraversalType,
} from './worldTypes';

export type LandscapePatternKind = 'cluster' | 'line' | 'arc' | 'blob' | 'edge' | 'island';

export interface LandscapePattern {
  kind: LandscapePatternKind;
  size: LandscapeSize;
  role: LandscapeRole;
  traversal: TraversalType;
  placementMode: PlacementMode;
  compositionsPerRegion: number;
  clearance: number;
}

export interface LandscapeRecipe {
  biomeId: BiomeId;
  patterns: LandscapePattern[];
}

const p = (
  kind: LandscapePatternKind,
  size: LandscapeSize,
  role: LandscapeRole,
  traversal: TraversalType,
  placementMode: PlacementMode,
  compositionsPerRegion = 1,
  clearance = 2,
): LandscapePattern => ({ kind, size, role, traversal, placementMode, compositionsPerRegion, clearance });

export const LANDSCAPE_RECIPES: Record<BiomeId, LandscapeRecipe> = {
  wasteland: {
    biomeId: 'wasteland',
    patterns: [
      p('island', 'large', 'landmark', 'blocking', 'cluster', 1, 5),
      p('blob', 'medium', 'filler', 'destructible', 'cluster'),
      p('cluster', 'small', 'cover', 'destructible', 'cluster', 2, 1),
    ],
  },
  scrap: {
    biomeId: 'scrap',
    patterns: [
      p('island', 'large', 'landmark', 'blocking', 'cluster', 1, 4),
      p('blob', 'medium', 'cover', 'blocking', 'cluster', 2, 3),
      p('cluster', 'small', 'filler', 'destructible', 'cluster', 2, 1),
    ],
  },
  industrial: {
    biomeId: 'industrial',
    patterns: [
      p('line', 'large', 'border', 'blocking', 'line', 1, 4),
      p('cluster', 'medium', 'cover', 'blocking', 'cluster', 2, 3),
      p('edge', 'small', 'filler', 'destructible', 'border', 2, 1),
    ],
  },
  mud: {
    biomeId: 'mud',
    patterns: [
      p('island', 'large', 'clearing-anchor', 'driveable', 'cluster', 1, 3),
      p('blob', 'medium', 'cover', 'destructible', 'cluster', 1, 2),
      p('cluster', 'small', 'filler', 'driveable', 'cluster', 2, 1),
    ],
  },
  ruins: {
    biomeId: 'ruins',
    patterns: [
      p('arc', 'large', 'landmark', 'blocking', 'site', 1, 4),
      p('line', 'medium', 'border', 'blocking', 'line', 2, 3),
      p('cluster', 'small', 'cover', 'destructible', 'cluster', 2, 1),
    ],
  },
  crater: {
    biomeId: 'crater',
    patterns: [
      p('island', 'large', 'clearing-anchor', 'blocking', 'site', 1, 4),
      p('arc', 'medium', 'border', 'blocking', 'border', 2, 3),
      p('blob', 'small', 'filler', 'destructible', 'cluster', 2, 1),
    ],
  },
};
