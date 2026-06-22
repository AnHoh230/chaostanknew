import { describe, it, expect } from 'vitest';
import { saeGift, tickGift, reifeStufe, DEFAULT_GARTEN, type GartenConfig } from './garten';

const CFG: GartenConfig = {
  saat: 3, reife: 1.2, tickEvery: 0.5, giftDur: 6, slow: 0.5, erntePot: 24, ernteBurst: 4,
};

describe('saeGift', () => {
  it('sät auf leerem Ziel die volle Saat + setzt die Dauer', () => {
    const g = saeGift(undefined, CFG);
    expect(g.potency).toBe(3);
    expect(g.life).toBe(6);
  });
  it('stapelt Potenz beim Nachsäen und frischt die Dauer auf', () => {
    let g = saeGift(undefined, CFG);
    g.life = 2;
    g = saeGift(g, CFG);
    expect(g.potency).toBe(6);
    expect(g.life).toBe(6);
  });
});

describe('tickGift', () => {
  it('macht erst bei fälligem Tick Schaden und reift dann weiter', () => {
    const g = saeGift(undefined, CFG);
    expect(tickGift(g, 0.3, CFG).dmg).toBe(0);
    const r = tickGift(g, 0.3, CFG);
    expect(r.dmg).toBe(3);
    expect(r.ernte).toBe(false);
    expect(g.potency).toBeCloseTo(3.6);
  });
  it('verfällt nach giftDur', () => {
    const g = saeGift(undefined, CFG);
    expect(tickGift(g, 6.1, CFG).expired).toBe(true);
  });
  it('reifender Schaden wächst über mehrere Ticks (Garten-Gefühl)', () => {
    const g = saeGift(undefined, CFG);
    const early = tickGift(g, 0.5, CFG).dmg;
    let late = early;
    for (let i = 0; i < 5; i++) late = tickGift(g, 0.5, CFG).dmg;
    expect(late).toBeGreaterThan(early);
  });
  it('signalisiert Ernte, sobald die Potenz die Schwelle erreicht (Slot 3 — Erntebruch)', () => {
    const g = saeGift(undefined, CFG);
    g.potency = CFG.erntePot; // reif
    const r = tickGift(g, 0.5, CFG);
    expect(r.ernte).toBe(true);
    expect(r.dmg).toBe(0); // der Aufrufer macht stattdessen den Burst
  });
});

describe('reifeStufe', () => {
  it('frisches Gift = Stufe 0, reifes Gift = Stufe 3', () => {
    const g = saeGift(undefined, CFG); // potency 3, erntePot 24 → f=0.125
    expect(reifeStufe(g, CFG)).toBe(0);
    g.potency = CFG.erntePot;
    expect(reifeStufe(g, CFG)).toBe(3);
  });
  it('steigt monoton mit der Potenz', () => {
    const g = saeGift(undefined, CFG);
    const stufen: number[] = [];
    for (const p of [2, 8, 16, 24]) { g.potency = p; stufen.push(reifeStufe(g, CFG)); }
    expect(stufen).toEqual([0, 1, 2, 3]);
  });
});

describe('DEFAULT_GARTEN', () => {
  it('reift, drosselt und hat eine Ernteschwelle', () => {
    expect(DEFAULT_GARTEN.reife).toBeGreaterThan(1);
    expect(DEFAULT_GARTEN.slow).toBeGreaterThan(0);
    expect(DEFAULT_GARTEN.erntePot).toBeGreaterThan(DEFAULT_GARTEN.saat);
  });
});
