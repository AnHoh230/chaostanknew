import { describe, it, expect } from 'vitest';
import { stepAutoTurret, type AutoTurretState } from './autoTurret';
import { yawTo } from '../input/aimMath';

function mk(): AutoTurretState {
  return { cooldown: 0, range: 30, fireInterval: 1.2, damage: 15, accuracy: 1 };
}

describe('stepAutoTurret', () => {
  it('feuert auf das nächste Ziel in Reichweite, wenn der Cooldown frei ist', () => {
    const s = mk();
    const res = stepAutoTurret(0, 0, s, [{ x: 0, z: 10 }, { x: 0, z: 5 }], 0.016, () => 0.5);
    expect(res.fire).toBe(true);
    expect(res.targetZ).toBe(5); // näheres Ziel
    expect(res.dir).toBeCloseTo(yawTo(0, 0, 0, 5), 6); // accuracy 1 → exakt
    expect(s.cooldown).toBeCloseTo(1.2, 6); // Cooldown zurückgesetzt
  });

  it('feuert nicht, solange der Cooldown läuft (tickt aber runter)', () => {
    const s = mk();
    s.cooldown = 1.0;
    const res = stepAutoTurret(0, 0, s, [{ x: 0, z: 5 }], 0.1, () => 0.5);
    expect(res.fire).toBe(false);
    expect(s.cooldown).toBeCloseTo(0.9, 6);
  });

  it('kein Ziel in Reichweite → kein Feuer', () => {
    const s = mk();
    const res = stepAutoTurret(0, 0, s, [{ x: 0, z: 100 }], 0.016, () => 0.5);
    expect(res.fire).toBe(false);
  });

  it('leere Kandidatenliste → kein Feuer', () => {
    const s = mk();
    expect(stepAutoTurret(0, 0, s, [], 0.016, () => 0.5).fire).toBe(false);
  });

  it('niedrige Treffsicherheit streut die Richtung', () => {
    const s = mk();
    s.accuracy = 0;
    const res = stepAutoTurret(0, 0, s, [{ x: 0, z: 5 }], 0.016, () => 1);
    expect(res.dir).not.toBeCloseTo(yawTo(0, 0, 0, 5), 6); // abweichend
  });
});
