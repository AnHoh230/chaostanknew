import type { AssetDemandOccurrence, AssetDemandSource } from './assetDemandTypes';
import type { BiomeId, DemandClassId, Footprint, GenerierteWelt } from './worldTypes';

const ZERO: Footprint = { halfX: 0, halfZ: 0 };

function occurrence(
  id: string,
  demandClass: DemandClassId | string,
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

function groundDemands(world: GenerierteWelt): AssetDemandOccurrence[] {
  return [...new Set(world.regions.biomeByCell)]
    .sort((a, b) => a.localeCompare(b))
    .map((biome) => occurrence(`ground_${biome}`, `ground.${biome}`, 'ground', [biome], ZERO, ['ground-material-v1']));
}

function transitionDemands(world: GenerierteWelt): AssetDemandOccurrence[] {
  const result: AssetDemandOccurrence[] = [];
  const { cols, rows } = world.regions.grid;
  const biomes = world.regions.biomeByCell;
  const compare = (cell: number, neighbor: number): void => {
    const first = biomes[cell]!;
    const second = biomes[neighbor]!;
    if (first === second) return;
    result.push(occurrence(
      `ground_transition_${cell}_${neighbor}`,
      'ground.transition',
      'transition',
      [first, second],
      ZERO,
      ['biome-boundary-v1'],
    ));
  };
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = row * cols + col;
      if (col + 1 < cols) compare(cell, cell + 1);
      if (row + 1 < rows) compare(cell, cell + cols);
    }
  }
  return result;
}

function corridorDemands(world: GenerierteWelt): AssetDemandOccurrence[] {
  return world.corridors.flatMap((corridor) => {
    const footprint = { halfX: corridor.width / 2, halfZ: corridor.width / 2 };
    return [
      occurrence(`corridor_surface_${corridor.id}`, 'corridor.surface', 'corridor', [], footprint, ['corridor-width-v1']),
      occurrence(`corridor_edge_${corridor.id}`, 'corridor.edge', 'corridor', [], footprint, ['corridor-width-v1']),
    ];
  });
}

function junctionDemands(world: GenerierteWelt): AssetDemandOccurrence[] {
  return world.realizedGraph.nodes.flatMap((node) => {
    if (node.kind !== 'junction') return [];
    const degree = world.realizedGraph.edges.reduce((count, edge) => (
      count + (edge.a === node.id || edge.b === node.id ? 1 : 0)
    ), 0);
    if (degree !== 3 && degree !== 4) return [];
    return [occurrence(
      `junction_${node.id}`,
      degree === 3 ? 'junction.degree3' : 'junction.degree4',
      'junction',
      [],
      ZERO,
      ['road-junction-v1'],
    )];
  });
}

function siteDemands(world: GenerierteWelt): AssetDemandOccurrence[] {
  const connected = new Set(world.corridors.flatMap((corridor) => [corridor.fromSiteId, corridor.toSiteId]));
  return world.sites.flatMap((site) => {
    const demands: AssetDemandOccurrence[] = [];
    const footprint = { halfX: site.radius, halfZ: site.radius };
    if (site.biomeId === 'industrial') {
      demands.push(occurrence(`site_industrial_${site.id}`, 'site.industrialYard', 'site', ['industrial'], footprint, ['yard-road-v1']));
    } else if (site.biomeId === 'scrap') {
      demands.push(occurrence(`site_scrap_${site.id}`, 'site.scrapYard', 'site', ['scrap'], footprint, ['yard-road-v1']));
    }
    if (connected.has(site.id)) {
      demands.push(occurrence(`site_entrance_${site.id}`, 'site.entrance', 'site', [site.biomeId], ZERO, ['yard-road-v1']));
    }
    return demands;
  });
}

export function deriveWorldAssetDemands(world: GenerierteWelt): AssetDemandOccurrence[] {
  const demands = [
    ...world.features.map((feature) => occurrence(
      `landscape_${feature.id}`,
      feature.demandClass,
      'landscape',
      [feature.biomeId],
      feature.footprint,
    )),
    ...groundDemands(world),
    ...transitionDemands(world),
    ...corridorDemands(world),
    ...junctionDemands(world),
    ...siteDemands(world),
  ];
  return demands.sort((a, b) => a.id.localeCompare(b.id));
}
