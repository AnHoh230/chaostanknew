import { describe, it, expect } from 'vitest';
import {
  summeGewichte, levelKosten, polGesamtKosten, paarGesamtKosten, paarMinuten, basisFuerZiel,
  effektiverImpuls, TARGET_PAIR_MINUTES, TARGET_IMPULSE_PER_MINUTE,
  IMPULSE_RATE_MAX_MULT, IMPULSE_RATE_MIN_MULT,
} from './evolutionTuning';

describe('evolutionTuning — Kosten & Pacing (Spec 5 §3)', () => {
  it('Summe der Gewichte = 8.20703125 (5 Level, 1.25)', () => {
    expect(summeGewichte()).toBeCloseTo(8.20703125, 6);
  });

  it('Level-Kosten folgen basis * 1.25^index', () => {
    expect(levelKosten(0)).toBeCloseTo(14, 6);
    expect(levelKosten(1)).toBeCloseTo(17.5, 6);
    expect(levelKosten(2)).toBeCloseTo(21.875, 6);
    expect(levelKosten(3)).toBeCloseTo(27.34375, 6);
    expect(levelKosten(4)).toBeCloseTo(34.1796875, 6);
  });

  it('Pol ~114.9, Paar ~229.8 Impulse (Default-Basis 14) — der geforderte Gate-0-Beweis', () => {
    expect(polGesamtKosten()).toBeCloseTo(114.898, 2);
    expect(paarGesamtKosten()).toBeCloseTo(229.797, 2);
  });

  it('Paar dauert bei 30 Impulsen/min ~7.66 min', () => {
    expect(paarMinuten(30)).toBeCloseTo(7.66, 2);
  });

  it('basisFuerZiel(7.5, 30) ≈ 13.71 (begründet die Rundung auf 14)', () => {
    expect(basisFuerZiel(TARGET_PAIR_MINUTES, TARGET_IMPULSE_PER_MINUTE)).toBeCloseTo(13.71, 2);
  });
});

describe('effektiverImpuls — umschaltbare Politik (Spec 5 §4)', () => {
  it("'roh' gibt den Rohwert zurück (Dopamin, killrate-unabhängig)", () => {
    expect(effektiverImpuls(5, 100, 'roh')).toBe(5);
    expect(effektiverImpuls(5, 10, 'roh')).toBe(5);
  });

  it("'normalisiert' bremst schnelle Killraten (clamp MIN)", () => {
    // ewma 100/min, Ziel 30 → mult = clamp(0.3, .35, 2.5) = 0.35
    expect(effektiverImpuls(10, 100, 'normalisiert')).toBeCloseTo(10 * IMPULSE_RATE_MIN_MULT, 6);
  });

  it("'normalisiert' boostet langsame Killraten (clamp MAX)", () => {
    // ewma 5/min, Ziel 30 → mult = clamp(6, .35, 2.5) = 2.5
    expect(effektiverImpuls(10, 5, 'normalisiert')).toBeCloseTo(10 * IMPULSE_RATE_MAX_MULT, 6);
  });

  it("'normalisiert' ist neutral bei ewma == Ziel", () => {
    expect(effektiverImpuls(10, TARGET_IMPULSE_PER_MINUTE, 'normalisiert')).toBeCloseTo(10, 6);
  });

  it("'normalisiert' mit ewma 0 ist sicher (kein NaN, clamp MAX)", () => {
    expect(effektiverImpuls(10, 0, 'normalisiert')).toBeCloseTo(10 * IMPULSE_RATE_MAX_MULT, 6);
  });
});
