import { describe, expect, it } from 'vitest';
import { DEBUG_LAYERS, projectWorldDebug } from './worldDebugProjection';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';

describe('worldDebugProjection', () => {
  it('projiziert jede Mapsmith-Ebene deterministisch', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 31);
    for (const layer of DEBUG_LAYERS) {
      const first = projectWorldDebug(world, layer);
      const second = projectWorldDebug(world, layer);
      expect(first).toEqual(second);
      expect(first.points.length + first.lines.length + first.cells.length + first.labels.length).toBeGreaterThan(0);
    }
  });
});
