import type { EntityKind, MapEntity, Vec2 } from './mapTypes';
import type { BiomeId, Extents, GridSpec, RegionId, RoutedCorridor } from './worldTypes';

export interface RuntimeRegionCell {
  cell: number;
  biomeId: BiomeId;
  regionId: RegionId;
}

export interface RuntimeKarte {
  seed: number;
  extents: Extents;
  spawn: Vec2;
  entities: MapEntity[];
  regionGrid: GridSpec;
  traversalGrid: GridSpec;
  regionCells: RuntimeRegionCell[];
  corridors: RoutedCorridor[];
}

export function entityKindForTraversal(traversal: 'blocking' | 'destructible' | 'driveable', landmark: boolean): EntityKind {
  if (traversal === 'destructible') return 'breakable';
  if (traversal === 'blocking') return landmark ? 'landmark' : 'obstacle';
  return 'decor';
}
