import { describe, expect, it } from 'vitest';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';

describe('worldGenerator', () => {
  it('verwendet die verbindlichen Welt-, Feld- und Traversalraster', () => {
    expect(DEFAULT_WORLD_OPTIONS).toMatchObject({
      extents: { halfX: 400, halfZ: 320 },
      fieldGrid: { cols: 80, rows: 64, cellSize: 10 },
      traversalGrid: { cols: 160, rows: 128, cellSize: 5 },
      corridorWidth: 12,
      corridorClearance: 3,
      maxSiteDegree: 4,
    });
  });

  it('erzeugt fuer gleiche Seeds bytegleiche abstrakte Welten', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(JSON.stringify(generiereWelt(DEFAULT_WORLD_OPTIONS, seed)))
        .toBe(JSON.stringify(generiereWelt(DEFAULT_WORLD_OPTIONS, seed)));
    }
  }, 60_000);

  it('erzeugt ohne Legacy-Fallback vollstaendige und valide Pipeline-Ergebnisse', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const world = generiereWelt(DEFAULT_WORLD_OPTIONS, seed);
      expect(world.debug.validation.hardFailures).toEqual([]);
      expect(world.sites.length).toBeGreaterThanOrEqual(7);
      expect(world.corridors).toHaveLength(world.intentGraph.edges.length);
      expect(world.features.length).toBeGreaterThan(0);
      expect(world.debug.quality.signature).toMatch(/^[0-9a-f]{8}$/);
    }
  }, 60_000);
});
