import { describe, it, expect } from 'vitest';
import {
  createPlayerBoni, waehleBoni, randomBoniAuswahl, rollCrit, boniDef, BONI_POOL,
  BONI_HP_PRO_WAHL, BONI_CRIT_CHANCE_PRO_WAHL, BONI_CRIT_DMG_PRO_WAHL, CRIT_BASIS_MULT,
} from './playerBoni';

describe('Spieler-Level-Boni', () => {
  it('startet leer (Crit-Basis ×1.5, keine Chance)', () => {
    const s = createPlayerBoni();
    expect(s).toEqual({ maxHp: 0, speed: 0, critChance: 0, critMult: CRIT_BASIS_MULT, dodge: 0 });
  });

  it('akkumuliert dieselbe Karte mehrfach', () => {
    const s = createPlayerBoni();
    waehleBoni(s, 'hp');
    waehleBoni(s, 'hp');
    expect(s.maxHp).toBe(2 * BONI_HP_PRO_WAHL);
  });

  it('Crit-Karten verändern Chance und Multiplikator', () => {
    const s = createPlayerBoni();
    waehleBoni(s, 'critChance');
    waehleBoni(s, 'critDmg');
    expect(s.critChance).toBeCloseTo(BONI_CRIT_CHANCE_PRO_WAHL);
    expect(s.critMult).toBeCloseTo(CRIT_BASIS_MULT + BONI_CRIT_DMG_PRO_WAHL);
  });

  it('jede Pool-Karte hat eine apply-Funktion und eindeutige Id', () => {
    const ids = new Set(BONI_POOL.map((d) => d.id));
    expect(ids.size).toBe(BONI_POOL.length);
    for (const d of BONI_POOL) expect(boniDef(d.id)).toBe(d);
  });

  describe('rollCrit', () => {
    it('ohne Crit-Chance niemals Crit (×1)', () => {
      const s = createPlayerBoni();
      expect(rollCrit(s, () => 0)).toEqual({ dmgMul: 1, crit: false });
    });

    it('mit voller Chance immer Crit mit aktuellem Multiplikator', () => {
      const s = createPlayerBoni();
      s.critChance = 1;
      s.critMult = 2.0;
      const r = rollCrit(s, () => 0.99);
      expect(r.crit).toBe(true);
      expect(r.dmgMul).toBe(2.0);
    });

    it('würfelt gegen die Schwelle (rng über chance = kein Crit)', () => {
      const s = createPlayerBoni();
      s.critChance = 0.3;
      expect(rollCrit(s, () => 0.2).crit).toBe(true); // 0.2 < 0.3
      expect(rollCrit(s, () => 0.5).crit).toBe(false); // 0.5 >= 0.3
    });
  });

  describe('randomBoniAuswahl', () => {
    it('liefert n nicht-doppelte Ids', () => {
      const auswahl = randomBoniAuswahl(3, mulberry(42));
      expect(auswahl.length).toBe(3);
      expect(new Set(auswahl).size).toBe(3);
    });

    it('deckelt auf die Pool-Größe', () => {
      const auswahl = randomBoniAuswahl(99, mulberry(7));
      expect(auswahl.length).toBe(BONI_POOL.length);
    });
  });
});

// kleiner deterministischer PRNG für die Auswahl-Tests
function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
