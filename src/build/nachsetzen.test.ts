import { describe, it, expect } from 'vitest';
import { nachsetzenFaellig, spawnImFahrtweg, DEFAULT_NACHSETZ as C } from './nachsetzen';

describe('Gegner-Nachsetzen (Rubberband-Ersatz)', () => {
  describe('nachsetzenFaellig', () => {
    it('erst ab dem Timeout fällig', () => {
      expect(nachsetzenFaellig(C.timeout - 0.1)).toBe(false);
      expect(nachsetzenFaellig(C.timeout)).toBe(true);
      expect(nachsetzenFaellig(C.timeout + 5)).toBe(true);
    });
  });

  describe('spawnImFahrtweg', () => {
    const rngMitte = () => 0.5; // kein Winkel-Offset, mittlere Distanz

    it('setzt den Gegner voraus in Fahrtrichtung (+x)', () => {
      const p = spawnImFahrtweg(0, 0, 10, 0, rngMitte);
      expect(p.x).toBeGreaterThan(0);
      expect(p.z).toBeCloseTo(0); // exakt in Fahrtrichtung bei rng 0.5
    });

    it('folgt der Fahrtrichtung (+z)', () => {
      const p = spawnImFahrtweg(0, 0, 0, 10, rngMitte);
      expect(p.z).toBeGreaterThan(0);
      expect(p.x).toBeCloseTo(0);
    });

    it('voraus relativ zur Spielerposition (Offset, nicht Absolutpunkt)', () => {
      const p = spawnImFahrtweg(100, 200, 10, 0, rngMitte);
      expect(p.x).toBeGreaterThan(100);
      expect(p.z).toBeCloseTo(200);
    });

    it('Distanz immer in [distMin, distMin+distSpanne]', () => {
      for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
        const p = spawnImFahrtweg(0, 0, 5, 5, () => r);
        const d = Math.hypot(p.x, p.z);
        expect(d).toBeGreaterThanOrEqual(C.distMin - 1e-6);
        expect(d).toBeLessThanOrEqual(C.distMin + C.distSpanne + 1e-6);
      }
    });

    it('bleibt im Streuungs-Fächer um die Fahrtrichtung (±streuung/2)', () => {
      const basis = 0; // Fahrtrichtung +x
      for (const r of [0, 1]) { // Winkel-Extreme
        const p = spawnImFahrtweg(0, 0, 10, 0, () => r);
        const ang = Math.atan2(p.z, p.x);
        expect(Math.abs(ang - basis)).toBeLessThanOrEqual(C.streuung / 2 + 1e-6);
      }
    });

    it('bei Stillstand (kein Tempo) trotzdem ein gültiger Punkt im Distanz-Ring', () => {
      const p = spawnImFahrtweg(0, 0, 0, 0, rngMitte);
      const d = Math.hypot(p.x, p.z);
      expect(d).toBeGreaterThanOrEqual(C.distMin - 1e-6);
      expect(d).toBeLessThanOrEqual(C.distMin + C.distSpanne + 1e-6);
    });
  });
});
