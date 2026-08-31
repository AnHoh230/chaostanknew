import { assertApprovedCandidateManifest, type AssetCandidateManifest } from './assetCandidateManifest';
import { REQUIRED_ASSET_CATALOG } from './assetDemandCompiler';
import { SITE_DEMAND_BY_BIOME } from './generatorCapabilitySpec';
import type {
  AssetFamilyRole,
  AssetGeometryMode,
  AssetDemandOccurrence,
  AssetDemandSource,
  AssetVariant,
  WorldStyleKit,
} from './assetDemandTypes';
import type { Vec2 } from './mapTypes';
import { resolveAssetFamily, validateWorldStyleKit } from './worldStyleKit';
import type {
  BiomeId,
  DemandClassId,
  Footprint,
  GenerierteWelt,
  GridSpec,
  LandscapeRole,
  TraversalType,
} from './worldTypes';

const ZERO: Footprint = { halfX: 0, halfZ: 0 };

export interface ResolvedStyleAsset {
  status: 'resolved';
  familyId: string;
  variantId: string;
  files: string[];
  footprint: Footprint;
  geometryRecipe?: string;
}

export interface MissingStyleAsset {
  status: 'missing';
  demandClass: DemandClassId;
  reason: 'outside-preview-scope' | 'no-compatible-family';
  footprint: Footprint;
  familyRole: AssetFamilyRole;
  geometryMode: AssetGeometryMode;
}

export type PlacementStyleAsset = ResolvedStyleAsset | MissingStyleAsset;

interface PlacementBase {
  id: string;
  demandId: string;
  demandClass: DemandClassId;
  biomes: BiomeId[];
  asset: PlacementStyleAsset;
}

export interface GroundAssetPlacement extends PlacementBase {
  kind: 'ground';
  biomeId: BiomeId;
  grid: GridSpec;
  cells: number[];
}

export interface TransitionAssetPlacement extends PlacementBase {
  kind: 'transition';
  cellA: number;
  cellB: number;
  fromBiome: BiomeId;
  toBiome: BiomeId;
  center: Vec2;
  tangent: Vec2;
  normal: Vec2;
  length: number;
}

export interface CorridorAssetPlacement extends PlacementBase {
  kind: 'corridor';
  corridorId: string;
  layer: 'surface' | 'edge';
  centerline: Vec2[];
  width: number;
}

export interface JunctionAssetPlacement extends PlacementBase {
  kind: 'junction';
  junctionId: string;
  position: Vec2;
  degree: 3 | 4;
}

export interface LandscapeAssetPlacement extends PlacementBase {
  kind: 'landscape';
  featureId: string;
  position: Vec2;
  rotation: number;
  footprint: Footprint;
  traversal: TraversalType;
  role: LandscapeRole;
}

export interface SiteAssetPlacement extends PlacementBase {
  kind: 'site';
  siteId: string;
  position: Vec2;
  rotation: number;
  radius: number;
  footprint: Footprint;
}

export interface EntranceAssetPlacement extends PlacementBase {
  kind: 'entrance';
  siteId: string;
  corridorId: string;
  position: Vec2;
  rotation: number;
  width: number;
}

export type WorldAssetPlacement =
  | GroundAssetPlacement
  | TransitionAssetPlacement
  | CorridorAssetPlacement
  | JunctionAssetPlacement
  | LandscapeAssetPlacement
  | SiteAssetPlacement
  | EntranceAssetPlacement;

export interface WorldAssetPlacementPlan {
  worldSeed: number;
  visualSeed: number;
  kitId: string;
  kitVersion: number;
  catalogSignature: string;
  placements: WorldAssetPlacement[];
}

type Unresolved<T extends WorldAssetPlacement> = T extends WorldAssetPlacement
  ? Omit<T, keyof PlacementBase | 'asset'> & { demand: AssetDemandOccurrence }
  : never;
type UnresolvedPlacement = Unresolved<WorldAssetPlacement>;

function cloneGrid(grid: GridSpec): GridSpec {
  return { ...grid, extents: { ...grid.extents } };
}

function occurrence(
  id: string,
  demandClass: DemandClassId,
  source: AssetDemandSource,
  biomes: BiomeId[],
  footprint: Footprint = ZERO,
  connectorProfiles: string[] = [],
): AssetDemandOccurrence {
  return {
    id,
    demandClass,
    source,
    biomes: [...biomes].sort((a, b) => a.localeCompare(b)),
    footprint: { ...footprint },
    connectorProfiles: [...connectorProfiles].sort((a, b) => a.localeCompare(b)),
  };
}

function groundTargets(world: GenerierteWelt): UnresolvedPlacement[] {
  return [...new Set(world.regions.biomeByCell)]
    .sort((a, b) => a.localeCompare(b))
    .map((biomeId) => ({
      kind: 'ground',
      demand: occurrence(`ground_${biomeId}`, `ground.${biomeId}`, 'ground', [biomeId], ZERO, ['ground-material-v1']),
      biomeId,
      grid: cloneGrid(world.regions.grid),
      cells: world.regions.biomeByCell.flatMap((biome, cell) => biome === biomeId ? [cell] : []),
    }));
}

