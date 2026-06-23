import { describe, it, expect } from 'vitest';
import { createHeatState, updateHeat, DEFAULT_HEAT_CFG, type HeatState } from './heatTracker';

const run = (s: HeatState, vx: number, vz: number, seconds: number, step = 0.1): HeatState => {
  let st = s;
  for (let t = 0; t < seconds; t += step) st = updateHeat(st, vx, vz, step);
  return st;
};

describe('updateHeat — Kessel (Stehenbleiben)', () => {
  it('steigt im Stand', () => {
    const s = run(createHeatState(), 0, 0, 10);
    expect(s.kessel).toBeGreaterThan(0.3);
    expect(s.faehrte).toBe(0); // Stehen treibt keine Fährte
  });

  it('fällt wieder, sobald man fährt (1:1-Ausgleich)', () => {
    const stood = run(createHeatState(), 0, 0, 10);
    const drove = run(stood, 12, 0, 10);
    expect(drove.kessel).toBeLessThan(stood.kessel);
  });
});

describe('updateHeat — Fährte (einseitiges Fahren)', () => {
  it('steigt bei geradlinigem Fahren', () => {
    const s = run(createHeatState(), 12, 0, 12);
    expect(s.faehrte).toBeGreaterThan(0.2);
    expect(s.kessel).toBe(0); // Fahren treibt keinen Kessel
  });

  it('bleibt niedrig bei ständigem Richtungswechsel (Schlangenlinie)', () => {
    let st = createHeatState();
    for (let i = 0; i < 120; i++) {
      const vx = i % 2 === 0 ? 12 : -12; // hin und her
      for (let k = 0; k < 5; k++) st = updateHeat(st, vx, 0, 0.1);
    }
    expect(st.faehrte).toBeLessThan(0.2);
  });

  it('fällt wieder, sobald man stehen bleibt (ein EINZELner 90°-Wechsel bleibt einseitig)', () => {
    const straight = run(createHeatState(), 12, 0, 12);
    const stopped = run(straight, 0, 0, 12);
    expect(stopped.faehrte).toBeLessThan(straight.faehrte);
  });
});

describe('updateHeat — Deckel & Robustheit', () => {
  it('überschreitet den Deckel nicht', () => {
    const s = run(createHeatState(), 0, 0, 120);
    expect(s.kessel).toBeLessThanOrEqual(DEFAULT_HEAT_CFG.max);
  });

  it('dt <= 0 lässt den Zustand unverändert', () => {
    const s = createHeatState();
    expect(updateHeat(s, 5, 5, 0)).toBe(s);
  });
});
