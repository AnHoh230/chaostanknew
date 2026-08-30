import { describe, expect, it } from 'vitest';
import { resolveSiteTopology } from './siteRoleResolver';
import type { RealizedTraversalGraph } from './worldTypes';

describe('siteRoleResolver', () => {
  it('kann remote und deadEnd gleichzeitig vergeben', () => {
    const graph: RealizedTraversalGraph = {
      nodes: [
        { id: 'site_spawn', kind: 'site', siteId: 'spawn', pos: { x: 0, z: 0 } },
        { id: 'site_near', kind: 'site', siteId: 'near', pos: { x: 10, z: 0 } },
        { id: 'site_remote', kind: 'site', siteId: 'remote', pos: { x: 110, z: 0 } },
      ],
      edges: [
        { id: 'e0', a: 'site_spawn', b: 'site_near', length: 10, cost: 10, cells: [] },
        { id: 'e1', a: 'site_near', b: 'site_remote', length: 100, cost: 100, cells: [] },
      ],
    };
    const topology = resolveSiteTopology(graph, 'spawn');
    expect(topology.remote.tags).toContain('remote');
    expect(topology.remote.tags).toContain('deadEnd');
  });

  it('leitet Schleifenzugehoerigkeit und Hubgrad aus dem realisierten Graphen ab', () => {
    const graph: RealizedTraversalGraph = {
      nodes: [
        { id: 'site_spawn', kind: 'site', siteId: 'spawn', pos: { x: 0, z: 0 } },
        { id: 'site_a', kind: 'site', siteId: 'a', pos: { x: 10, z: 0 } },
        { id: 'site_b', kind: 'site', siteId: 'b', pos: { x: 5, z: 10 } },
        { id: 'site_leaf', kind: 'site', siteId: 'leaf', pos: { x: 20, z: 0 } },
      ],
      edges: [
        { id: 'e0', a: 'site_spawn', b: 'site_a', length: 10, cost: 10, cells: [] },
        { id: 'e1', a: 'site_a', b: 'site_b', length: 10, cost: 10, cells: [] },
        { id: 'e2', a: 'site_b', b: 'site_spawn', length: 10, cost: 10, cells: [] },
        { id: 'e3', a: 'site_a', b: 'site_leaf', length: 10, cost: 10, cells: [] },
      ],
    };
    const topology = resolveSiteTopology(graph, 'spawn');
    expect(topology.a.tags).toEqual(expect.arrayContaining(['hub', 'loopNode']));
    expect(topology.leaf.tags).not.toContain('loopNode');
  });
});
