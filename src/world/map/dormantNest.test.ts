import { describe, it, expect } from 'vitest';
import { createRng } from '../../core/rng';
import {
  createNest, pruefeEntdeckung, nestGegnerGefallen, nestGeraeumt, lebenDropAnzahl, LEBEN_PRO_DROP,
} from './dormantNest';
import { sammleCollectible } from './mapEntities';
import { MAP_TUNING } from './mapTuning';

describe('DormantNest (Phase 5)', () => {
  it('startet schlafend', () => {
    expect(createNest(4)).toEqual({ entdeckt: false, wach: false, rest: 4 });
  });

  it('erwacht erst im Entdeckungs-Radius (einmalig)', () => {
    const n = createNest(3);
    expect(pruefeEntdeckung(n, 30, 22)).toBe(false);
    expect(n.wach).toBe(false);
    expect(pruefeEntdeckung(n, 10, 22)).toBe(true);
    expect(n.wach).toBe(true);
    expect(n.entdeckt).toBe(true);
    expect(pruefeEntdeckung(n, 5, 22)).toBe(false); // schon wach → nicht erneut
  });

  it('gilt erst als geräumt, wenn wach UND rest 0', () => {
    const n = createNest(2);
    pruefeEntdeckung(n, 0, 22);
    expect(nestGeraeumt(n)).toBe(false);
    nestGegnerGefallen(n);
    expect(nestGeraeumt(n)).toBe(false);
    nestGegnerGefallen(n);
    expect(nestGeraeumt(n)).toBe(true);
    nestGegnerGefallen(n);
    expect(n.rest).toBe(0); // nie negativ
  });

  it('schlafendes Nest (nie geweckt) ist nicht geräumt', () => {
    const n = createNest(0);
    expect(nestGeraeumt(n)).toBe(false);
  });

  it('Leben-Drops: Anzahl im Tuning-Bereich, Menge > 0', () => {
    const rng = createRng(5);
    for (let i = 0; i < 50; i++) {
      const a = lebenDropAnzahl(rng);
      expect(a).toBeGreaterThanOrEqual(MAP_TUNING.nestLebenAnzahl[0]);
      expect(a).toBeLessThanOrEqual(MAP_TUNING.nestLebenAnzahl[1]);
    }
    expect(LEBEN_PRO_DROP).toBeGreaterThan(0);
  });

  it('Leben-Pickup heilt HP — kein Impuls', () => {
    expect(sammleCollectible('leben')).toEqual({ art: 'heal', menge: MAP_TUNING.nestLebenProDrop });
  });
});
