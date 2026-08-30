import { describe, expect, it } from 'vitest';
import {
  FIELD_GRID,
  cellAtWorld,
  cellCenter,
  createGridSpec,
  sampleCategorical,
  sampleContinuous,
} from './worldGrid';

describe('worldGrid', () => {
  it('bildet das zentrierte Weltkoordinatensystem auf beide Raster ab', () => {
    expect(cellAtWorld(FIELD_GRID, { x: -399.9, z: -319.9 })).toEqual({ col: 0, row: 0, index: 0 });
    expect(cellAtWorld(FIELD_GRID, { x: 0, z: 0 })?.index).toBe(32 * 80 + 40);
    expect(cellCenter(FIELD_GRID, 0)).toEqual({ x: -395, z: -315 });
  });

  it('weist Punkte ausserhalb der Extents zurueck', () => {
    expect(cellAtWorld(FIELD_GRID, { x: -400.01, z: 0 })).toBeNull();
    expect(cellAtWorld(FIELD_GRID, { x: 400.01, z: 0 })).toBeNull();
    expect(cellAtWorld(FIELD_GRID, { x: 0, z: 320.01 })).toBeNull();
  });

  it('interpoliert kontinuierliche Werte, aber niemals Kategorien', () => {
    const grid = createGridSpec(2, 2, 10);
    const values = new Float32Array([0, 1, 0, 1]);
    expect(sampleContinuous(grid, values, { x: 0, z: 0 })).toBeCloseTo(0.5);
    expect(sampleCategorical(grid, ['a', 'b', 'c', 'd'], { x: 4, z: 4 })).toBe('d');
  });
});
