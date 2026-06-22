import { describe, it, expect } from 'vitest';
import { weightsFromPointer, smoothToward, baryWeights, POLE_KERN, POLE_RAUM } from './compass';

describe('weightsFromPointer', () => {
  it('Maus auf einem Pol → dieses Gewicht dominiert', () => {
    const kern = weightsFromPointer(POLE_KERN.x, POLE_KERN.y);
    expect(kern.sniper).toBeGreaterThan(0.9);
    const raum = weightsFromPointer(POLE_RAUM.x, POLE_RAUM.y);
    expect(raum.aoe).toBeGreaterThan(0.9);
  });

  it('Gewichte summieren sich immer zu 1', () => {
    const w = weightsFromPointer(0.4, 0.6);
    expect(w.sniper + w.aoe + w.dot).toBeCloseTo(1, 6);
  });

  it('außerhalb des Dreiecks wird geklemmt (keine negativen Gewichte)', () => {
    const w = weightsFromPointer(0.0, 0.0); // oberhalb/links außerhalb
    expect(w.sniper).toBeGreaterThanOrEqual(0);
    expect(w.aoe).toBeGreaterThanOrEqual(0);
    expect(w.dot).toBeGreaterThanOrEqual(0);
    expect(w.sniper + w.aoe + w.dot).toBeCloseTo(1, 6);
  });
});

describe('smoothToward', () => {
  it('bewegt sich Richtung Ziel, erreicht es nicht in einem kleinen Schritt', () => {
    const cur = { sniper: 1, aoe: 0, dot: 0 };
    const target = { sniper: 0, aoe: 1, dot: 0 };
    const next = smoothToward(cur, target, 1, 6); // 1s in 6s-Fenster → ~1/6 des Wegs
    expect(next.aoe).toBeGreaterThan(0);
    expect(next.aoe).toBeLessThan(0.5);
    expect(next.sniper + next.aoe + next.dot).toBeCloseTo(1, 6);
  });

  it('großes dt erreicht das Ziel (geklemmt)', () => {
    const next = smoothToward({ sniper: 1, aoe: 0, dot: 0 }, { sniper: 0, aoe: 1, dot: 0 }, 100, 6);
    expect(next.aoe).toBeCloseTo(1, 6);
  });
});

describe('baryWeights', () => {
  it('Schwerpunkt = gleiche Gewichte', () => {
    const a = { x: 0, y: 0 }, b = { x: 1, y: 0 }, c = { x: 0, y: 1 };
    const w = baryWeights({ x: 1 / 3, y: 1 / 3 }, a, b, c);
    expect(w.wa).toBeCloseTo(1 / 3, 5);
    expect(w.wb).toBeCloseTo(1 / 3, 5);
    expect(w.wc).toBeCloseTo(1 / 3, 5);
  });
});
