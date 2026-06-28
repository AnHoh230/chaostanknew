import { describe, it, expect } from 'vitest';
import { rampeAusgeloest, sprungBogen, sprungFertig } from './secret';
import { MAP_TUNING } from './mapTuning';

describe('Secret-Rampe (Phase 6)', () => {
  it('löst erst ab der Schub-Schwelle aus', () => {
    const s = MAP_TUNING.rampenSchubSchwelle;
    expect(rampeAusgeloest(s - 0.1)).toBe(false);
    expect(rampeAusgeloest(s)).toBe(true);
    expect(rampeAusgeloest(s + 5)).toBe(true);
  });

  it('Sprung-Bogen: Start bei t=0, Ziel bei t=dauer, Scheitel in der Mitte', () => {
    const start = { x: 0, z: 0 };
    const ziel = { x: 10, z: 4 };
    const dauer = 1;
    const hoehe = 12;

    const a = sprungBogen(0, dauer, start, ziel, hoehe);
    expect(a.x).toBeCloseTo(0);
    expect(a.z).toBeCloseTo(0);
    expect(a.y).toBeCloseTo(0);

    const b = sprungBogen(dauer, dauer, start, ziel, hoehe);
    expect(b.x).toBeCloseTo(10);
    expect(b.z).toBeCloseTo(4);
    expect(b.y).toBeCloseTo(0);

    const m = sprungBogen(dauer / 2, dauer, start, ziel, hoehe);
    expect(m.x).toBeCloseTo(5);
    expect(m.z).toBeCloseTo(2);
    expect(m.y).toBeCloseTo(hoehe); // Scheitel
  });

  it('clamped: t über dauer bleibt am Ziel', () => {
    const p = sprungBogen(99, 1, { x: 0, z: 0 }, { x: 6, z: 0 }, 10);
    expect(p.x).toBeCloseTo(6);
    expect(p.y).toBeCloseTo(0);
  });

  it('sprungFertig ab Dauer', () => {
    expect(sprungFertig(0.9, 1)).toBe(false);
    expect(sprungFertig(1, 1)).toBe(true);
  });
});
