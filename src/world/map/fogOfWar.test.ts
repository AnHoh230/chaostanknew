import { describe, it, expect } from 'vitest';
import { createFog } from './fogOfWar';

describe('createFog', () => {
  it('startet komplett verhüllt', () => {
    const f = createFog(100, 100, 20);
    expect(f.istEnthuellt(0, 0)).toBe(false);
    expect(f.istEnthuellt(80, -60)).toBe(false);
  });

  it('deckt rund um die Position auf, Fernes bleibt verhüllt', () => {
    const f = createFog(100, 100, 20);
    f.reveal(0, 0, 40);
    expect(f.istEnthuellt(0, 0)).toBe(true);
    expect(f.istEnthuellt(10, -10)).toBe(true);
    expect(f.istEnthuellt(90, 90)).toBe(false); // weit weg
  });

  it('Aufdeckung ist persistent (mehrere reveal akkumulieren)', () => {
    const f = createFog(200, 200, 20);
    f.reveal(-100, 0, 30);
    f.reveal(100, 0, 30);
    expect(f.istEnthuellt(-100, 0)).toBe(true);
    expect(f.istEnthuellt(100, 0)).toBe(true);
    expect(f.istEnthuellt(0, 0)).toBe(false); // dazwischen nie betreten
  });

  it('reset verhüllt wieder alles', () => {
    const f = createFog(100, 100, 20);
    f.reveal(0, 0, 50);
    f.reset();
    expect(f.istEnthuellt(0, 0)).toBe(false);
  });

  it('liefert plausible Rastergröße', () => {
    const f = createFog(100, 100, 20);
    expect(f.cols).toBe(10);
    expect(f.rows).toBe(10);
  });
});
