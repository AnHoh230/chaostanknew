import { describe, it, expect } from 'vitest';
import { getRezept } from './recipe';
import { getBiome } from '../biomeRegistry';

describe('Rezept schrottfeld (Phase 1)', () => {
  it('existiert', () => {
    expect(getRezept('schrottfeld')).toBeDefined();
  });

  it('referenziert ein registriertes Biom (getBiome wirft nicht)', () => {
    const r = getRezept('schrottfeld');
    expect(() => getBiome(r.biomeId)).not.toThrow();
  });

  it('hat die vier Pflicht-Set-Pieces', () => {
    const r = getRezept('schrottfeld');
    for (const k of ['landmark', 'dormantNest', 'hazard', 'secretRamp'] as const) {
      expect(r.pflichtSetpieces).toContain(k);
    }
  });

  it('Dichte-Regeln decken alle verwendeten Zonen-Themen ab', () => {
    const r = getRezept('schrottfeld');
    const themenMitDichte = new Set(r.dichte.map((d) => d.theme));
    for (const z of r.zonen) {
      expect(themenMitDichte.has(z.theme), `Dichte fehlt für ${z.theme}`).toBe(true);
    }
  });
});
