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
const ALL_BIOMES: BiomeId[] = ['wasteland', 'scrap', 'industrial', 'mud', 'ruins', 'crater'];
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
  'ground.wasteland',
  'ground.mud',
  'ground.ruins',
  'ground.crater',
  'ground.transition',
  'corridor.surface',
  'corridor.edge',
  'industrial.linearBarrier',
  'industrial.coverCluster',
  'industrial.breakableEdge',
  'scrap.landmarkIsland',
  'scrap.wreckCluster',
  'scrap.scrapPile',
  'wasteland.landmarkIsland',
  'wasteland.destructibleBlob',
  'wasteland.coverCluster',
  'site.industrialYard',
  'site.scrapYard',
  'site.entrance',
];

const TRANSITION_BIOME_PAIRS: [BiomeId, BiomeId][] = [
  ['crater', 'industrial'],
  ['crater', 'mud'],
  ['crater', 'ruins'],
  ['crater', 'scrap'],
  ['crater', 'wasteland'],
  ['industrial', 'mud'],
  ['industrial', 'ruins'],
  ['industrial', 'scrap'],
  ['industrial', 'wasteland'],
  ['mud', 'ruins'],
  ['mud', 'scrap'],
  ['mud', 'wasteland'],
  ['ruins', 'scrap'],
  ['ruins', 'wasteland'],
  ['scrap', 'wasteland'],
];

const transitionFamilies = TRANSITION_BIOME_PAIRS.map(([fromBiome, toBiome]) => family({
  id: `transition-${fromBiome}-${toBiome}`,
  demandClass: 'ground.transition',
  biomes: [fromBiome, toBiome],
  count: 1,
  footprint: { halfX: 0, halfZ: 0 },
  file: `transition_${fromBiome}_${toBiome}.png`,
  connectorProfiles: ['biome-boundary-v1'],
}));

