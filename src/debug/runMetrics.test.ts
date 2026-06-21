import { describe, it, expect } from 'vitest';
import { createRunMetrics, type MetricsState } from './runMetrics';

const state = (over: Partial<MetricsState> = {}): MetricsState => ({
  alive: 5, target: 8, hp: 80, hpMax: 100, geld: 100, level: 1, mk: 1,
  heat: { nebel: 50 }, mix: { closer: 3 }, ...over,
});

describe('createRunMetrics', () => {
  it('rechnet Raten pro Intervall (DPS, Trefferquote, Ø-Tempo)', () => {
    const m = createRunMetrics();
    // 2 s vergehen, Tempo 4
    for (let i = 0; i < 20; i++) m.frame(0.1, 4, 5);
    m.onShot(); m.onShot(); m.onShot(); m.onShot(); // 4 Schüsse
    m.onHitDealt(10); m.onHitDealt(10); // 2 Treffer, 20 Schaden
    m.onDamageTaken(30); // 30 erlitten
    const s = m.takeSnapshot(state());
    expect(s.t).toBe(2);
    expect(s.spd).toBe(4);
    expect(s.dpsOut).toBe(10); // 20 / 2 s
    expect(s.dpsIn).toBe(15); // 30 / 2 s
    expect(s.acc).toBe(50); // 2/4 Treffer
  });

  it('Peak-Gegnerzahl + Spawns je Intervall', () => {
    const m = createRunMetrics();
    m.frame(0.1, 0, 3); m.frame(0.1, 0, 12); m.frame(0.1, 0, 7);
    m.onSpawn(); m.onSpawn();
    const s = m.takeSnapshot(state({ alive: 7 }));
    expect(s.peak).toBe(12);
    expect(s.spawns).toBe(2);
  });

  it('Tod setzt Überlebenszeit zurück, deaths kumulieren; kpm kumuliert', () => {
    const m = createRunMetrics();
    for (let i = 0; i < 100; i++) m.frame(0.1, 1, 1); // 10 s
    m.onKill(); m.onKill(); // 2 Kills in 10 s → 12 kpm
    m.onDeath();
    for (let i = 0; i < 30; i++) m.frame(0.1, 1, 1); // 3 s nach Tod
    const s = m.takeSnapshot(state());
    expect(s.deaths).toBe(1);
    expect(s.surv).toBe(3); // seit dem Tod
    expect(s.kpm).toBe(9.2); // 2 Kills / 13 s * 60 = 9.23 → 9.2
  });

  it('Intervall-Zähler werden nach Snapshot zurückgesetzt', () => {
    const m = createRunMetrics();
    for (let i = 0; i < 10; i++) m.frame(0.1, 5, 4);
    m.onShot(); m.onHitDealt(5);
    m.takeSnapshot(state());
    // zweites Intervall ohne Aktion
    for (let i = 0; i < 10; i++) m.frame(0.1, 0, 4);
    const s2 = m.takeSnapshot(state());
    expect(s2.dpsOut).toBe(0);
    expect(s2.acc).toBe(0);
    expect(s2.spd).toBe(0);
  });

  it('Pause-Frames (dt<=0) zählen nicht', () => {
    const m = createRunMetrics();
    m.frame(0, 99, 4); m.frame(-1, 99, 4);
    const s = m.takeSnapshot(state());
    expect(s.t).toBe(0);
    expect(s.spd).toBe(0);
  });
});
