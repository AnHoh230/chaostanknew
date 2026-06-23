import { describe, it, expect } from 'vitest';
import { haescherSoll, haescherStats, DEFAULT_HAESCHER_CFG as C } from './haescher';

describe('haescherSoll', () => {
  it('ohne Heat und früh: kein/kaum Druck', () => {
    const s = haescherSoll(0, 0, 0);
    expect(s.front).toBe(0);
    expect(s.ring).toBe(0);
  });

  it('Fährte erzeugt Häscher VORAUS', () => {
    expect(haescherSoll(0, 0, 1).front).toBe(C.frontProHeat);
    expect(haescherSoll(0, 0, 0.5).front).toBe(Math.round(0.5 * C.frontProHeat));
  });

  it('Kessel erzeugt Häscher RINGS', () => {
    expect(haescherSoll(0, 1, 0).ring).toBe(C.ringProHeat);
  });

  it('Laufzeit hebt den Ring-Sockel (auch ohne Heat)', () => {
    const early = haescherSoll(0, 0, 0).ring;
    const late = haescherSoll(C.sekProGrund * 3, 0, 0).ring;
    expect(late).toBeGreaterThan(early);
    expect(late).toBe(3);
  });

  it('respektiert die Deckel', () => {
    expect(haescherSoll(99999, 1, 1).front).toBeLessThanOrEqual(C.maxFront);
    expect(haescherSoll(99999, 1, 1).ring).toBeLessThanOrEqual(C.maxRing);
  });
});

describe('haescherStats', () => {
  it('ist zäh und wird mit der Laufzeit zäher', () => {
    expect(haescherStats(0).hp).toBe(C.hpBasis);
    expect(haescherStats(600).hp).toBe(C.hpBasis + C.hpProMin * 10); // +10 min
    expect(haescherStats(600).hp).toBeGreaterThan(haescherStats(0).hp);
  });
});
