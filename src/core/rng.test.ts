import { describe, it, expect } from 'vitest';
import { createRng } from './rng';

describe('createRng (mulberry32)', () => {
  it('liefert deterministische Sequenz für gleichen Seed', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = [a.next(), a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it('next() bleibt im Bereich [0,1)', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('unterschiedliche Seeds liefern unterschiedliche Sequenzen', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('int(maxExcl) liefert ganze Zahlen in [0, maxExcl)', () => {
    const r = createRng(99);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
  });

  it('range(min,max) liefert Werte in [min, max)', () => {
    const r = createRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = r.range(10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
  });

  it('range ist deterministisch bei gleichem Seed', () => {
    const a = createRng(555);
    const b = createRng(555);
    expect(a.range(-5, 5)).toBe(b.range(-5, 5));
  });
});
