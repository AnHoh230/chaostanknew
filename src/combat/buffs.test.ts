import { describe, it, expect } from 'vitest';
import { createBuffStack } from './buffs';

describe('createBuffStack', () => {
  it('ein aktiver Buff schlägt auf die Aggregation durch', () => {
    const s = createBuffStack();
    s.add({ id: 'speed', duration: 8, speedMul: 1.5 });
    expect(s.aggregate().speedMul).toBeCloseTo(1.5, 6);
    expect(s.active().length).toBe(1);
  });

  it('läuft nach der Dauer ab und verschwindet', () => {
    const s = createBuffStack();
    s.add({ id: 'speed', duration: 8, speedMul: 1.5 });
    s.tick(8.1);
    expect(s.aggregate().speedMul).toBe(1);
    expect(s.active().length).toBe(0);
  });

  it('verschiedene Buffs kombinieren (mul multipliziert, add addiert)', () => {
    const s = createBuffStack();
    s.add({ id: 'dmg', duration: 5, damageMul: 1.5 });
    s.add({ id: 'fire', duration: 5, fireRateMul: 2 });
    s.add({ id: 'arm', duration: 5, armorAdd: 40 });
    const a = s.aggregate();
    expect(a.damageMul).toBeCloseTo(1.5, 6);
    expect(a.fireRateMul).toBeCloseTo(2, 6);
    expect(a.armorAdd).toBe(40);
  });

  it('zwei mul auf dasselbe Feld multiplizieren sich', () => {
    const s = createBuffStack();
    s.add({ id: 'a', duration: 5, damageMul: 1.5 });
    s.add({ id: 'b', duration: 5, damageMul: 1.2 });
    expect(s.aggregate().damageMul).toBeCloseTo(1.8, 6);
  });

  it('gleiche id refresht die Dauer statt zu stapeln', () => {
    const s = createBuffStack();
    s.add({ id: 'x', duration: 8, speedMul: 1.5 });
    s.tick(5);
    s.add({ id: 'x', duration: 8, speedMul: 1.5 });
    expect(s.active().length).toBe(1);
    expect(s.active()[0]!.remaining).toBeCloseTo(8, 6);
    expect(s.aggregate().speedMul).toBeCloseTo(1.5, 6); // kein Doppelstapel
  });

  it('neutral ohne Buffs', () => {
    const a = createBuffStack().aggregate();
    expect(a).toEqual({
      damageMul: 1, speedMul: 1, fireRateMul: 1, turretSlewMul: 1,
      armorAdd: 0, accuracyAdd: 0, dodgeAdd: 0, incomingMul: 1,
    });
  });

  it('incomingMul (Verwundbarkeits-Debuff) multipliziert sich', () => {
    const s = createBuffStack();
    s.add({ id: 'markiert', duration: 8, incomingMul: 1.5 });
    expect(s.aggregate().incomingMul).toBeCloseTo(1.5, 6);
    s.tick(8.1);
    expect(s.aggregate().incomingMul).toBe(1);
  });
});
