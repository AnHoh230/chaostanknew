import { describe, it, expect } from 'vitest';
import { fovForAspect, REF_ASPECT, MIN_FOV_FACTOR } from './cameraFov';

const hFov = (vFov: number, aspect: number): number => 2 * Math.atan(Math.tan(vFov / 2) * aspect);

describe('fovForAspect', () => {
  it('lässt die FOV bei Referenz-Aspect (16:9) unverändert', () => {
    expect(fovForAspect(0.87, REF_ASPECT)).toBeCloseTo(0.87, 6);
  });

  it('lässt schmalere Displays als die Referenz unverändert (kein vertikales Über-Sehen)', () => {
    expect(fovForAspect(0.87, 4 / 3)).toBe(0.87); // 4:3 < 16:9
    expect(fovForAspect(0.87, 1)).toBe(0.87);
  });

  it('reduziert die FOV bei breiteren Displays (Ultrawide sieht NICHT mehr)', () => {
    const wide = fovForAspect(0.87, 21 / 9);
    expect(wide).toBeLessThan(0.87);
  });

  it('hält die horizontale Sicht für breitere Displays konstant (= 16:9-Breite)', () => {
    const refH = hFov(0.87, REF_ASPECT);
    // Nur Aspects ≥ 16:9 — schmalere bleiben absichtlich bei Basis-FOV (sehen horizontal weniger).
    for (const aspect of [16 / 9, 21 / 9, 2.0]) {
      const v = fovForAspect(0.87, aspect);
      // Solange der Clamp nicht greift, ist die horizontale Sicht identisch zur Referenz.
      if (v > 0.87 * MIN_FOV_FACTOR + 1e-6) expect(hFov(v, aspect)).toBeCloseTo(refH, 4);
    }
  });

  it('clampt bei Super-Ultrawide gegen eine Mindest-FOV', () => {
    const v = fovForAspect(0.87, 32 / 9);
    expect(v).toBeGreaterThanOrEqual(0.87 * MIN_FOV_FACTOR - 1e-9);
  });

  it('ist robust gegen kaputte Aspects', () => {
    expect(fovForAspect(0.87, NaN)).toBe(0.87);
    expect(fovForAspect(0.87, 0)).toBe(0.87);
  });
});
