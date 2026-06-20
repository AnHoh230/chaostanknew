import { describe, it, expect } from 'vitest';
import { BOOSTERS, boosterDef } from './boosters';

describe('BOOSTERS', () => {
  it('jede ID ist eindeutig', () => {
    const ids = BOOSTERS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('jeder Booster ist ein gültiges consumable/instant-Item', () => {
    for (const b of BOOSTERS) {
      expect(b.kind).toBe('consumable');
      expect(b.consumableType).toBe('booster');
      expect(b.category).toBe('instant');
      expect(b.cost).toBeGreaterThan(0);
      expect(['player', 'enemy', 'both']).toContain(b.buyer);
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.desc.length).toBeGreaterThan(0);
      expect(b.effect).toBeTruthy();
    }
  });

  it('enthält die Kern-Booster aus dem Design', () => {
    const ids = BOOSTERS.map((b) => b.id);
    for (const id of [
      'notstrom_zuender', 'panzerhaut_schaum', 'ueberdruck_munition',
      'kuehlmittel_injektion', 'turmservo_boost', 'letzte_schicht',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('Buff-Booster tragen eine BuffSpec mit eigener id', () => {
    const ns = boosterDef('notstrom_zuender');
    expect(ns.effect.kind).toBe('buff');
    if (ns.effect.kind === 'buff') {
      expect(ns.effect.buff.id).toBe('notstrom_zuender');
      expect(ns.effect.buff.speedMul).toBeGreaterThan(1);
      expect(ns.effect.buff.duration).toBeGreaterThan(0);
    }
  });

  it('boosterDef wirft bei unbekannter id', () => {
    expect(() => boosterDef('gibtsnicht')).toThrow(/Unbekannter Booster/);
  });
});
