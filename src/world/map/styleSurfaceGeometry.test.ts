import { describe, expect, it } from 'vitest';
import * as surfaceModule from './styleSurfaceGeometry';
import { buildCellSurfaceGeometry, buildTransitionGeometry } from './styleSurfaceGeometry';

describe('styleSurfaceGeometry exports', () => {
  it('stellt Zellflaechen und gerichtete Transitionen bereit', () => {
    const exported = surfaceModule as unknown as Record<string, unknown>;
    expect(exported.buildCellSurfaceGeometry).toBeTypeOf('function');
    expect(exported.buildTransitionGeometry).toBeTypeOf('function');
  });
});

describe('styleSurfaceGeometry', () => {
  it('baut fuer ausgewaehlte Rasterzellen weltstabile texturierte Quads', () => {
    const grid = { cols: 2, rows: 2, cellSize: 10, extents: { halfX: 10, halfZ: 10 } };

    const geometry = buildCellSurfaceGeometry(grid, [0, 3], 5);

    expect(geometry.positions).toHaveLength(2 * 4 * 3);
    expect(geometry.indices).toHaveLength(2 * 6);
    expect(geometry.positions.slice(0, 12)).toEqual([
      -10, 0, -10,
      0, 0, -10,
      0, 0, 0,
      -10, 0, 0,
    ]);
    expect(geometry.uvs.slice(0, 8)).toEqual([-2, -2, 0, -2, 0, 0, -2, 0]);
  });

  it('baut ein gerichtetes Uebergangsband genau auf der Biomgrenze', () => {
    const geometry = buildTransitionGeometry({
      center: { x: 0, z: 0 },
      tangent: { x: 0, z: 1 },
      normal: { x: 1, z: 0 },
      length: 10,
    }, 4, 5);
    const xs = geometry.positions.filter((_, index) => index % 3 === 0);
    const zs = geometry.positions.filter((_, index) => index % 3 === 2);

    expect(Math.min(...xs)).toBe(-2);
    expect(Math.max(...xs)).toBe(2);
    expect(Math.min(...zs)).toBe(-5);
    expect(Math.max(...zs)).toBe(5);
    expect(geometry.indices).toHaveLength(6);
  });
});
