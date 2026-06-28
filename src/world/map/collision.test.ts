import { describe, it, expect } from 'vitest';
import { loeseKollision, klemmeInArena } from './collision';

describe('loeseKollision', () => {
  it('lässt freie Position unverändert', () => {
    const r = loeseKollision(50, 50, 1.5, [{ x: 0, z: 0, r: 3 }]);
    expect(r.x).toBeCloseTo(50);
    expect(r.z).toBeCloseTo(50);
  });

  it('ohne Hindernisse keine Änderung', () => {
    const r = loeseKollision(2, -4, 1.5, []);
    expect(r.x).toBeCloseTo(2);
    expect(r.z).toBeCloseTo(-4);
  });

  it('schiebt überlappenden Spieler genau bis zur Berührung heraus', () => {
    // Hindernis r=3 bei Ursprung, Spieler r=1.5 -> Berührung bei Abstand 4.5.
    const r = loeseKollision(1, 0, 1.5, [{ x: 0, z: 0, r: 3 }]);
    expect(Math.hypot(r.x, r.z)).toBeCloseTo(4.5, 4);
    expect(r.z).toBeCloseTo(0); // entlang +X herausgeschoben
    expect(r.x).toBeGreaterThan(0);
  });

  it('schiebt Spieler im exakten Zentrum deterministisch heraus', () => {
    const r = loeseKollision(0, 0, 1.5, [{ x: 0, z: 0, r: 3 }]);
    expect(r.x).toBeCloseTo(4.5, 4);
    expect(r.z).toBeCloseTo(0);
  });

  it('löst Klemme zwischen zwei Hindernissen (außerhalb beider)', () => {
    const h = [
      { x: -2, z: 0, r: 3 },
      { x: 2, z: 0, r: 3 },
    ];
    const r = loeseKollision(0, 0.1, 1.5, h);
    expect(Math.hypot(r.x - -2, r.z - 0)).toBeGreaterThanOrEqual(4.5 - 1e-3);
    expect(Math.hypot(r.x - 2, r.z - 0)).toBeGreaterThanOrEqual(4.5 - 1e-3);
  });
});

describe('klemmeInArena', () => {
  it('lässt eine Position weit innerhalb des Feldes unverändert', () => {
    const r = klemmeInArena(40, -120, 1.5, 320, 320);
    expect(r.x).toBeCloseTo(40);
    expect(r.z).toBeCloseTo(-120);
  });

  it('klemmt am Rand so, dass die Hülle die Wand gerade berührt (nicht überschreitet)', () => {
    const r = klemmeInArena(999, -999, 1.5, 320, 320);
    expect(r.x).toBeCloseTo(320 - 1.5); // Mittelpunkt + Radius = Wand
    expect(r.z).toBeCloseTo(-(320 - 1.5));
  });

  it('klemmt jede Achse einzeln (X außerhalb, Z innen)', () => {
    const r = klemmeInArena(400, 10, 2, 320, 200);
    expect(r.x).toBeCloseTo(320 - 2);
    expect(r.z).toBeCloseTo(10); // Z bleibt
  });

  it('verkraftet einen Körper größer als das Feld (kein negativer Rand)', () => {
    const r = klemmeInArena(50, 50, 999, 320, 320);
    expect(r.x).toBeCloseTo(0);
    expect(r.z).toBeCloseTo(0);
  });
});
