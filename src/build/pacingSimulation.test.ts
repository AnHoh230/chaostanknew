import { describe, it, expect } from 'vitest';
import { simuliere, simuliereRampe } from './pacingSimulation';

describe('pacingSimulation (Gate 2, Spec 5 §4/§12)', () => {
  it('roh @30/min: erstes Pol-Paar ~7–8 min', () => {
    const r = simuliere(30, 'roh');
    expect(r.minutenBisPaarMax).toBeGreaterThanOrEqual(7);
    expect(r.minutenBisPaarMax).toBeLessThanOrEqual(8.5);
  });

  it('roh @30/min: Fuel für 8 T2-Zündungen ~5–6 min', () => {
    const r = simuliere(30, 'roh');
    expect(r.minutenBisFuelFuerHaertung).toBeGreaterThanOrEqual(5);
    expect(r.minutenBisFuelFuerHaertung).toBeLessThanOrEqual(6.5);
  });

  it('roh @100/min rauscht durch (< 3 min) — die Begründung für den Flip', () => {
    expect(simuliere(100, 'roh').minutenBisPaarMax).toBeLessThan(3);
  });

  it('normalisiert @100/min bleibt über 3 min (kein Durchrauschen)', () => {
    expect(simuliere(100, 'normalisiert').minutenBisPaarMax).toBeGreaterThan(3);
  });

  it('normalisiert @20/min wird nicht abgehängt (Boost schneller als roh@20)', () => {
    expect(simuliere(20, 'normalisiert').minutenBisPaarMax)
      .toBeLessThan(simuliere(20, 'roh').minutenBisPaarMax);
  });

  it('steigende Rate maxt das Paar in sinnvoller Zeit', () => {
    const m = simuliereRampe(20, 60, 'roh');
    expect(m).toBeGreaterThan(0);
    expect(m).toBeLessThan(12);
  });
});