export const IRONWASTE_V1_PREVIEW_KIT: WorldStyleKit = {
  id: KIT_ID,
  version: 3,
  catalogSignature: REQUIRED_ASSET_CATALOG.signature,
  activation: 'preview',
  previewScope: PREVIEW_SCOPE,
  previewBiomes: ALL_BIOMES,
  globalStyle: {
    texelsPerWorldUnit: 16,
    materialFinish: 'matte-weathered',
    palette: {
      graphite: '#22272a',
      concrete: '#596166',
      steel: '#6f7a7d',
      rust: '#a04f2a',
      soil: '#49382c',
      ash: '#6b665b',
      dryClay: '#77614b',
      bone: '#a29a82',
      mudBrown: '#50483a',
      ruinStone: '#77736b',
      craterChar: '#3d3530',
      cyanAccent: '#3d9ca5',
    },
    damageLanguage: 'oxidized-edges-cracks-and-impact-scars',
    lightingModel: 'overcast-directional-low-specular',
  },
  biomeKits: [
    { biomeId: 'industrial', groundFamilyId: `${KIT_ID}.ground-industrial`, paletteSlots: ['graphite', 'concrete', 'steel', 'rust'] },
    { biomeId: 'scrap', groundFamilyId: `${KIT_ID}.ground-scrap`, paletteSlots: ['graphite', 'rust', 'soil', 'steel'] },
    { biomeId: 'wasteland', groundFamilyId: `${KIT_ID}.ground-wasteland`, paletteSlots: ['soil', 'dryClay', 'ash', 'bone', 'rust'] },
    { biomeId: 'mud', groundFamilyId: `${KIT_ID}.ground-mud`, paletteSlots: ['mudBrown', 'soil', 'ash', 'steel'] },
    { biomeId: 'ruins', groundFamilyId: `${KIT_ID}.ground-ruins`, paletteSlots: ['ruinStone', 'concrete', 'ash', 'rust'] },
    { biomeId: 'crater', groundFamilyId: `${KIT_ID}.ground-crater`, paletteSlots: ['craterChar', 'ash', 'soil', 'rust'] },
  ],
  families: [
    family({ id: 'ground-industrial', demandClass: 'ground.industrial', biomes: ['industrial'], count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'ground_industrial.png', connectorProfiles: ['ground-material-v1'] }),
    family({ id: 'ground-scrap', demandClass: 'ground.scrap', biomes: ['scrap'], count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'ground_scrap.png', connectorProfiles: ['ground-material-v1'] }),
    family({ id: 'ground-wasteland', demandClass: 'ground.wasteland', biomes: ['wasteland'], count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'ground_wasteland.png', connectorProfiles: ['ground-material-v1'] }),
    family({ id: 'ground-mud', demandClass: 'ground.mud', biomes: ['mud'], count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'ground_mud.png', connectorProfiles: ['ground-material-v1'] }),
    family({ id: 'ground-ruins', demandClass: 'ground.ruins', biomes: ['ruins'], count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'ground_ruins.png', connectorProfiles: ['ground-material-v1'] }),
    family({ id: 'ground-crater', demandClass: 'ground.crater', biomes: ['crater'], count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'ground_crater.png', connectorProfiles: ['ground-material-v1'] }),
    ...transitionFamilies,
    family({ id: 'corridor-surface', demandClass: 'corridor.surface', biomes: ALL_BIOMES, count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'road_surface.png', connectorProfiles: ['corridor-width-v1'] }),
    family({ id: 'corridor-edge', demandClass: 'corridor.edge', biomes: ALL_BIOMES, count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'road_edge.png', connectorProfiles: ['corridor-width-v1'] }),
    family({ id: 'industrial-linear-barrier', demandClass: 'industrial.linearBarrier', biomes: ['industrial'], count: 2, footprint: { halfX: 7, halfZ: 3 }, file: 'sprite_industrial_linear_barrier.png' }),
    family({ id: 'industrial-cover-cluster', demandClass: 'industrial.coverCluster', biomes: ['industrial'], count: 3, footprint: { halfX: 4, halfZ: 3 }, file: 'sprite_industrial_cover_cluster.png' }),
    family({ id: 'industrial-breakable-edge', demandClass: 'industrial.breakableEdge', biomes: ['industrial'], count: 3, footprint: { halfX: 2, halfZ: 2 }, file: 'sprite_industrial_breakable_edge.png', states: ALL_STATES }),
    family({ id: 'scrap-landmark-island', demandClass: 'scrap.landmarkIsland', biomes: ['scrap'], count: 2, footprint: { halfX: 7, halfZ: 6 }, file: 'sprite_scrap_landmark.png' }),
    family({ id: 'scrap-wreck-cluster', demandClass: 'scrap.wreckCluster', biomes: ['scrap'], count: 3, footprint: { halfX: 4, halfZ: 4 }, file: 'sprite_scrap_wreck_cluster.png' }),
    family({ id: 'scrap-pile', demandClass: 'scrap.scrapPile', biomes: ['scrap'], count: 3, footprint: { halfX: 2, halfZ: 2 }, file: 'sprite_scrap_pile.png', states: ALL_STATES }),
    family({ id: 'wasteland-landmark-island', demandClass: 'wasteland.landmarkIsland', biomes: ['wasteland'], count: 2, footprint: { halfX: 8, halfZ: 8 }, file: 'sprite_wasteland_landmark.png' }),
    family({ id: 'wasteland-destructible-blob', demandClass: 'wasteland.destructibleBlob', biomes: ['wasteland'], count: 3, footprint: { halfX: 6, halfZ: 5 }, file: 'sprite_wasteland_debris.png', states: ALL_STATES }),
    family({ id: 'wasteland-cover-cluster', demandClass: 'wasteland.coverCluster', biomes: ['wasteland'], count: 3, footprint: { halfX: 3, halfZ: 3 }, file: 'sprite_wasteland_cover.png', states: ALL_STATES }),
    family({ id: 'industrial-yard', demandClass: 'site.industrialYard', biomes: ['industrial'], count: 2, footprint: { halfX: 20, halfZ: 20 }, file: 'sprite_site_industrial_yard.png', connectorProfiles: ['yard-road-v1'], ports: [YARD_PORT] }),
    family({ id: 'scrap-yard', demandClass: 'site.scrapYard', biomes: ['scrap'], count: 2, footprint: { halfX: 20, halfZ: 20 }, file: 'sprite_site_scrap_yard.png', connectorProfiles: ['yard-road-v1'], ports: [YARD_PORT] }),
    family({ id: 'site-entrance', demandClass: 'site.entrance', biomes: ALL_BIOMES, count: 1, footprint: { halfX: 0, halfZ: 0 }, file: 'sprite_site_entrance.png', connectorProfiles: ['yard-road-v1'], ports: [{ ...YARD_PORT, kind: 'road', localZ: 0 }] }),
  ],
};
