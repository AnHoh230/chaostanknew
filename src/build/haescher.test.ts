import { describe, it, expect } from 'vitest';
import { haescherSoll, haescherStats, DEFAULT_HAESCHER_CFG as C } from './haescher';

describe('haescherSoll', () => {
  const TG = C.grace + 15; // nach der Schonfrist, noch vor dem ersten Zeit-Sockel (grace 45 < TG < sekProGrund 90)

  it('vor der Schonfrist GAR KEINE Häscher (auch bei vollem Heat)', () => {
    expect(haescherSoll(20, 1, 1)).toEqual({ front: 0, ring: 0 });
  });

  it('ohne Heat: kein Heat-Druck', () => {
    expect(haescherSoll(TG, 0, 0)).toEqual({ front: 0, ring: 0 });
  });

  it('Heat unter der Schwelle treibt nichts (kurzes Stehen/Fahren zählt nicht)', () => {
    const s = haescherSoll(TG, C.heatSchwelle - 0.05, C.heatSchwelle - 0.05);
    expect(s.front).toBe(0);
    expect(s.ring).toBe(0);
  });

  it('Fährte über der Schwelle erzeugt Häscher VORAUS', () => {
    expect(haescherSoll(TG, 0, 1).front).toBe(Math.round((1 - C.heatSchwelle) * C.frontProHeat));
    expect(haescherSoll(TG, 0, 1).front).toBeGreaterThan(0);
  });

  it('Kessel über der Schwelle erzeugt Häscher RINGS', () => {
    expect(haescherSoll(TG, 1, 0).ring).toBe(Math.round((1 - C.heatSchwelle) * C.ringProHeat));
  });

  it('Laufzeit hebt den Ring-Sockel (auch ohne Heat)', () => {
    const early = haescherSoll(TG, 0, 0).ring; // 0 — vor dem ersten Sockel
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
