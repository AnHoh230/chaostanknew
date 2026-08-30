import type {
  RealizedTraversalGraph,
  SiteId,
  SiteTopology,
  SiteTopologyTag,
} from './worldTypes';

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position), upper = Math.ceil(position);
  const blend = position - lower;
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * blend;
}

function distancesFrom(graph: RealizedTraversalGraph, startId: string): Map<string, number> {
  const distances = new Map(graph.nodes.map((node) => [node.id, Infinity]));
  distances.set(startId, 0);
  const unvisited = new Set(graph.nodes.map((node) => node.id));
  while (unvisited.size > 0) {
    let current: string | undefined;
    let currentDistance = Infinity;
    for (const id of unvisited) {
      const distance = distances.get(id)!;
      if (distance < currentDistance || (distance === currentDistance && id < (current ?? '\uffff'))) {
        current = id;
        currentDistance = distance;
      }
    }
    if (!current || !Number.isFinite(currentDistance)) break;
    unvisited.delete(current);
    for (const edge of graph.edges) {
      const neighbor = edge.a === current ? edge.b : edge.b === current ? edge.a : undefined;
      if (!neighbor || !unvisited.has(neighbor)) continue;
      distances.set(neighbor, Math.min(distances.get(neighbor)!, currentDistance + edge.length));
    }
  }
  return distances;
}

function nodeBelongsToCycle(graph: RealizedTraversalGraph, nodeId: string): boolean {
  const incident = graph.edges.filter((edge) => edge.a === nodeId || edge.b === nodeId);
  if (incident.some((edge) => edge.a === edge.b)) return true;
  const neighbors = incident.map((edge) => edge.a === nodeId ? edge.b : edge.a);
  for (let left = 0; left < neighbors.length; left++) {
    for (let right = left + 1; right < neighbors.length; right++) {
      if (neighbors[left] === neighbors[right]) return true;
      const target = neighbors[right]!;
      const visited = new Set<string>([nodeId, neighbors[left]!]);
      const pending = [neighbors[left]!];
      while (pending.length > 0) {
        const current = pending.shift()!;
        if (current === target) return true;
        for (const edge of graph.edges) {
          const next = edge.a === current ? edge.b : edge.b === current ? edge.a : undefined;
          if (next && !visited.has(next)) {
            visited.add(next);
            pending.push(next);
          }
        }
      }
    }
  }
  return false;
}

export function resolveSiteTopology(
  graph: RealizedTraversalGraph,
  spawnId: SiteId,
): Record<SiteId, SiteTopology> {
  const spawnNode = graph.nodes.find((node) => node.siteId === spawnId);
  if (!spawnNode) throw new Error(`spawn-site-missing-in-realized-graph:${spawnId}`);
  const distances = distancesFrom(graph, spawnNode.id);
  const siteNodes = graph.nodes.filter((node) => node.kind === 'site' && node.siteId);
  const finiteDistances = siteNodes
    .map((node) => distances.get(node.id)!)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const median = percentile(finiteDistances, 0.5);
  const upperQuartile = percentile(finiteDistances, 0.75);
  const result: Record<SiteId, SiteTopology> = {};

  for (const node of siteNodes) {
    const degree = graph.edges.reduce((sum, edge) => {
      if (edge.a === node.id && edge.b === node.id) return sum + 2;
      return sum + (edge.a === node.id || edge.b === node.id ? 1 : 0);
    }, 0);
    const distanceFromSpawn = distances.get(node.id)!;
    const tags: SiteTopologyTag[] = [];
    if (degree >= 3) tags.push('hub');
    if (degree <= 1) tags.push('deadEnd');
    if (nodeBelongsToCycle(graph, node.id)) tags.push('loopNode');
    if (distanceFromSpawn >= median && degree <= 2 && node.siteId !== spawnId) tags.push('peripheral');
    if (
      node.siteId !== spawnId
      && distanceFromSpawn >= upperQuartile
      && distanceFromSpawn >= median * 1.25
    ) tags.push('remote');
    result[node.siteId!] = { degree, distanceFromSpawn, tags };
  }
  return result;
}
