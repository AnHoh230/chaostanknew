import { describe, it, expect } from 'vitest';
import { projectBlip } from './minimapMath';

describe('projectBlip', () => {
  it('Spieler-eigene Position landet in der Mitte', () => {
    const p = projectBlip(0, 0, 0, 0, 60, 160);
    expect(p.x).toBeCloseTo(80, 6);
    expect(p.y).toBeCloseTo(80, 6);
    expect(p.inRange).toBe(true);
  });

  it('+X (Osten) landet rechts, +Z (Norden) landet oben', () => {
    const ost = projectBlip(0, 0, 60, 0, 60, 160);
    expect(ost.x).toBeCloseTo(160, 6); // ganz rechts
    expect(ost.y).toBeCloseTo(80, 6);
    const nord = projectBlip(0, 0, 0, 60, 60, 160);
    expect(nord.y).toBeCloseTo(0, 6); // ganz oben
  });

  it('außerhalb der Reichweite wird inRange=false', () => {
    expect(projectBlip(0, 0, 100, 0, 60, 160).inRange).toBe(false);
  });

  it('relativ zum Spieler (Spieler verschoben)', () => {
    const p = projectBlip(10, 10, 10, 10, 60, 160);
    expect(p.x).toBeCloseTo(80, 6);
    expect(p.y).toBeCloseTo(80, 6);
  });
});
