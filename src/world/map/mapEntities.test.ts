import { describe, it, expect } from 'vitest';
import { createRng } from '../../core/rng';
import {
  createBreakable, treffeBreakable, breakableLoot,
  hazardSchaden, hazardAktiv, sammleCollectible,
} from './mapEntities';
import { MAP_TUNING } from './mapTuning';

describe('Breakable (Phase 4)', () => {
  it('HP kommt aus dem Tuning', () => {
    expect(createBreakable('schrotthaufen').hp).toBe(2);
    expect(createBreakable('fass').hp).toBe(1);
  });

  it('zerstört nach genug Treffern', () => {
    let s = createBreakable('schrotthaufen'); // hp 2
    let r = treffeBreakable(s, 1);
    expect(r.zerstoert).toBe(false);
    s = r.state;
    r = treffeBreakable(s, 1);
    expect(r.zerstoert).toBe(true);
    expect(r.state.hp).toBe(0);
  });

  it('Loot ist NIE Impuls — nur none/heal/toy', () => {
    const rng = createRng(99);
    for (let i = 0; i < 300; i++) {
      const l = breakableLoot(rng);
      expect(['none', 'heal', 'toy']).toContain(l.art);
      if (l.art === 'heal') expect(l.menge).toBeGreaterThan(0);
    }
  });
});

describe('Hazard (Phase 4)', () => {
  it('Schaden aus Tuning, Fallback für Unbekanntes', () => {
    expect(hazardSchaden('presse')).toBe(MAP_TUNING.hazardDmg.presse);
    expect(hazardSchaden('gibtsnicht')).toBeGreaterThan(0);
  });

  it('getaktet: aktiv in erster Zyklushälfte, inaktiv in zweiter; ungetaktet immer', () => {
    const p = MAP_TUNING.hazardZyklus.presse;
    expect(hazardAktiv('presse', true, 0)).toBe(true);
    expect(hazardAktiv('presse', true, p * 0.75)).toBe(false);
    expect(hazardAktiv('stachelgrube', false, 123)).toBe(true);
  });
});

describe('Collectible (Phase 4)', () => {
  it('heal heilt, toy ist Toy — nie Impuls', () => {
    expect(sammleCollectible('heal')).toEqual({ art: 'heal', menge: MAP_TUNING.collectibleHeal });
    expect(sammleCollectible('toy').art).toBe('toy');
  });
});
