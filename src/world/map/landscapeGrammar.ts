import type {
  BiomeId,
  LandscapeDemandClassId,
  LandscapeRole,
  LandscapeSize,
  PlacementMode,
  TraversalType,
} from './worldTypes';

export type LandscapePatternKind = 'cluster' | 'line' | 'arc' | 'blob' | 'edge' | 'island';

export interface LandscapePattern {
  demandClass: LandscapeDemandClassId;
  kind: LandscapePatternKind;
  size: LandscapeSize;
  role: LandscapeRole;
  traversal: TraversalType;
  placementMode: PlacementMode;
  compositionsPerRegion: number;
  clearance: number;
  requiredVariants: number;
}

export interface LandscapeRecipe {
  biomeId: BiomeId;
  patterns: LandscapePattern[];
}

const p = (
  demandClass: LandscapeDemandClassId,
  kind: LandscapePatternKind,
  size: LandscapeSize,
  role: LandscapeRole,
  traversal: TraversalType,
  placementMode: PlacementMode,
  compositionsPerRegion = 1,
  clearance = 2,
  requiredVariants = size === 'large' ? 2 : 3,
): LandscapePattern => ({ demandClass, kind, size, role, traversal, placementMode, compositionsPerRegion, clearance, requiredVariants });

export const LANDSCAPE_RECIPES: Record<BiomeId, LandscapeRecipe> = {
  wasteland: {
    biomeId: 'wasteland',
    patterns: [
      p('wasteland.landmarkIsland', 'island', 'large', 'landmark', 'blocking', 'cluster', 1, 5),
      p('wasteland.destructibleBlob', 'blob', 'medium', 'filler', 'destructible', 'cluster'),
      p('wasteland.coverCluster', 'cluster', 'small', 'cover', 'destructible', 'cluster', 2, 1),
    ],
  },
  scrap: {
    biomeId: 'scrap',
    patterns: [
      p('scrap.landmarkIsland', 'island', 'large', 'landmark', 'blocking', 'cluster', 1, 4),
      p('scrap.wreckCluster', 'blob', 'medium', 'cover', 'blocking', 'cluster', 2, 3),
      p('scrap.scrapPile', 'cluster', 'small', 'filler', 'destructible', 'cluster', 2, 1),
    ],
  },
  industrial: {
    biomeId: 'industrial',
    patterns: [
      p('industrial.linearBarrier', 'line', 'large', 'border', 'blocking', 'line', 1, 4),
      p('industrial.coverCluster', 'cluster', 'medium', 'cover', 'blocking', 'cluster', 2, 3),
      p('industrial.breakableEdge', 'edge', 'small', 'filler', 'destructible', 'border', 2, 1),
    ],
  },
  mud: {
    biomeId: 'mud',
    patterns: [
      p('mud.clearingIsland', 'island', 'large', 'clearing-anchor', 'driveable', 'cluster', 1, 3),
      p('mud.destructibleBlob', 'blob', 'medium', 'cover', 'destructible', 'cluster', 1, 2),
      p('mud.fillerCluster', 'cluster', 'small', 'filler', 'driveable', 'cluster', 2, 1),
    ],
  },
  ruins: {
    biomeId: 'ruins',
    patterns: [
      p('ruins.landmarkArc', 'arc', 'large', 'landmark', 'blocking', 'site', 1, 4),
      p('ruins.linearBarrier', 'line', 'medium', 'border', 'blocking', 'line', 2, 3),
      p('ruins.coverCluster', 'cluster', 'small', 'cover', 'destructible', 'cluster', 2, 1),
    ],
  },
  crater: {
    biomeId: 'crater',
    patterns: [
      p('crater.clearingIsland', 'island', 'large', 'clearing-anchor', 'blocking', 'site', 1, 4),
      p('crater.boundaryArc', 'arc', 'medium', 'border', 'blocking', 'border', 2, 3),
      p('crater.destructibleBlob', 'blob', 'small', 'filler', 'destructible', 'cluster', 2, 1),
    ],
  },
};
