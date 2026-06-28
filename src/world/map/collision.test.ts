import { describe, it, expect } from 'vitest';
import { loeseKollision } from './collision';

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
