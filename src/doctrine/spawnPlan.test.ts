import { describe, it, expect } from 'vitest';
import { planSwarm, pickWeighted, type SwarmDirection, NEUTRAL_TYPES } from './spawnPlan';

const tuning = { base: () => 4, perHeat: () => 0.1 };
// typesByStufe wie in den Configs: kumulativ, Stufe 0 = []
const tbs = (a: string, b: string, c: string): string[][] => [[], [a], [a, b], [a, b, c]];

const dir = (id: string, heat: number, stufe: number, t = tbs('x', 'y', 'z')): SwarmDirection =>
  ({ id, heat, stufe, typesByStufe: t });

describe('planSwarm', () => {
  it('Dichte = Grundwert bei kalter Lage, wächst mit der Heat-Summe', () => {
    const cold = planSwarm([dir('a', 0, 0)], tuning);
    expect(cold.targetCount).toBe(4); // nur base
    const hot = planSwarm([dir('a', 80, 2), dir('b', 80, 2)], tuning);
    expect(hot.targetCount).toBe(4 + Math.round(160 * 0.1)); // 4 + 16
  });

  it('kalte Lage → neutraler Grund-Mix (von allem etwas)', () => {
    const p = planSwarm([dir('a', 0, 0)], tuning);
    expect(Object.keys(p.weights).sort()).toEqual([...NEUTRAL_TYPES].sort());
  });

  it('heiße Richtung → nur ihre Typen im Mix', () => {
    const p = planSwarm([dir('nebel', 75, 2, tbs('closer', 'flanker', 'swarm'))], tuning);
    expect(Object.keys(p.weights).sort()).toEqual(['closer', 'flanker']); // Stufe 2 → [t1,t2]
  });

  it('Stufe wählt das Typ-Set (Stufe 1 nur t1, Stufe 3 t1..t3)', () => {
    const lo = planSwarm([dir('a', 40, 1, tbs('c', 'f', 's'))], tuning);
    expect(Object.keys(lo.weights)).toEqual(['c']);
    const hi = planSwarm([dir('a', 90, 3, tbs('c', 'f', 's'))], tuning);
    expect(Object.keys(hi.weights).sort()).toEqual(['c', 'f', 's']);
  });

  it('mehrere heiße Richtungen → gemischter Schwarm, heißere bekommt mehr Gewicht', () => {
    const p = planSwarm([
      dir('nebel', 90, 1, tbs('closer', '_', '_')),
      dir('belagerung', 30, 1, tbs('disruptor', '_', '_')),
    ], tuning);
    expect(Object.keys(p.weights).sort()).toEqual(['closer', 'disruptor']);
    expect(p.weights.closer!).toBeGreaterThan(p.weights.disruptor!); // 90 > 30
  });

  it('Tuning-Getter steuern Grunddichte/Skalierung (Regler)', () => {
    const p = planSwarm([dir('a', 100, 1)], { base: () => 10, perHeat: () => 0.5 });
    expect(p.targetCount).toBe(10 + 50);
  });
});

describe('pickWeighted', () => {
  it('liefert Typen anteilig zu ihrem Gewicht', () => {
    const w = { a: 1, b: 3 }; // a=25%, b=75%
    expect(pickWeighted(w, 0.0)).toBe('a');
    expect(pickWeighted(w, 0.2)).toBe('a'); // < 0.25
    expect(pickWeighted(w, 0.3)).toBe('b'); // ≥ 0.25
    expect(pickWeighted(w, 0.99)).toBe('b');
  });

  it('leeres/0-Gewicht → null', () => {
    expect(pickWeighted({}, 0.5)).toBeNull();
    expect(pickWeighted({ a: 0 }, 0.5)).toBeNull();
  });
});
