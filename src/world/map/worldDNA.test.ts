import { describe, expect, it } from 'vitest';
import { generateWorldDNA } from './worldDNA';

describe('generateWorldDNA', () => {
  it('ist fuer denselben Seed deterministisch und fuer andere Seeds verschieden', () => {
    expect(generateWorldDNA(7)).toEqual(generateWorldDNA(7));
    expect(generateWorldDNA(7)).not.toEqual(generateWorldDNA(8));
  });

  it('haelt alle DNA-Werte im normierten Bereich', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const value of Object.values(generateWorldDNA(seed))) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('wendet Debug-Overrides an, ohne andere Grundachsen zu koppeln', () => {
    const original = generateWorldDNA(7);
    const dna = generateWorldDNA(7, { industrialization: 0.9, destruction: 0.2 });
    expect(dna.industrialization).toBe(0.9);
    expect(dna.destruction).toBe(0.2);
    expect(dna.openness).toBe(original.openness);
    expect(dna.wetness).toBe(original.wetness);
  });
});
