import { describe, expect, it } from 'vitest';
import { buildRealizedTraversalGraph } from './realizedTraversalGraph';
import { generateSpatialReservations } from './spatialReservations';
import { cellCenter, createGridSpec } from './worldGrid';
import type { RoutedCorridor, Site } from './worldTypes';

const GRID = createGridSpec(12, 8, 5);

function site(id: string, cell: number, biomeId: Site['biomeId'] = 'wasteland'): Site {
  return { id, center: cellCenter(GRID, cell), radius: 5, accessBand: 5, regionId: 'r0', biomeId };
}

describe('spatialReservations', () => {
  it('reserviert Fahrbreite und groessere Spawn-Freiheit typisiert', () => {
    const sites = [site('spawn', 37), site('target', 41, 'crater')];
    const corridor: RoutedCorridor = {
      id: 'c0',
      fromSiteId: 'spawn',
      toSiteId: 'target',
      cells: [37, 38, 39, 40, 41],
      centerline: [37, 38, 39, 40, 41].map((cell) => cellCenter(GRID, cell)),
      width: 10,
    };
    const realized = buildRealizedTraversalGraph(sites, [corridor], GRID);
    const reservations = generateSpatialReservations(sites, [corridor], realized, GRID);
    const spawn = reservations.find((entry) => entry.type === 'spawn')!;
    const road = reservations.find((entry) => entry.type === 'corridor')!;
    expect(spawn.clearance).toBeGreaterThan(road.clearance);
    expect(road.cells.length).toBeGreaterThan(corridor.cells.length);
    expect(reservations.some((entry) => entry.type === 'site')).toBe(true);
    expect(reservations.some((entry) => entry.type === 'clearing')).toBe(true);
  });
});
