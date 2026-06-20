import { describe, it, expect } from 'vitest';
import { CATALOG, catalogItem } from './catalog';

describe('CATALOG', () => {
  it('hat 100 Formel-Items (5 Slots × 10 MK × 2 Seltenheiten) plus Sonder-Items', () => {
    const formel = CATALOG.filter((it) => !it.autoFire);
    expect(formel).toHaveLength(100);
    expect(CATALOG.length).toBeGreaterThan(100); // + Auto-Turrets (Sekundärwaffen)
  });

  it('Stats & Preise treffen die Item-Datei (Stichproben)', () => {
    const r1 = catalogItem('ruestung_mk01_normal');
    expect(r1.armor).toBe(59);
    expect(r1.cost).toBe(108);

    const w1 = catalogItem('waffe_mk01_normal');
    expect(w1.damage).toBe(29);
    expect(w1.cost).toBe(138);

    const wanne1 = catalogItem('wanne_mk01_normal');
    expect(wanne1.hp).toBe(159);
  });

  it('seltene Items: +15% Hauptwert, 1.65× Preis', () => {
    const n = catalogItem('ruestung_mk01_normal');
    const s = catalogItem('ruestung_mk01_selten');
    expect(s.armor).toBe(Math.round(n.armor * 1.15)); // 68
    expect(s.cost).toBe(Math.round(n.cost * 1.65)); // 178
  });

  it('jedes Formel-Item hat genau einen Hauptwert > 0 (Auto-Turrets ausgenommen)', () => {
    for (const it of CATALOG.filter((x) => !x.autoFire)) {
      const nonzero = [it.damage, it.hp, it.armor, it.speed].filter((v) => v > 0).length;
      expect(nonzero).toBe(1);
    }
  });
});
