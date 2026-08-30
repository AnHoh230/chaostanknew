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

export interface AssetDemandOccurrence {
  id: string;
  demandClass: string;
  source: AssetDemandSource;
  biomes: BiomeId[];
  footprint: Footprint;
  connectorProfiles: string[];
}

export interface ObservedFootprintRange {
  min: Footprint;
  max: Footprint;
}

export interface AssetCoverageReport {
  counts: Record<string, number>;
  observedFootprints: Record<string, ObservedFootprintRange>;
  missingCatalogClasses: string[];
  unknownDemandClasses: string[];
  signature: string;
}

export interface AssetPort {
  id: string;
  kind: 'road' | 'gate' | 'wall' | 'building' | 'pipe' | 'yard';
  localX: number;
  localZ: number;
  outwardAngle: number;
  width: number;
  clearance: number;
  compatibleWith: string[];
}

export interface AssetVariant {
  id: string;
  familyId: string;
  footprint: Footprint;
  allowedRotations: 'any' | number[];
  ports: AssetPort[];
  files: string[];
  states: AssetState[];
  geometryRecipe?: string;
}

export interface AssetFamily {
  id: string;
  styleKitId: string;
  fulfills: DemandClassId[];
  biomes: BiomeId[];
  connectorProfiles: string[];
  variants: AssetVariant[];
}

export interface GlobalStyleContract {
  texelsPerWorldUnit: number;
  materialFinish: string;
  palette: Record<string, string>;
  damageLanguage: string;
  lightingModel: string;
}

export interface BiomeStyleKit {
  biomeId: BiomeId;
  groundFamilyId: string;
  paletteSlots: string[];
}

export interface WorldStyleKit {
  id: string;
  version: number;
  catalogSignature: string;
  activation: 'preview' | 'runtime';
  previewScope: DemandClassId[];
  previewBiomes: BiomeId[];
  globalStyle: GlobalStyleContract;
  biomeKits: BiomeStyleKit[];
  families: AssetFamily[];
}

export interface WorldStyleKitValidation {
  activation: WorldStyleKit['activation'];
  coveredDemandClasses: string[];
  missingDemandClasses: string[];
}

export interface ResolvedAssetChoice {
  family: AssetFamily;
  variant: AssetVariant;
}
