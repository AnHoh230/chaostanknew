import type { Rng } from '../../core/rng';
import { cellAtWorld, cellCenter } from './worldGrid';
import type { GridSpec, RegionMap, Site, WorldDNA, WorldFields } from './worldTypes';

interface Candidate {
  cell: number;
  radius: number;
  tie: number;
}

function distance(a: Site['center'], b: Site['center']): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function siteFromCell(id: string, cell: number, radius: number, accessBand: number, grid: GridSpec, regions: RegionMap): Site {
  return {
    id,
    center: cellCenter(grid, cell),
    radius,
    accessBand,
    regionId: regions.regionByCell[cell]!,
    biomeId: regions.biomeByCell[cell]!,
  };
}

export function generateSites(
  grid: GridSpec,
  fields: WorldFields,
  regions: RegionMap,
  dna: WorldDNA,
  rng: Rng,
): Site[] {
  const spawnCell = cellAtWorld(grid, { x: 0, z: 0 });
  if (!spawnCell) throw new Error('spawn-outside-grid');
  const sites: Site[] = [{
    id: 'spawn',
    center: { x: 0, z: 0 },
    radius: 24,
    accessBand: 12,
    regionId: regions.regionByCell[spawnCell.index]!,
    biomeId: regions.biomeByCell[spawnCell.index]!,
  }];
  const desired = 7 + Math.floor(dna.structuralDensity * 5);
  const candidates: Candidate[] = [];
  for (let cell = 0; cell < grid.cols * grid.rows; cell++) {
    const radius = 18 + rng.next() * 8;
    const point = cellCenter(grid, cell);
    const envelope = radius + 10;
    if (Math.abs(point.x) + envelope > grid.extents.halfX) continue;
    if (Math.abs(point.z) + envelope > grid.extents.halfZ) continue;
    candidates.push({ cell, radius, tie: rng.next() });
  }

  const diagonal = Math.hypot(grid.extents.halfX * 2, grid.extents.halfZ * 2);
  const regionUse = new Map<string, number>([[sites[0]!.regionId, 1]]);
  while (sites.length < desired) {
    let best: Candidate | undefined;
    let bestScore = -Infinity;
    for (const candidate of candidates) {
      const point = cellCenter(grid, candidate.cell);
      const envelope = candidate.radius + 10;
      const fits = sites.every((site) =>
        distance(point, site.center) - envelope - (site.radius + site.accessBand) >= 35 - 1e-9,
      );
      if (!fits) continue;
      const nearest = Math.min(...sites.map((site) => distance(point, site.center)));
      const regionId = regions.regionByCell[candidate.cell]!;
      const regionCoverage = 1 / (1 + (regionUse.get(regionId) ?? 0));
      const contrast = Math.abs(fields.industrial[candidate.cell]! - fields.destruction[candidate.cell]!);
      const score = fields.openness[candidate.cell]! * 0.35
        + (nearest / diagonal) * 0.3
        + regionCoverage * 0.2
        + contrast * 0.1
        + candidate.tie * 0.05;
      if (score > bestScore || (score === bestScore && candidate.cell < (best?.cell ?? Infinity))) {
        bestScore = score;
        best = candidate;
      }
    }
    if (!best) {
      if (sites.length >= 7) break;
      throw new Error(`site-candidates-exhausted:${sites.length}/${desired}`);
    }
    const site = siteFromCell(`site_${sites.length}`, best.cell, best.radius, 10, grid, regions);
    sites.push(site);
    regionUse.set(site.regionId, (regionUse.get(site.regionId) ?? 0) + 1);
    candidates.splice(candidates.indexOf(best), 1);
  }
  return sites;
}