function transitionTargets(world: GenerierteWelt): UnresolvedPlacement[] {
  const result: UnresolvedPlacement[] = [];
  const grid = world.regions.grid;
  const biomes = world.regions.biomeByCell;
  const add = (cellA: number, cellB: number, horizontalNeighbor: boolean): void => {
    const fromBiome = biomes[cellA]!;
    const toBiome = biomes[cellB]!;
    if (fromBiome === toBiome) return;
    const col = cellA % grid.cols;
    const row = Math.floor(cellA / grid.cols);
    const center = horizontalNeighbor
      ? {
          x: -grid.extents.halfX + (col + 1) * grid.cellSize,
          z: -grid.extents.halfZ + (row + 0.5) * grid.cellSize,
        }
      : {
          x: -grid.extents.halfX + (col + 0.5) * grid.cellSize,
          z: -grid.extents.halfZ + (row + 1) * grid.cellSize,
        };
    result.push({
      kind: 'transition',
      demand: occurrence(
        `ground_transition_${cellA}_${cellB}`,
        'ground.transition',
        'transition',
        [fromBiome, toBiome],
        ZERO,
        ['biome-boundary-v1'],
      ),
      cellA,
      cellB,
      fromBiome,
      toBiome,
      center,
      tangent: horizontalNeighbor ? { x: 0, z: 1 } : { x: 1, z: 0 },
      normal: horizontalNeighbor ? { x: 1, z: 0 } : { x: 0, z: 1 },
      length: grid.cellSize,
    });
  };
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cell = row * grid.cols + col;
      if (col + 1 < grid.cols) add(cell, cell + 1, true);
      if (row + 1 < grid.rows) add(cell, cell + grid.cols, false);
    }
  }
  return result;
}

function corridorTargets(world: GenerierteWelt): UnresolvedPlacement[] {
  return world.corridors.flatMap((corridor) => {
    const footprint = { halfX: corridor.width / 2, halfZ: corridor.width / 2 };
    const common = {
      corridorId: corridor.id,
      centerline: corridor.centerline.map((point) => ({ ...point })),
      width: corridor.width,
    };
    return [
      {
        kind: 'corridor' as const,
        demand: occurrence(`corridor_surface_${corridor.id}`, 'corridor.surface', 'corridor', [], footprint, ['corridor-width-v1']),
        layer: 'surface' as const,
        ...common,
      },
      {
        kind: 'corridor' as const,
        demand: occurrence(`corridor_edge_${corridor.id}`, 'corridor.edge', 'corridor', [], footprint, ['corridor-width-v1']),
        layer: 'edge' as const,
        ...common,
      },
    ];
  });
}

function junctionTargets(world: GenerierteWelt): UnresolvedPlacement[] {
  return world.realizedGraph.nodes.flatMap((node) => {
    if (node.kind !== 'junction') return [];
    const degree = world.realizedGraph.edges.reduce((count, edge) => (
      count + (edge.a === node.id || edge.b === node.id ? 1 : 0)
    ), 0);
    if (degree !== 3 && degree !== 4) return [];
    return [{
      kind: 'junction' as const,
      demand: occurrence(
        `junction_${node.id}`,
        degree === 3 ? 'junction.degree3' : 'junction.degree4',
        'junction',
        [],
        ZERO,
        ['road-junction-v1'],
      ),
      junctionId: node.id,
      position: { ...node.pos },
      degree,
    }];
  });
}

function landscapeTargets(world: GenerierteWelt): UnresolvedPlacement[] {
  return world.features.map((feature) => ({
    kind: 'landscape',
    demand: occurrence(
      `landscape_${feature.id}`,
      feature.demandClass,
      feature.demandClass.startsWith('environment.') ? 'environment' : 'landscape',
      [feature.biomeId],
      feature.footprint,
    ),
    featureId: feature.id,
    position: { ...feature.position },
    rotation: feature.rotation,
    footprint: { ...feature.footprint },
    traversal: feature.traversal,
    role: feature.role,
  }));
}

function siteTargets(world: GenerierteWelt): UnresolvedPlacement[] {
  return world.sites.map((site) => {
    const demandClass = SITE_DEMAND_BY_BIOME[site.biomeId];
    const footprint = { halfX: site.radius, halfZ: site.radius };
    return {
      kind: 'site' as const,
      demand: occurrence(`site_${site.biomeId}_${site.id}`, demandClass, 'site', [site.biomeId], footprint, ['yard-road-v1']),
      siteId: site.id,
      position: { ...site.center },
      rotation: 0,
      radius: site.radius,
      footprint,
    };
  });
}

