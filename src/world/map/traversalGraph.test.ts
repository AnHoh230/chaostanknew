import { describe, expect, it } from 'vitest';
import { buildTerrainCostGraph, buildTraversalGraph, DEFAULT_ROUTING } from './traversalGraph';
import { cellAtWorld, createGridSpec } from './worldGrid';
import type { RegionMap, Site, TerrainCostGraph, TraversalGraph, WorldFields } from './worldTypes';

const GRID = createGridSpec(12, 8, 10);

function fields(openness: number, wetness: number, destruction: number): WorldFields {
  const size = GRID.cols * GRID.rows;
  return {
    grid: GRID,
    openness: new Float32Array(size).fill(openness),
    industrial: new Float32Array(size).fill(0.4),
    wetness: new Float32Array(size).fill(wetness),
    destruction: new Float32Array(size).fill(destruction),
  };
}

function regions(): RegionMap {
  const size = GRID.cols * GRID.rows;
  const cells = Array.from({ length: size }, (_, i) => i);
  return {
    grid: GRID,
    biomeByCell: Array(size).fill('wasteland'),
    regionByCell: Array(size).fill('region_wasteland_0'),
    regions: [{ id: 'region_wasteland_0', biomeId: 'wasteland', cells }],
    seeds: [],
  };
}

function site(id: string, x: number, z: number): Site {
  const cell = cellAtWorld(GRID, { x, z })!;
  return { id, center: { x, z }, radius: 8, accessBand: 4, regionId: regions().regionByCell[cell.index]!, biomeId: 'wasteland' };
}

function degreeMap(graph: TraversalGraph): Map<string, number> {
  const result = new Map(graph.siteIds.map((id) => [id, 0]));
  for (const edge of graph.edges) {
    result.set(edge.a, result.get(edge.a)! + 1);
    result.set(edge.b, result.get(edge.b)! + 1);
  }
  return result;
}

function isConnected(graph: TraversalGraph): boolean {
  const visited = new Set<string>([graph.siteIds[0]!]);
  const pending = [graph.siteIds[0]!];
  while (pending.length > 0) {
    const id = pending.pop()!;
    for (const edge of graph.edges) {
      const next = edge.a === id ? edge.b : edge.b === id ? edge.a : undefined;
      if (next && !visited.has(next)) { visited.add(next); pending.push(next); }
    }
  }
  return visited.size === graph.siteIds.length;
}

function starCostGraph(count: number): TerrainCostGraph {
  const siteIds = Array.from({ length: count }, (_, i) => `s${i}`);
  const edges = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      edges.push({ a: siteIds[i]!, b: siteIds[j]!, cost: i === 0 ? 1 + j * 0.001 : 10 + i + j, coarseCells: [] });
    }
  }
  return { siteIds, edges };
}

describe('traversalGraph', () => {
  it('bewertet dieselbe Verbindung in feindlichem Terrain teurer', () => {
    const sites = [site('a', -45, 0), site('b', 45, 0)];
    const calm = buildTerrainCostGraph(sites, GRID, fields(0.95, 0.1, 0.1), regions(), DEFAULT_ROUTING);
    const hostile = buildTerrainCostGraph(sites, GRID, fields(0.05, 0.9, 0.9), regions(), DEFAULT_ROUTING);
    expect(hostile.edges[0]!.cost).toBeGreaterThan(calm.edges[0]!.cost * 1.5);
  });

  it('baut einen verbundenen gradbegrenzten Baum plus mittleres Schleifenbudget', () => {
    const graph = buildTraversalGraph(starCostGraph(9), 0.5, 4);
    expect(isConnected(graph)).toBe(true);
    expect(Math.max(...degreeMap(graph).values())).toBeLessThanOrEqual(4);
    expect(graph.edges).toHaveLength(9 - 1 + 2);
  });

  it('uebersetzt roadDensity exakt in ein bis drei Zusatzkanten', () => {
    expect(buildTraversalGraph(starCostGraph(8), 0.1, 4).edges).toHaveLength(8);
    expect(buildTraversalGraph(starCostGraph(8), 0.5, 4).edges).toHaveLength(9);
    expect(buildTraversalGraph(starCostGraph(8), 0.9, 4).edges).toHaveLength(10);
  });

  it('ist deterministisch', () => {
    expect(buildTraversalGraph(starCostGraph(10), 0.7, 4)).toEqual(buildTraversalGraph(starCostGraph(10), 0.7, 4));
  });
});
