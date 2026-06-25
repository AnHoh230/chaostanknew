import { describe, it, expect } from 'vitest';
import { nachsetzenFaellig, spawnRundum, DEFAULT_NACHSETZ as C } from './nachsetzen';

describe('Gegner-Nachsetzen (Rubberband-Ersatz)', () => {
  describe('nachsetzenFaellig', () => {
    it('erst ab dem Timeout fällig', () => {
      expect(nachsetzenFaellig(C.timeout - 0.1)).toBe(false);
      expect(nachsetzenFaellig(C.timeout)).toBe(true);
      expect(nachsetzenFaellig(C.timeout + 5)).toBe(true);
    });
  });

  describe('spawnRundum (nah um den Spieler)', () => {
    it('platziert relativ zur Spielerposition (Offset, nicht Absolutpunkt)', () => {
      const p = spawnRundum(100, 200, () => 0.5);
      const d = Math.hypot(p.x - 100, p.z - 200);
      expect(d).toBeGreaterThanOrEqual(C.distMin - 1e-6);
      expect(d).toBeLessThanOrEqual(C.distMin + C.distSpanne + 1e-6);
    });

    it('Distanz immer im Ring [distMin, distMin+distSpanne]', () => {
      for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
        const p = spawnRundum(0, 0, () => r);
        const d = Math.hypot(p.x, p.z);
        expect(d).toBeGreaterThanOrEqual(C.distMin - 1e-6);
        expect(d).toBeLessThanOrEqual(C.distMin + C.distSpanne + 1e-6);
      }
    });

    it('verteilt rundum (verschiedene Winkel je rng)', () => {
      // rng-Sequenz: erster Wert = Winkel-Anteil, zweiter = Radius
      const mk = (a: number) => { let i = 0; return () => (i++ === 0 ? a : 0.5); };
      const ost = spawnRundum(0, 0, mk(0));      // Winkel 0 → +x
      const nord = spawnRundum(0, 0, mk(0.25));  // Winkel π/2 → +z
      expect(ost.x).toBeGreaterThan(0);
      expect(ost.z).toBeCloseTo(0);
      expect(nord.z).toBeGreaterThan(0);
      expect(nord.x).toBeCloseTo(0);
    });
  });
});
