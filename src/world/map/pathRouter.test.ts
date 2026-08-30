import { describe, expect, it } from 'vitest';
import {
  corridorFits,
  corridorReuseMultiplier,
  DEFAULT_PATH_ROUTING,
  routeCorridors,
} from './pathRouter';
import { cellAtWorld, cellCenter, createGridSpec } from './worldGrid';
import type { RegionMap, Site, TraversalGraph, WorldFields } from './worldTypes';

const GRID = createGridSpec(40, 24, 5);

function fields(): WorldFields {
  const size = GRID.cols * GRID.rows;
  return {
    grid: GRID,
    openness: new Float32Array(size).fill(0.8),
    industrial: new Float32Array(size).fill(0.2),
    wetness: new Float32Array(size).fill(0.1),
    destruction: new Float32Array(size).fill(0.1),
  };
}

function regions(): RegionMap {
  const size = GRID.cols * GRID.rows;
  const cells = Array.from({ length: size }, (_, index) => index);
  return {
    grid: GRID,
    biomeByCell: Array(size).fill('wasteland'),
    regionByCell: Array(size).fill('region_wasteland_0'),
    regions: [{ id: 'region_wasteland_0', biomeId: 'wasteland', cells }],
    seeds: [],
  };
}

function site(id: string, x: number, z: number): Site {
  return {
    id,
    center: { x, z },
    radius: 7.5,
    accessBand: 10,
    regionId: 'region_wasteland_0',
    biomeId: 'wasteland',
  };
}

function sharedCells(a: readonly number[], b: readonly number[]): number[] {
  const bSet = new Set(b);
  return a.filter((cell) => bSet.has(cell));
}

describe('pathRouter', () => {
  it('verwirft eine Mittellinie, deren volle Korridorbreite die Karte verlaesst', () => {
    const edgeCell = cellAtWorld(GRID, { x: -97.5, z: 0 })!;
    expect(corridorFits(GRID, edgeCell.index, 12, 3, [])).toBe(false);
  });

  it('endet im Zugangsband einer Site statt in deren Zentrum', () => {
    const source = site('spawn', -70, 0);
    const target = site('target', 70, 0);
    const graph: TraversalGraph = {
      siteIds: [source.id, target.id],
      edges: [{ a: source.id, b: target.id, estimatedCost: 1 }],
    };
    const [corridor] = routeCorridors(graph, [source, target], GRID, fields(), regions(), DEFAULT_PATH_ROUTING);
    const end = corridor!.centerline.at(-1)!;
    const distance = Math.hypot(end.x - target.center.x, end.z - target.center.z);
    expect(distance).toBeGreaterThanOrEqual(target.radius);
    expect(distance).toBeLessThanOrEqual(target.radius + target.accessBand);
    expect(cellAtWorld(GRID, end)?.index).toBe(corridor!.cells.at(-1));
  });

  it('beguenstigt einen einmal genutzten Stamm und verteuert die dritte Nutzung', () => {
    expect(corridorReuseMultiplier(0)).toBe(1);
    expect(corridorReuseMultiplier(1)).toBe(0.75);
    expect(corridorReuseMultiplier(2)).toBe(1.25);
    expect(corridorReuseMultiplier(3)).toBe(2);

    const sites = [
      site('spawn', -75, 0),
      site('east', 75, 0),
      site('south_east', 75, -25),
      site('north_east', 75, 25),
    ];
    const graph: TraversalGraph = {
      siteIds: sites.map((entry) => entry.id),
      edges: [
        { a: 'spawn', b: 'east', estimatedCost: 1 },
        { a: 'spawn', b: 'south_east', estimatedCost: 2 },
        { a: 'spawn', b: 'north_east', estimatedCost: 3 },
      ],
    };
    const corridors = routeCorridors(graph, sites, GRID, fields(), regions(), DEFAULT_PATH_ROUTING);
    expect(sharedCells(corridors[0]!.cells, corridors[1]!.cells).length).toBeGreaterThan(0);
    expect(sharedCells(corridors[0]!.cells, corridors[2]!.cells).length)
      .toBeLessThan(sharedCells(corridors[0]!.cells, corridors[1]!.cells).length);
  });

  it('liefert fuer identische Eingaben identische Korridore', () => {
    const sites = [site('a', -60, -20), site('b', 60, 20)];
    const graph: TraversalGraph = { siteIds: ['a', 'b'], edges: [{ a: 'a', b: 'b', estimatedCost: 1 }] };
    const first = routeCorridors(graph, sites, GRID, fields(), regions(), DEFAULT_PATH_ROUTING);
    const second = routeCorridors(graph, sites, GRID, fields(), regions(), DEFAULT_PATH_ROUTING);
    expect(first).toEqual(second);
    expect(first[0]!.centerline.every((point) => cellAtWorld(GRID, point) !== null)).toBe(true);
    expect(first[0]!.centerline[0]).toEqual(cellCenter(GRID, first[0]!.cells[0]!));
  });
});
