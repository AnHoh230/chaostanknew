import type { BiomeId, DemandClassId, Footprint } from './worldTypes';

export type AssetDemandSource = 'landscape' | 'ground' | 'transition' | 'corridor' | 'junction' | 'site';
export type AssetFamilyRole = 'surface' | 'edge' | 'structure' | 'obstacle' | 'cluster' | 'decal' | 'site';
export type AssetGeometryMode = 'bounded' | 'tileable' | 'parametric';
export type AssetState = 'intact' | 'damaged' | 'destroyed';

export interface AssetDemandRule {
  demandClass: DemandClassId;
  source: AssetDemandSource;
  familyRole: AssetFamilyRole;
  geometryMode: AssetGeometryMode;
  biomes: BiomeId[];
  minFootprint: Footprint;
  maxFootprint: Footprint;
  connectorProfiles: string[];
  requiredVariants: number;
  requiredStates: AssetState[];
  reserved: boolean;
}

export interface RequiredAssetFamily extends AssetDemandRule {}

export interface RequiredAssetCatalog {
  schemaVersion: 1;
  generatorVersion: string;
  families: RequiredAssetFamily[];
  signature: string;
}
