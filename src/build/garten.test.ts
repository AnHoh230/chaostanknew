import { describe, it, expect } from 'vitest';
import { saeGift, tickGift, istReif, reifeStufe, giftSlow, DEFAULT_GARTEN, type GartenConfig } from './garten';

const CFG: GartenConfig = {
  saat: 6, reife: 1.25, tickEvery: 0.5, tickDmg: 2, reifDmg: 11, slow: 0.4, erntePot: 24,
  ansteckRadius: 30, dmgProFieber: 2, potProFieber: 2,
};

describe('saeGift', () => {
  it('infiziert ein leeres Ziel mit der vollen Saat', () => {
    expect(saeGift(undefined, CFG).potency).toBe(6);
  });
  it('stapelt Potenz beim Nachsäen', () => {
    expect(saeGift(saeGift(undefined, CFG), CFG).potency).toBe(12);
  });
  it('Erntefieber lässt frische Infektionen heißer starten (schnellere Reife)', () => {
    expect(saeGift(undefined, CFG, 3).potency).toBe(6 + 3 * CFG.potProFieber); // 12
  });
});

describe('tickGift', () => {
  it('köchelt klein und reift, solange unreif', () => {
    const g = saeGift(undefined, CFG); // potency 6, tickCd 0.5
    expect(tickGift(g, 0.3, CFG).dmg).toBe(0); // noch nicht fällig
    const r = tickGift(g, 0.3, CFG);
    expect(r.ticked).toBe(true);
    expect(r.dmg).toBe(CFG.tickDmg); // kleiner Köchel
    expect(g.potency).toBeCloseTo(7.5); // ×1.25 gereift
  });
  it('eine einzelne Infektion reift von selbst bis reif (kein Nachhämmern nötig)', () => {
    const g = saeGift(undefined, CFG);
    for (let i = 0; i < 40 && !istReif(g, CFG); i++) tickGift(g, 0.5, CFG);
    expect(istReif(g, CFG)).toBe(true);
  });
  it('reif → tödliches Gift (reifDmg) statt Köcheln, reift nicht weiter', () => {
    const g = saeGift(undefined, CFG);
    g.potency = CFG.erntePot; // reif
    const r = tickGift(g, 0.5, CFG);
    expect(r.dmg).toBe(CFG.reifDmg); // tötet jetzt
    expect(g.potency).toBe(CFG.erntePot); // reift nicht weiter
  });
  it('Erntefieber erhöht den tödlichen Gift-Schaden', () => {
    const g = saeGift(undefined, CFG);
    g.potency = CFG.erntePot;
    expect(tickGift(g, 0.5, CFG, 4).dmg).toBe(CFG.reifDmg + 4 * CFG.dmgProFieber); // 11 + 8 = 19
  });
});

describe('giftSlow', () => {
  it('frisch Infizierte verlieren mindestens cfg.slow, reife stehen (1)', () => {
    const g = saeGift(undefined, CFG); // niedrige Potenz
    expect(giftSlow(g, CFG)).toBeGreaterThanOrEqual(CFG.slow);
    expect(giftSlow(g, CFG)).toBeLessThan(1);
    g.potency = CFG.erntePot; // reif
    expect(giftSlow(g, CFG)).toBe(1); // steht
  });
  it('Drosselung steigt monoton mit der Reife bis 1', () => {
    const g = saeGift(undefined, CFG);
    const vals: number[] = [];
    for (const p of [2, 8, 16, 24]) { g.potency = p; vals.push(giftSlow(g, CFG)); }
    for (let i = 1; i < vals.length; i++) expect(vals[i]!).toBeGreaterThanOrEqual(vals[i - 1]!);
    expect(vals[vals.length - 1]).toBe(1);
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
});

describe('DEFAULT_GARTEN', () => {
  it('reift, drosselt und ist tödlich-wenn-reif im Welt-Maßstab', () => {
    expect(DEFAULT_GARTEN.reife).toBeGreaterThan(1);
    expect(DEFAULT_GARTEN.slow).toBeGreaterThan(0);
    expect(DEFAULT_GARTEN.slow).toBeLessThanOrEqual(1);
    expect(DEFAULT_GARTEN.erntePot).toBeGreaterThan(DEFAULT_GARTEN.saat);
    expect(DEFAULT_GARTEN.reifDmg).toBeGreaterThan(DEFAULT_GARTEN.tickDmg); // reif tötet, Köcheln nicht
    expect(DEFAULT_GARTEN.ansteckRadius).toBeGreaterThan(10);
  });
});
