import { describe, expect, it } from 'vitest';
import { buildRealizedTraversalGraph } from './realizedTraversalGraph';
import { cellCenter, createGridSpec } from './worldGrid';
import type { RoutedCorridor, Site } from './worldTypes';

const GRID = createGridSpec(12, 8, 5);

function site(id: string, cell: number): Site {
  return {
    id,
    center: cellCenter(GRID, cell),
    radius: 4,
    accessBand: 4,
    regionId: 'r0',
    biomeId: 'wasteland',
  };
}

function corridor(id: string, fromSiteId: string, toSiteId: string, cells: number[]): RoutedCorridor {
  return {
    id,
    fromSiteId,
    toSiteId,
    cells,
    centerline: cells.map((cell) => cellCenter(GRID, cell)),
    width: 10,
  };
}

describe('realizedTraversalGraph', () => {
  it('macht eine echte geteilte Korridorzelle vor der Rollenableitung zur Kreuzung', () => {
    const sites = [site('spawn', 37), site('east', 41), site('north', 15)];
    const corridors = [
      corridor('east', 'spawn', 'east', [37, 38, 39, 40, 41]),
      corridor('north', 'spawn', 'north', [37, 38, 39, 27, 15]),
    ];
    const graph = buildRealizedTraversalGraph(sites, corridors, GRID);
    const junction = graph.nodes.find((node) => node.kind === 'junction' && node.id === 'junction_39');
    expect(junction).toBeDefined();
    expect(graph.edges.filter((edge) => edge.a === junction!.id || edge.b === junction!.id)).toHaveLength(3);
  });

  it('kollabiert unverzweigte Zellfolgen zu gewichteten Kanten', () => {
    const sites = [site('a', 37), site('b', 41)];
    const graph = buildRealizedTraversalGraph(
      sites,
      [corridor('straight', 'a', 'b', [37, 38, 39, 40, 41])],
      GRID,
    );
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]!.cells).toEqual([37, 38, 39, 40, 41]);
    expect(graph.edges[0]!.length).toBe(20);
  });

  it('ist unabhaengig von der Reihenfolge identischer Korridorlisten', () => {
    const sites = [site('spawn', 37), site('east', 41), site('north', 15)];
    const corridors = [
      corridor('east', 'spawn', 'east', [37, 38, 39, 40, 41]),
      corridor('north', 'spawn', 'north', [37, 38, 39, 27, 15]),
    ];
    expect(buildRealizedTraversalGraph(sites, corridors, GRID))
      .toEqual(buildRealizedTraversalGraph(sites, [...corridors].reverse(), GRID));
  });
});
