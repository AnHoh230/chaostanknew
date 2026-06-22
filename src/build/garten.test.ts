import { describe, it, expect } from 'vitest';
import { saeGift, tickGift, DEFAULT_GARTEN, type GartenConfig } from './garten';

const CFG: GartenConfig = { saat: 3, reife: 1.2, tickEvery: 0.5, giftDur: 6, slow: 0.5 };

describe('saeGift', () => {
  it('sät auf leerem Ziel die volle Saat + setzt die Dauer', () => {
    const g = saeGift(undefined, CFG);
    expect(g.potency).toBe(3);
    expect(g.life).toBe(6);
  });
  it('stapelt Potenz beim Nachsäen und frischt die Dauer auf', () => {
    let g = saeGift(undefined, CFG);
    g.life = 2; // angenommen Zeit vergangen
    g = saeGift(g, CFG);
    expect(g.potency).toBe(6); // 3 + 3
    expect(g.life).toBe(6); // wieder voll
  });
});

describe('tickGift', () => {
  it('macht erst bei fälligem Tick Schaden und reift dann weiter', () => {
    const g = saeGift(undefined, CFG); // potency 3, tickCd 0.5
    expect(tickGift(g, 0.3, CFG).dmg).toBe(0); // tickCd 0.2, noch nicht fällig
    const r = tickGift(g, 0.3, CFG); // tickCd <=0 → Tick
    expect(r.dmg).toBe(3); // Schaden = Potenz vor dem Reifen
    expect(g.potency).toBeCloseTo(3.6); // ×1.2 gereift
  });
  it('verfällt nach giftDur', () => {
    const g = saeGift(undefined, CFG);
    expect(tickGift(g, 6.1, CFG).expired).toBe(true);
  });
  it('reifender Schaden wächst über mehrere Ticks (Garten-Gefühl)', () => {
    const g = saeGift(undefined, CFG);
    const early = tickGift(g, 0.5, CFG).dmg; // erster Tick
    let late = early;
    for (let i = 0; i < 5; i++) late = tickGift(g, 0.5, CFG).dmg; // 5 weitere Ticks reifen lassen
    expect(late).toBeGreaterThan(early); // gereiftes Gift trifft härter
  });
});

describe('DEFAULT_GARTEN', () => {
  it('reift (Faktor > 1) und drosselt das Tempo', () => {
    expect(DEFAULT_GARTEN.reife).toBeGreaterThan(1);
    expect(DEFAULT_GARTEN.slow).toBeGreaterThan(0);
  });
});
