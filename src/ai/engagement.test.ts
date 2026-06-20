import { describe, it, expect } from 'vitest';
import { engagementStep, type EngageInput } from './engagement';

const base: Omit<EngageInput, 'target'> = {
  selfX: 0, selfZ: 0, hpFrac: 1, fireRange: 40, keepDist: 7, fleeHp: 0.25, scoutDir: 0,
};

describe('engagementStep', () => {
  it('kein Ziel → scout, fährt entlang scoutDir, kein Feuer', () => {
    const o = engagementStep({ ...base, scoutDir: 0, target: null }); // scoutDir 0 → +Z
    expect(o.mode).toBe('scout');
    expect(o.fire).toBe(false);
    expect(o.moveZ).toBeCloseTo(1, 6);
    expect(o.moveX).toBeCloseTo(0, 6);
  });

  it('Ziel weit (d>fireRange) → annähern zum Ziel, kein Feuer', () => {
    const o = engagementStep({ ...base, target: { x: 0, z: 60, dist: 60 } });
    expect(o.mode).toBe('annähern');
    expect(o.moveZ).toBeCloseTo(1, 6); // Richtung Ziel (+Z)
    expect(o.fire).toBe(false);
  });

  it('Ziel in Feuer-Range → feuern, hält Position', () => {
    const o = engagementStep({ ...base, target: { x: 0, z: 25, dist: 25 } });
    expect(o.mode).toBe('feuern');
    expect(o.moveX).toBe(0);
    expect(o.moveZ).toBe(0);
    expect(o.fire).toBe(true);
  });

  it('Ziel zu nah (d<keepDist) → abstand, weg vom Ziel, feuert', () => {
    const o = engagementStep({ ...base, target: { x: 0, z: 4, dist: 4 } });
    expect(o.mode).toBe('abstand');
    expect(o.moveZ).toBeCloseTo(-1, 6); // weg (-Z)
    expect(o.fire).toBe(true);
  });

  it('wenig HP → fliehen (weg), feuert nur in Range', () => {
    const nah = engagementStep({ ...base, hpFrac: 0.1, target: { x: 0, z: 20, dist: 20 } });
    expect(nah.mode).toBe('fliehen');
    expect(nah.moveZ).toBeCloseTo(-1, 6);
    expect(nah.fire).toBe(true); // in Range
    const weit = engagementStep({ ...base, hpFrac: 0.1, target: { x: 0, z: 60, dist: 60 } });
    expect(weit.mode).toBe('fliehen');
    expect(weit.fire).toBe(false); // außer Range
  });

  it('faceX/faceZ zeigt auf das Ziel (Kampf)', () => {
    const o = engagementStep({ ...base, target: { x: 10, z: 20, dist: Math.hypot(10, 20) } });
    expect(o.faceX).toBe(10);
    expect(o.faceZ).toBe(20);
  });
});
