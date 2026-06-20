import { describe, it, expect } from 'vitest';
import { applyJitter, dodgeRoll, MAX_JITTER } from './accuracy';

describe('applyJitter', () => {
  it('accuracy 1 → keine Abweichung', () => {
    expect(applyJitter(1.2, 1, () => 0.9)).toBe(1.2);
  });

  it('rng=0.5 → Mitte (keine Abweichung)', () => {
    expect(applyJitter(0.4, 0.5, () => 0.5)).toBeCloseTo(0.4, 6);
  });

  it('Abweichung ist auf MAX_JITTER*(1-accuracy) begrenzt', () => {
    const a = 0.5;
    const max = MAX_JITTER * (1 - a);
    const hi = applyJitter(0, a, () => 1); // +max
    const lo = applyJitter(0, a, () => 0); // -max
    expect(hi).toBeCloseTo(max, 6);
    expect(lo).toBeCloseTo(-max, 6);
    expect(Math.abs(hi)).toBeLessThanOrEqual(max + 1e-9);
  });

  it('accuracy außerhalb 0..1 wird geklemmt', () => {
    expect(applyJitter(0, 5, () => 1)).toBe(0); // >1 → wie 1
  });
});

describe('dodgeRoll', () => {
  it('dodge 0 → nie', () => {
    expect(dodgeRoll(0, () => 0)).toBe(false);
  });
  it('dodge 1 → immer', () => {
    expect(dodgeRoll(1, () => 0.999)).toBe(true);
  });
  it('Schwelle: rng < dodge', () => {
    expect(dodgeRoll(0.5, () => 0.4)).toBe(true);
    expect(dodgeRoll(0.5, () => 0.6)).toBe(false);
  });
});
