import { cellCenter } from './worldGrid';
import type {
  GridSpec,
  RealizedEdge,
  RealizedNode,
  RealizedTraversalGraph,
  RoutedCorridor,
  Site,
} from './worldTypes';

function addConnection(adjacency: Map<number, Set<number>>, a: number, b: number): void {
  if (!adjacency.has(a)) adjacency.set(a, new Set());
  if (!adjacency.has(b)) adjacency.set(b, new Set());
  adjacency.get(a)!.add(b);
  adjacency.get(b)!.add(a);
}

function rawEdgeKey(a: number, b: number): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function isAdjacent(grid: GridSpec, a: number, b: number): boolean {
  const ac = a % grid.cols, ar = Math.floor(a / grid.cols);
  const bc = b % grid.cols, br = Math.floor(b / grid.cols);
  return Math.abs(ac - bc) + Math.abs(ar - br) === 1;
}

export function buildRealizedTraversalGraph(
  sites: readonly Site[],
  corridors: readonly RoutedCorridor[],
  grid: GridSpec,
): RealizedTraversalGraph {
  const siteIds = new Set(sites.map((site) => site.id));
  const adjacency = new Map<number, Set<number>>();
  const memberships = new Map<number, Set<string>>();
  const endpoints = new Map<number, Set<string>>();

  for (const corridor of [...corridors].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!siteIds.has(corridor.fromSiteId) || !siteIds.has(corridor.toSiteId)) {
      throw new Error(`corridor-references-unknown-site:${corridor.id}`);
    }
    if (corridor.cells.length < 2) throw new Error(`corridor-too-short:${corridor.id}`);
    corridor.cells.forEach((cell) => {
      if (cell < 0 || cell >= grid.cols * grid.rows) throw new Error(`corridor-cell-outside-grid:${corridor.id}`);
      if (!memberships.has(cell)) memberships.set(cell, new Set());
      memberships.get(cell)!.add(corridor.id);
    });
    for (let index = 1; index < corridor.cells.length; index++) {
      const a = corridor.cells[index - 1]!, b = corridor.cells[index]!;
      if (!isAdjacent(grid, a, b)) throw new Error(`corridor-has-non-adjacent-cells:${corridor.id}`);
      addConnection(adjacency, a, b);
    }
    const endpointPairs: Array<[number, string]> = [
      [corridor.cells[0]!, corridor.fromSiteId],
      [corridor.cells.at(-1)!, corridor.toSiteId],
    ];
    endpointPairs.forEach(([cell, siteId]) => {
      if (!endpoints.has(cell)) endpoints.set(cell, new Set());
      endpoints.get(cell)!.add(siteId);
    });
  }

  const boundaryCells = new Set<number>();
  for (const [cell, neighbors] of adjacency) {
    const useCount = memberships.get(cell)?.size ?? 0;
    const transition = [...neighbors].some((neighbor) => (memberships.get(neighbor)?.size ?? 0) !== useCount);
    if (endpoints.has(cell) || neighbors.size !== 2 || transition) boundaryCells.add(cell);
  }

  const nodes: RealizedNode[] = sites.map((site) => ({
    id: `site_${site.id}`,
    kind: 'site',
    pos: { ...site.center },
    siteId: site.id,
  }));
  const nodeForBoundary = new Map<number, string>();
  for (const cell of [...boundaryCells].sort((a, b) => a - b)) {
    const endpointSites = [...(endpoints.get(cell) ?? [])].sort();
    if (endpointSites.length > 0) {
      if (endpointSites.length > 1) throw new Error(`multiple-sites-share-corridor-endpoint:${cell}`);
      nodeForBoundary.set(cell, `site_${endpointSites[0]}`);
      continue;
    }
    const id = `junction_${cell}`;
    nodes.push({ id, kind: 'junction', pos: cellCenter(grid, cell) });
    nodeForBoundary.set(cell, id);
  }

  const visitedEdges = new Set<string>();
  const segments: Array<Omit<RealizedEdge, 'id'>> = [];
  for (const start of [...boundaryCells].sort((a, b) => a - b)) {
    const neighbors = [...(adjacency.get(start) ?? [])].sort((a, b) => a - b);
    for (const firstNeighbor of neighbors) {
      if (visitedEdges.has(rawEdgeKey(start, firstNeighbor))) continue;
      const cells = [start, firstNeighbor];
      visitedEdges.add(rawEdgeKey(start, firstNeighbor));
      let previous = start;
      let current = firstNeighbor;
      while (!boundaryCells.has(current)) {
        const nextCandidates = [...(adjacency.get(current) ?? [])]
          .filter((cell) => cell !== previous)
          .sort((a, b) => a - b);
        if (nextCandidates.length !== 1) throw new Error(`invalid-realized-run:${current}`);
        const next = nextCandidates[0]!;
        visitedEdges.add(rawEdgeKey(current, next));
        cells.push(next);
        previous = current;
        current = next;
      }
      const a = nodeForBoundary.get(start);
      const b = nodeForBoundary.get(current);
      if (!a || !b) throw new Error('realized-boundary-without-node');
      const length = (cells.length - 1) * grid.cellSize;
      segments.push({ a, b, length, cost: length, cells });
    }
  }

  segments.sort((left, right) => (
    left.a.localeCompare(right.a)
    || left.b.localeCompare(right.b)
    || left.cells[0]! - right.cells[0]!
    || left.cells.at(-1)! - right.cells.at(-1)!
  ));
  const edges: RealizedEdge[] = segments.map((edge, index) => ({ id: `realized_edge_${index}`, ...edge }));
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'site' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
  return { nodes, edges };
}
