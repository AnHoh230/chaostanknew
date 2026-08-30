import { REQUIRED_ASSET_CATALOG } from './assetDemandCompiler';
import type {
  AssetFamily,
  AssetPort,
  AssetState,
  AssetVariant,
  WorldStyleKit,
} from './assetDemandTypes';
import type { BiomeId, DemandClassId, Footprint } from './worldTypes';

const KIT_ID = 'ironwaste-v1';
const ROOT = 'style-kits/ironwaste-v1/candidates/';
const ALL_STATES: AssetState[] = ['intact', 'damaged', 'destroyed'];
const YARD_PORT: AssetPort = {
  id: 'road_port',
  kind: 'yard',
  localX: 0,
  localZ: -10,
  outwardAngle: -Math.PI / 2,
  width: 12,
  clearance: 3,
  compatibleWith: ['site.entrance', 'corridor.surface'],
};

interface FamilyOptions {
  id: string;
  demandClass: DemandClassId;
  biomes: BiomeId[];
  count: number;
  footprint: Footprint;
  file: string;
  connectorProfiles?: string[];
  states?: AssetState[];
  ports?: AssetPort[];
  geometryRecipe?: string;
}

function family(options: FamilyOptions): AssetFamily {
  const familyId = `${KIT_ID}.${options.id}`;
  const variants: AssetVariant[] = Array.from({ length: options.count }, (_, index) => ({
    id: `${familyId}.v${index + 1}`,
    familyId,
    footprint: { ...options.footprint },
    allowedRotations: 'any',
    ports: (options.ports ?? []).map((port) => ({ ...port, compatibleWith: [...port.compatibleWith] })),
    files: [`${ROOT}${options.file}`],
    states: [...(options.states ?? ['intact'])],
    geometryRecipe: options.geometryRecipe,
  }));
  return {
    id: familyId,
    styleKitId: KIT_ID,
    fulfills: [options.demandClass],
    biomes: [...options.biomes],
    connectorProfiles: [...(options.connectorProfiles ?? [])],
    variants,
  };
}

const PREVIEW_SCOPE: DemandClassId[] = [
  'ground.industrial',
  'ground.scrap',
  'ground.transition',
  'corridor.surface',
  'corridor.edge',
  'industrial.linearBarrier',
  'industrial.coverCluster',
  'industrial.breakableEdge',
  'scrap.landmarkIsland',
  'scrap.wreckCluster',
  'scrap.scrapPile',
  'site.industrialYard',
  'site.scrapYard',
  'site.entrance',
];

export const IRONWASTE_V1_PREVIEW_KIT: WorldStyleKit = {
  id: KIT_ID,
  version: 1,
  catalogSignature: REQUIRED_ASSET_CATALOG.signature,
  activation: 'preview',
  previewScope: PREVIEW_SCOPE,
  previewBiomes: ['industrial', 'scrap'],
  globalStyle: {
    texelsPerWorldUnit: 16,
    materialFinish: 'matte-weathered',
    palette: {
      graphite: '#22272a',
      concrete: '#596166',
      steel: '#6f7a7d',
      rust: '#a04f2a',
      soil: '#49382c',
      cyanAccent: '#3d9ca5',
    },
    damageLanguage: 'oxidized-edges-cracks-and-impact-scars',
    lightingModel: 'overcast-directional-low-specular',
  },
  biomeKits: [
    { biomeId: 'industrial', groundFamilyId: `${KIT_ID}.ground-industrial`, paletteSlots: ['graphite', 'concrete', 'steel', 'rust'] },
    { biomeId: 'scrap', groundFamilyId: `${KIT_ID}.ground-scrap`, paletteSlots: ['graphite', 'rust', 'soil', 'steel'] },
  ],
  families: [
    family({ id: 'ground-industrial', demandClass: 'ground.industrial', biomes: ['industrial'], count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'ground_industrial.png', connectorProfiles: ['ground-material-v1'] }),
    family({ id: 'ground-scrap', demandClass: 'ground.scrap', biomes: ['scrap'], count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'ground_scrap.png', connectorProfiles: ['ground-material-v1'] }),
    family({ id: 'transition-industrial-scrap', demandClass: 'ground.transition', biomes: ['industrial', 'scrap'], count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'transition_industrial_scrap.png', connectorProfiles: ['biome-boundary-v1'] }),
    family({ id: 'corridor-surface', demandClass: 'corridor.surface', biomes: ['industrial', 'scrap'], count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'road_surface.png', connectorProfiles: ['corridor-width-v1'] }),
    family({ id: 'corridor-edge', demandClass: 'corridor.edge', biomes: ['industrial', 'scrap'], count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'road_edge.png', connectorProfiles: ['corridor-width-v1'] }),
    family({ id: 'industrial-linear-barrier', demandClass: 'industrial.linearBarrier', biomes: ['industrial'], count: 2, footprint: { halfX: 7, halfZ: 3 }, file: 'decal_industrial_cracks.png', geometryRecipe: 'industrial-wall-and-hall-shell' }),
    family({ id: 'industrial-cover-cluster', demandClass: 'industrial.coverCluster', biomes: ['industrial'], count: 3, footprint: { halfX: 4, halfZ: 3 }, file: 'decal_industrial_cracks.png', geometryRecipe: 'industrial-container-and-pipe-cluster' }),
    family({ id: 'industrial-breakable-edge', demandClass: 'industrial.breakableEdge', biomes: ['industrial'], count: 3, footprint: { halfX: 2, halfZ: 2 }, file: 'decal_shared_grime.png', states: ALL_STATES, geometryRecipe: 'industrial-breakable-edge' }),
    family({ id: 'scrap-landmark-island', demandClass: 'scrap.landmarkIsland', biomes: ['scrap'], count: 2, footprint: { halfX: 7, halfZ: 6 }, file: 'decal_scrap_fragments.png', geometryRecipe: 'scrap-landmark-island' }),
    family({ id: 'scrap-wreck-cluster', demandClass: 'scrap.wreckCluster', biomes: ['scrap'], count: 3, footprint: { halfX: 4, halfZ: 4 }, file: 'decal_scrap_fragments.png', geometryRecipe: 'scrap-wreck-cluster' }),
    family({ id: 'scrap-pile', demandClass: 'scrap.scrapPile', biomes: ['scrap'], count: 3, footprint: { halfX: 2, halfZ: 2 }, file: 'decal_shared_grime.png', states: ALL_STATES, geometryRecipe: 'scrap-pile' }),
    family({ id: 'industrial-yard', demandClass: 'site.industrialYard', biomes: ['industrial'], count: 2, footprint: { halfX: 20, halfZ: 20 }, file: 'ground_industrial.png', connectorProfiles: ['yard-road-v1'], ports: [YARD_PORT], geometryRecipe: 'industrial-yard' }),
    family({ id: 'scrap-yard', demandClass: 'site.scrapYard', biomes: ['scrap'], count: 2, footprint: { halfX: 20, halfZ: 20 }, file: 'ground_scrap.png', connectorProfiles: ['yard-road-v1'], ports: [YARD_PORT], geometryRecipe: 'scrap-yard' }),
    family({ id: 'site-entrance', demandClass: 'site.entrance', biomes: ['industrial', 'scrap'], count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'road_edge.png', connectorProfiles: ['yard-road-v1'], ports: [{ ...YARD_PORT, kind: 'road', localZ: 0 }], geometryRecipe: 'site-entrance' }),
  ],
};