function entranceTarget(world: GenerierteWelt, corridorIndex: number, atStart: boolean): UnresolvedPlacement {
  const corridor = world.corridors[corridorIndex]!;
  const siteId = atStart ? corridor.fromSiteId : corridor.toSiteId;
  const site = world.sites.find((entry) => entry.id === siteId);
  if (!site) throw new Error(`corridor-site-missing:${corridor.id}:${siteId}`);
  const endpointIndex = atStart ? 0 : corridor.centerline.length - 1;
  const neighborIndex = atStart ? 1 : corridor.centerline.length - 2;
  const position = corridor.centerline[endpointIndex];
  const neighbor = corridor.centerline[neighborIndex];
  if (!position || !neighbor) throw new Error(`corridor-centerline-too-short:${corridor.id}`);
  return {
    kind: 'entrance',
    demand: occurrence(
      `site_entrance_${site.id}_${corridor.id}`,
      'site.entrance',
      'site',
      [site.biomeId],
      ZERO,
      ['yard-road-v1'],
    ),
    siteId: site.id,
    corridorId: corridor.id,
    position: { ...position },
    rotation: Math.atan2(neighbor.x - position.x, neighbor.z - position.z),
    width: corridor.width,
  };
}

function entranceTargets(world: GenerierteWelt): UnresolvedPlacement[] {
  return world.corridors.flatMap((_, corridorIndex) => [
    entranceTarget(world, corridorIndex, true),
    entranceTarget(world, corridorIndex, false),
  ]);
}

function buildTargets(world: GenerierteWelt): UnresolvedPlacement[] {
  const targets = [
    ...landscapeTargets(world),
    ...groundTargets(world),
    ...transitionTargets(world),
    ...corridorTargets(world),
    ...junctionTargets(world),
    ...siteTargets(world),
    ...entranceTargets(world),
  ].sort((a, b) => a.demand.id.localeCompare(b.demand.id));
  const ids = new Set<string>();
  for (const target of targets) {
    if (ids.has(target.demand.id)) throw new Error(`duplicate-world-asset-demand:${target.demand.id}`);
    ids.add(target.demand.id);
  }
  return targets;
}

export function deriveWorldAssetDemandsFromTargets(world: GenerierteWelt): AssetDemandOccurrence[] {
  return buildTargets(world).map((target) => ({
    ...target.demand,
    biomes: [...target.demand.biomes],
    footprint: { ...target.demand.footprint },
    connectorProfiles: [...target.demand.connectorProfiles],
  }));
}

function isInsidePreviewScope(demand: AssetDemandOccurrence, kit: WorldStyleKit): boolean {
  if (kit.activation === 'runtime') return true;
  return kit.previewScope.includes(demand.demandClass as DemandClassId)
    && demand.biomes.every((biome) => kit.previewBiomes.includes(biome));
}

function assetFromVariant(familyId: string, variant: AssetVariant): ResolvedStyleAsset {
  return {
    status: 'resolved',
    familyId,
    variantId: variant.id,
    files: [...variant.files],
    footprint: { ...variant.footprint },
    ...(variant.geometryRecipe ? { geometryRecipe: variant.geometryRecipe } : {}),
  };
}

function missingAsset(
  demand: AssetDemandOccurrence,
  reason: MissingStyleAsset['reason'],
): MissingStyleAsset {
  const rule = REQUIRED_ASSET_CATALOG.families.find((entry) => entry.demandClass === demand.demandClass);
  if (!rule) throw new Error(`missing-demand-catalog-rule:${demand.id}:${demand.demandClass}`);
  return {
    status: 'missing',
    demandClass: demand.demandClass as DemandClassId,
    reason,
    footprint: { ...demand.footprint },
    familyRole: rule.familyRole,
    geometryMode: rule.geometryMode,
  };
}

export function buildWorldAssetPlacementPlan(
  world: GenerierteWelt,
  kit: WorldStyleKit,
  manifest: AssetCandidateManifest,
  visualSeed: number,
): WorldAssetPlacementPlan {
  validateWorldStyleKit(kit, REQUIRED_ASSET_CATALOG);
  assertApprovedCandidateManifest(manifest, kit, REQUIRED_ASSET_CATALOG);
  const approvedFiles = new Set(manifest.files.map((file) => file.path));
  const placements: WorldAssetPlacement[] = [];
  for (const target of buildTargets(world)) {
    const demand = target.demand;
    const { demand: _demand, ...geometry } = target;
    if (!isInsidePreviewScope(demand, kit)) {
      placements.push({
        ...geometry,
        id: `placement_${demand.id}`,
        demandId: demand.id,
        demandClass: demand.demandClass as DemandClassId,
        biomes: [...demand.biomes],
        asset: missingAsset(demand, 'outside-preview-scope'),
      } as WorldAssetPlacement);
      continue;
    }
    const choice = resolveAssetFamily(kit, demand, visualSeed);
    for (const file of choice.variant.files) {
      if (!approvedFiles.has(file)) throw new Error(`placement-asset-file-not-approved:${demand.id}:${file}`);
    }
    placements.push({
      ...geometry,
      id: `placement_${demand.id}`,
      demandId: demand.id,
      demandClass: demand.demandClass as DemandClassId,
      biomes: [...demand.biomes],
      asset: assetFromVariant(choice.family.id, choice.variant),
    } as WorldAssetPlacement);
  }
  return {
    worldSeed: world.seed,
    visualSeed,
    kitId: kit.id,
    kitVersion: kit.version,
    catalogSignature: kit.catalogSignature,
    placements,
  };
}
