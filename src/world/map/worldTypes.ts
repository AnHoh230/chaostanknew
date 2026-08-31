import type { Vec2 } from './mapTypes';

export type BiomeId = 'wasteland' | 'scrap' | 'industrial' | 'mud' | 'ruins' | 'crater';
export type LandscapeDemandClassId =
  | 'wasteland.landmarkIsland'
  | 'wasteland.destructibleBlob'
  | 'wasteland.coverCluster'
  | 'scrap.landmarkIsland'
  | 'scrap.wreckCluster'
  | 'scrap.scrapPile'
  | 'industrial.linearBarrier'
  | 'industrial.coverCluster'
  | 'industrial.breakableEdge'
  | 'mud.clearingIsland'
  | 'mud.destructibleBlob'
  | 'mud.fillerCluster'
  | 'ruins.landmarkArc'
  | 'ruins.linearBarrier'
  | 'ruins.coverCluster'
  | 'crater.clearingIsland'
  | 'crater.boundaryArc'
  | 'crater.destructibleBlob';
export type EnvironmentDemandClassId =
  | 'environment.dryBrush'
  | 'environment.wetBrush'
  | 'environment.rockOutcrop';
export type SiteDemandClassId =
  | 'site.wastelandOutpost'
  | 'site.scrapYard'
  | 'site.industrialYard'
  | 'site.mudBasin'
  | 'site.ruinsComplex'
  | 'site.craterStation';
export type DemandClassId = LandscapeDemandClassId
  | EnvironmentDemandClassId
  | `ground.${BiomeId}`
  | 'ground.transition'
  | 'corridor.surface'
  | 'corridor.edge'
  | 'junction.degree3'
  | 'junction.degree4'
  | SiteDemandClassId
  | 'site.entrance';
export type RegionId = string;
export type SiteId = string;
export type CorridorId = string;
export type FeatureId = string;

export interface Extents { halfX: number; halfZ: number }
export interface GridSpec { cols: number; rows: number; cellSize: number; extents: Extents }
export interface GridCell { col: number; row: number; index: number }

export interface WorldDNA {
  openness: number;
  industrialization: number;
  destruction: number;
  wetness: number;
  axisStrength: number;
  structuralDensity: number;
  targetRegionScale: number;
  roadDensity: number;
  clusterStrength: number;
}

export interface MacroInfluence {
  id: string;
  center: Vec2;
  radiusX: number;
  radiusZ: number;
  angle: number;
  weights: Pick<WorldDNA, 'openness' | 'industrialization' | 'destruction' | 'wetness'>;
}

export interface MacroStructure {
  axisAngle: number;
  axisStrength: number;
  influences: MacroInfluence[];
}

export interface WorldFields {
  grid: GridSpec;
  openness: Float32Array;
  industrial: Float32Array;
  wetness: Float32Array;
  destruction: Float32Array;
}

export interface DerivedPotentials {
  grid: GridSpec;
  scrap: Float32Array;
  building: Float32Array;
  ruin: Float32Array;
  mud: Float32Array;
  crater: Float32Array;
}

export interface ActiveBiomeSelection {
  biomes: Exclude<BiomeId, 'wasteland'>[];
  relevance: Record<Exclude<BiomeId, 'wasteland'>, number>;
}

export interface RegionSeed { id: RegionId; biomeId: Exclude<BiomeId, 'wasteland'>; cell: number }
export interface RegionInfo { id: RegionId; biomeId: BiomeId; cells: number[] }
export interface RegionMap {
  grid: GridSpec;
  biomeByCell: BiomeId[];
  regionByCell: RegionId[];
  regions: RegionInfo[];
  seeds: RegionSeed[];
}

export interface Site {
  id: SiteId;
  center: Vec2;
  radius: number;
  accessBand: number;
  regionId: RegionId;
  biomeId: BiomeId;
}

export interface TerrainCostEdge { a: SiteId; b: SiteId; cost: number; coarseCells: number[] }
export interface TerrainCostGraph { siteIds: SiteId[]; edges: TerrainCostEdge[] }
export interface TraversalEdge { a: SiteId; b: SiteId; estimatedCost: number }
export interface TraversalGraph { siteIds: SiteId[]; edges: TraversalEdge[] }

export interface RoutedCorridor {
  id: CorridorId;
  fromSiteId: SiteId;
  toSiteId: SiteId;
  centerline: Vec2[];
  width: number;
  cells: number[];
}

export interface RealizedNode { id: string; kind: 'site' | 'junction'; pos: Vec2; siteId?: SiteId }
export interface RealizedEdge { id: string; a: string; b: string; length: number; cost: number; cells: number[] }
export interface RealizedTraversalGraph { nodes: RealizedNode[]; edges: RealizedEdge[] }
export type SiteTopologyTag = 'hub' | 'deadEnd' | 'loopNode' | 'peripheral' | 'remote';
export interface SiteTopology { degree: number; distanceFromSpawn: number; tags: SiteTopologyTag[] }

export type ReservationType = 'spawn' | 'site' | 'corridor' | 'junction' | 'clearing';
export interface SpatialReservation {
  id: string;
  type: ReservationType;
  grid: GridSpec;
  cells: number[];
  clearance: number;
  allowedRoles: LandscapeRole[];
}

export type LandscapeShape = 'point' | 'line' | 'arc' | 'blob' | 'edge';
export type LandscapeSize = 'small' | 'medium' | 'large';
export type TraversalType = 'blocking' | 'destructible' | 'driveable';
export type LandscapeRole = 'landmark' | 'filler' | 'border' | 'cover' | 'clearing-anchor';
export type PlacementMode = 'single' | 'cluster' | 'line' | 'border' | 'site';
export interface Footprint { halfX: number; halfZ: number }
export interface LandscapeFeature {
  id: FeatureId;
  demandClass: LandscapeDemandClassId | EnvironmentDemandClassId;
  biomeId: BiomeId;
  regionId: RegionId;
  shape: LandscapeShape;
  size: LandscapeSize;
  traversal: TraversalType;
  role: LandscapeRole;
  placementMode: PlacementMode;
  footprint: Footprint;
  clearance: number;
  position: Vec2;
  rotation: number;
}

export interface ValidationFailure { invariant: string; detail: string }
export interface WorldValidation { hardFailures: ValidationFailure[] }
export interface WorldQualityMetrics {
  signature: string;
  composedRatio: number;
  maxUncomposedArea: number;
  longestCorridorWithoutNode: number;
}
export interface WorldDebugData {
  validation: WorldValidation;
  quality: WorldQualityMetrics;
  fieldStats: Record<string, { min: number; max: number; mean: number }>;
  selectedCandidates: Record<string, number[]>;
}

export interface WorldGenerationOptions {
  extents: Extents;
  fieldGrid: GridSpec;
  traversalGrid: GridSpec;
  corridorWidth: number;
  corridorClearance: number;
  maxSiteDegree: 4;
  dnaOverride?: Partial<WorldDNA>;
}

export interface GenerierteWelt {
  seed: number;
  extents: Extents;
  dna: WorldDNA;
  macro: MacroStructure;
  fields: WorldFields;
  potentials: DerivedPotentials;
  regions: RegionMap;
  sites: Site[];
  intentGraph: TraversalGraph;
  corridors: RoutedCorridor[];
  realizedGraph: RealizedTraversalGraph;
  siteTopology: Record<SiteId, SiteTopology>;
  reservations: SpatialReservation[];
  features: LandscapeFeature[];
  debug: WorldDebugData;
}
