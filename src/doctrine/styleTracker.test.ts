import { describe, it, expect } from 'vitest';
import { createStyleTracker } from './styleTracker';

describe('createStyleTracker', () => {
  it('autoTurretDamageRatio = Anteil Auto-Turret-Schaden', () => {
    const t = createStyleTracker();
    t.onDamageDealt({ amount: 30, fromAutoTurret: true });
    t.onDamageDealt({ amount: 10, fromAutoTurret: false });
    expect(t.snapshotAndReset().autoTurretDamageRatio).toBeCloseTo(0.75, 6);
  });

  it('kein Schaden → Ratio 0 (keine Division durch 0)', () => {
    expect(createStyleTracker().snapshotAndReset().autoTurretDamageRatio).toBe(0);
  });

  it('Fern-/Nah-Kill-Ratios aus der Distanz', () => {
    const t = createStyleTracker();
    t.onKill({ dist: 40 }); // fern
    t.onKill({ dist: 35 }); // fern
    t.onKill({ dist: 5 }); // nah
    const p = t.snapshotAndReset();
    expect(p.longRangeKillRatio).toBeCloseTo(2 / 3, 6);
    expect(p.closeRangeKillRatio).toBeCloseTo(1 / 3, 6);
  });

  it('Stehen → hoher stationaryRatio + niedriges avgSpeed', () => {
    const t = createStyleTracker();
    for (let i = 0; i < 10; i++) t.onMove({ speed: 0, x: 5, z: 5, dt: 0.1 });
    const p = t.snapshotAndReset();
    expect(p.stationaryRatio).toBeCloseTo(1, 6);
    expect(p.avgSpeed).toBeCloseTo(0, 6);
  });

  it('Fahren → stationaryRatio 0, avgSpeed = zeit-gewichtet', () => {
    const t = createStyleTracker();
    for (let i = 0; i < 4; i++) t.onMove({ speed: 8, x: i * 5, z: 0, dt: 0.5 });
    const p = t.snapshotAndReset();
    expect(p.stationaryRatio).toBe(0);
    expect(p.avgSpeed).toBeCloseTo(8, 6);
  });

  it('timeInSameArea: Verweilen im Umkreis zählt, Verlassen setzt zurück', () => {
    const t = createStyleTracker();
    // 1 s im Umkreis des Ankers (0,0)
    for (let i = 0; i < 10; i++) t.onMove({ speed: 0.5, x: 1, z: 1, dt: 0.1 });
    // weit weg → neuer Anker, Zone-Timer zurück
    t.onMove({ speed: 8, x: 100, z: 100, dt: 0.1 });
    const p = t.snapshotAndReset();
    expect(p.timeInSameArea).toBeCloseTo(1, 5); // ~1 s im Umkreis (Float-Summe)
  });

  it('Booster-Zündungen + Schaden-im-Stand werden gezählt', () => {
    const t = createStyleTracker();
    t.onBoosterUsed();
    t.onBoosterUsed();
    t.onDamageTaken({ amount: 20, stationary: true });
    t.onDamageTaken({ amount: 5, stationary: false }); // zählt nicht
    const p = t.snapshotAndReset();
    expect(p.boosterUsage).toBe(2);
    expect(p.damageTakenWhileStationary).toBe(20);
  });

  it('snapshotAndReset leert das Fenster', () => {
    const t = createStyleTracker();
    t.onDamageDealt({ amount: 50, fromAutoTurret: true });
    t.onKill({ dist: 40 });
    t.snapshotAndReset();
    const p = t.snapshotAndReset();
    expect(p.autoTurretDamageRatio).toBe(0);
    expect(p.longRangeKillRatio).toBe(0);
  });
});
