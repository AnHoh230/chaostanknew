import { LANDSCAPE_RECIPES, type LandscapePattern } from './landscapeGrammar';
import { FIELD_ENVIRONMENT_RULES } from './fieldEnvironmentGrammar';
import type {
  AssetDemandRule,
  AssetFamilyRole,
  AssetState,
} from './assetDemandTypes';
import type { BiomeId, Footprint, LandscapeSize, SiteDemandClassId } from './worldTypes';

const BIOMES: BiomeId[] = ['wasteland', 'scrap', 'industrial', 'mud', 'ruins', 'crater'];
const ZERO: Footprint = { halfX: 0, halfZ: 0 };
export const SITE_DEMAND_BY_BIOME: Readonly<Record<BiomeId, SiteDemandClassId>> = {
  wasteland: 'site.wastelandOutpost',
  scrap: 'site.scrapYard',
  industrial: 'site.industrialYard',
  mud: 'site.mudBasin',
  ruins: 'site.ruinsComplex',
  crater: 'site.craterStation',
};

const SIZE_ENVELOPES: Record<LandscapeSize, { min: Footprint; max: Footprint }> = {
  small: { min: { halfX: 1.5, halfZ: 1.5 }, max: { halfX: 5.5, halfZ: 5.5 } },
  medium: { min: { halfX: 3, halfZ: 3 }, max: { halfX: 9, halfZ: 9 } },
  large: { min: { halfX: 4.5, halfZ: 4.5 }, max: { halfX: 14, halfZ: 14 } },
};

function familyRole(pattern: LandscapePattern): AssetFamilyRole {
  if (pattern.role === 'landmark' || pattern.role === 'clearing-anchor') return 'structure';
  if (pattern.role === 'border') return 'edge';
  if (pattern.placementMode === 'cluster') return 'cluster';
  return 'obstacle';
}

function requiredStates(pattern: LandscapePattern): AssetState[] {
  return pattern.traversal === 'destructible'
    ? ['intact', 'damaged', 'destroyed']
    : ['intact'];
}

const landscapeRules: AssetDemandRule[] = Object.values(LANDSCAPE_RECIPES).flatMap((recipe) => (
  recipe.patterns.map((pattern) => ({
    demandClass: pattern.demandClass,
    source: 'landscape',
    familyRole: familyRole(pattern),
    geometryMode: 'bounded',
    biomes: [recipe.biomeId],
    minFootprint: { ...SIZE_ENVELOPES[pattern.size].min },
    maxFootprint: { ...SIZE_ENVELOPES[pattern.size].max },
    connectorProfiles: [],
    requiredVariants: pattern.requiredVariants,
    requiredStates: requiredStates(pattern),
    reserved: false,
  }))
));

const environmentRules: AssetDemandRule[] = FIELD_ENVIRONMENT_RULES.map((rule) => ({
  demandClass: rule.demandClass,
  source: 'environment',
  familyRole: rule.placementMode === 'cluster' ? 'cluster' : 'obstacle',
  geometryMode: 'bounded',
  biomes: [...rule.allowedBiomes],
  minFootprint: { ...rule.minFootprint },
  maxFootprint: { ...rule.maxFootprint },
  connectorProfiles: [],
  requiredVariants: 3,
  requiredStates: rule.traversal === 'destructible'
    ? ['intact', 'damaged', 'destroyed']
    : ['intact'],
  reserved: false,
}));

const groundRules: AssetDemandRule[] = BIOMES.map((biome) => ({
  demandClass: `ground.${biome}`,
  source: 'ground',
  familyRole: 'surface',
  geometryMode: 'tileable',
  biomes: [biome],
  minFootprint: { ...ZERO },
  maxFootprint: { ...ZERO },
  connectorProfiles: ['ground-material-v1'],
  requiredVariants: 1,
  requiredStates: ['intact'],
  reserved: false,
}));

const structuralRules: AssetDemandRule[] = [
  {
    demandClass: 'ground.transition',
    source: 'transition',
    familyRole: 'surface',
    geometryMode: 'parametric',
    biomes: [...BIOMES],
    minFootprint: { ...ZERO },
    maxFootprint: { ...ZERO },
    connectorProfiles: ['biome-boundary-v1'],
    requiredVariants: 1,
    requiredStates: ['intact'],
    reserved: false,
  },
  ...(['corridor.surface', 'corridor.edge'] as const).map((demandClass) => ({
    demandClass,
    source: 'corridor' as const,
    familyRole: demandClass === 'corridor.surface' ? 'surface' as const : 'edge' as const,
    geometryMode: 'parametric' as const,
    biomes: [...BIOMES],
    minFootprint: { ...ZERO },
    maxFootprint: { ...ZERO },
    connectorProfiles: ['corridor-width-v1'],
    requiredVariants: 1,
    requiredStates: ['intact' as const],
    reserved: false,
  })),
  ...(['junction.degree3', 'junction.degree4'] as const).map((demandClass) => ({
    demandClass,
    source: 'junction' as const,
    familyRole: 'surface' as const,
    geometryMode: 'parametric' as const,
    biomes: [...BIOMES],
    minFootprint: { ...ZERO },
    maxFootprint: { ...ZERO },
    connectorProfiles: ['road-junction-v1'],
    requiredVariants: 1,
    requiredStates: ['intact' as const],
    reserved: false,
  })),
  ...BIOMES.map((biome) => ({
    demandClass: SITE_DEMAND_BY_BIOME[biome],
    source: 'site' as const,
    familyRole: 'site' as const,
    geometryMode: 'bounded' as const,
    biomes: [biome],
    minFootprint: { halfX: 10, halfZ: 10 },
    maxFootprint: { halfX: 40, halfZ: 40 },
    connectorProfiles: ['yard-road-v1'],
    requiredVariants: 2,
    requiredStates: ['intact' as const],
    reserved: true,
  })),
  {
    demandClass: 'site.entrance',
    source: 'site',
    familyRole: 'site',
    geometryMode: 'parametric',
    biomes: [...BIOMES],
    minFootprint: { ...ZERO },
    maxFootprint: { ...ZERO },
    connectorProfiles: ['yard-road-v1'],
    requiredVariants: 1,
    requiredStates: ['intact'],
    reserved: false,
  },
];

export const GENERATOR_CAPABILITY_SPEC: readonly AssetDemandRule[] = [
  ...landscapeRules,
  ...environmentRules,
  ...groundRules,
  ...structuralRules,
];
