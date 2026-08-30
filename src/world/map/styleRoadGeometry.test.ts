import { describe, expect, it } from 'vitest';
import * as roadModule from './styleRoadGeometry';
import { buildRoadCapGeometry, buildRoadRibbonGeometry } from './styleRoadGeometry';

describe('styleRoadGeometry exports', () => {
  it('stellt Ribbons und Anschlusskappen bereit', () => {
    const exported = roadModule as unknown as Record<string, unknown>;
    expect(exported.buildRoadRibbonGeometry).toBeTypeOf('function');
    expect(exported.buildRoadCapGeometry).toBeTypeOf('function');
  });
});

function pairWidth(positions: readonly number[], pointIndex: number): number {
  const left = pointIndex * 6;
  const right = left + 3;
  return Math.hypot(positions[left]! - positions[right]!, positions[left + 2]! - positions[right + 2]!);
}

describe('styleRoadGeometry', () => {
  it('haelt ein 90-Grad-Ribbon geschlossen und begrenzt den Kurven-Miter', () => {
    const geometry = buildRoadRibbonGeometry([
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 10 },
    ], 6, 5);

    expect(geometry.positions).toHaveLength(3 * 2 * 3);
    expect(geometry.indices).toHaveLength(2 * 6);
    expect(geometry.positions.every(Number.isFinite)).toBe(true);
    expect(pairWidth(geometry.positions, 0)).toBeCloseTo(6, 5);
    expect(pairWidth(geometry.positions, 1)).toBeGreaterThan(6);
    expect(pairWidth(geometry.positions, 1)).toBeLessThanOrEqual(6 * 1.75);
    expect(pairWidth(geometry.positions, 2)).toBeCloseTo(6, 5);
  });

  it('entfernt doppelte Mittellinienpunkte ohne unendliche Vertices', () => {
    const geometry = buildRoadRibbonGeometry([
      { x: 0, z: 0 },
      { x: 0, z: 0 },
      { x: 8, z: 0 },
    ], 4, 4);

    expect(geometry.positions).toHaveLength(2 * 2 * 3);
    expect(geometry.positions.every(Number.isFinite)).toBe(true);
  });

  it('schliesst ein Korridorende mit einer texturierten Kappe', () => {
    const geometry = buildRoadCapGeometry({ x: 3, z: -2 }, 4, 4, 12);

    expect(geometry.positions).toHaveLength(13 * 3);
    expect(geometry.indices).toHaveLength(12 * 3);
    expect(geometry.positions.slice(0, 3)).toEqual([3, 0, -2]);
  });

  it('wickelt das Ribbon wie die sichtbare Oberseite seiner Endkappe', () => {
    const ribbon = buildRoadRibbonGeometry([{ x: 0, z: 0 }, { x: 10, z: 0 }], 6, 5);
    const [a, b, c] = ribbon.indices.slice(0, 3).map((index) => ({
      x: ribbon.positions[index! * 3]!,
      z: ribbon.positions[index! * 3 + 2]!,
    }));
    const windingY = (b!.z - a!.z) * (c!.x - a!.x) - (b!.x - a!.x) * (c!.z - a!.z);

    expect(windingY).toBeLessThan(0);
  });
});
