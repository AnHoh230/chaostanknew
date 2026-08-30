import { describe, expect, it } from 'vitest';
import { buildRegionGroundData } from './regionGroundData';
import type { RuntimeKarte } from './runtimeMap';

function runtimeFixture(): RuntimeKarte {
  const regionGrid = { cols: 4, rows: 3, cellSize: 10, extents: { halfX: 20, halfZ: 15 } };
  return {
    seed: 1,
    extents: { halfX: 20, halfZ: 15 },
    spawn: { x: 0, z: 0 },
    entities: [],
    regionGrid,
    traversalGrid: { cols: 8, rows: 6, cellSize: 5, extents: { halfX: 20, halfZ: 15 } },
    regionCells: Array.from({ length: 12 }, (_, cell) => ({
      cell,
      biomeId: cell < 6 ? 'industrial' as const : 'wasteland' as const,
      regionId: cell < 6 ? 'industrial_0' : 'wasteland_0',
    })),
    corridors: [],
  };
}

describe('regionGroundData', () => {
  it('baut pro Biom ein indiziertes Quadset ohne fehlende Zellen', () => {
    const data = buildRegionGroundData(runtimeFixture());
    expect(Object.values(data).reduce((sum, entry) => sum + entry.cellCount, 0)).toBe(12);
    expect(data.industrial.indices).toHaveLength(6 * 6);
    expect(data.wasteland.positions).toHaveLength(6 * 4 * 3);
  });
});
