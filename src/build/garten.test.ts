import { describe, it, expect } from 'vitest';
import { saeGift, tickGift, istReif, reifeStufe, DEFAULT_GARTEN, type GartenConfig } from './garten';

const CFG: GartenConfig = {
  saat: 4, reife: 1.2, tickEvery: 0.5, tickDmg: 3, slow: 0.5, erntePot: 24, ernteBurst: 10,
};

describe('saeGift', () => {
  it('sät auf leerem Ziel die volle Saat', () => {
    expect(saeGift(undefined, CFG).potency).toBe(4);
  });
  it('stapelt Potenz beim Nachsäen (optional, für zähe Gegner)', () => {
    const g = saeGift(saeGift(undefined, CFG), CFG);
    expect(g.potency).toBe(8);
  });
});

describe('tickGift', () => {
  it('köchelt erst bei fälligem Tick und reift dann', () => {
    const g = saeGift(undefined, CFG); // potency 4, tickCd 0.5
    expect(tickGift(g, 0.3, CFG).dmg).toBe(0); // noch nicht fällig
    const r = tickGift(g, 0.3, CFG);
    expect(r.dmg).toBe(CFG.tickDmg); // kleiner Köchel-Schaden
    expect(g.potency).toBeCloseTo(4.8); // ×1.2 gereift
  });
  it('ein einzelner Saat reift von selbst bis reif (kein Nachhämmern nötig)', () => {
    const g = saeGift(undefined, CFG);
    for (let i = 0; i < 40 && !istReif(g, CFG); i++) tickGift(g, 0.5, CFG);
    expect(istReif(g, CFG)).toBe(true);
  });
  it('reifes Gift köchelt/reift NICHT mehr — es wartet auf die Ernte', () => {
    const g = saeGift(undefined, CFG);
    g.potency = CFG.erntePot; // reif
    const before = g.potency;
    const r = tickGift(g, 0.5, CFG);
    expect(r.dmg).toBe(0); // kein Schaden mehr
    expect(g.potency).toBe(before); // reift nicht weiter
  });
});

describe('istReif / reifeStufe', () => {
  it('frisch = unreif/Stufe 0, an der Schwelle = reif/Stufe 3', () => {
    const g = saeGift(undefined, CFG);
    expect(istReif(g, CFG)).toBe(false);
    expect(reifeStufe(g, CFG)).toBe(0);
    g.potency = CFG.erntePot;
    expect(istReif(g, CFG)).toBe(true);
    expect(reifeStufe(g, CFG)).toBe(3);
  });
  it('Reife-Stufe steigt monoton mit der Potenz', () => {
    const g = saeGift(undefined, CFG);
    const stufen: number[] = [];
    for (const p of [2, 8, 16, 24]) { g.potency = p; stufen.push(reifeStufe(g, CFG)); }
    expect(stufen).toEqual([0, 1, 2, 3]);
  });
});

describe('DEFAULT_GARTEN', () => {
  it('reift, drosselt, köchelt klein und erntet wuchtig', () => {
    expect(DEFAULT_GARTEN.reife).toBeGreaterThan(1);
    expect(DEFAULT_GARTEN.slow).toBeGreaterThan(0);
    expect(DEFAULT_GARTEN.erntePot).toBeGreaterThan(DEFAULT_GARTEN.saat);
    expect(DEFAULT_GARTEN.ernteBurst).toBeGreaterThan(1);
  });
});
