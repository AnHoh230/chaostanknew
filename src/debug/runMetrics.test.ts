import { describe, it, expect } from 'vitest';
import { createRunMetrics, type MetricsState } from './runMetrics';

const state = (over: Partial<MetricsState> = {}): MetricsState => ({
  alive: 5, target: 8, hp: 80, hpMax: 100, geld: 100, level: 1, mk: 1, px: 0, pz: 0,
  heat: { nebel: 50 }, mix: { closer: 3 }, ...over,
});

describe('createRunMetrics', () => {
  it('rechnet Raten pro Intervall (DPS, Trefferquote, Ø-Tempo, Schussrate)', () => {
    const m = createRunMetrics();
    for (let i = 0; i < 20; i++) m.frame(0.1, 4, 5); // 2 s, Tempo 4
    m.onShot(); m.onShot(); m.onShot(); m.onShot();
    m.onHitDealt(10); m.onHitDealt(10);
    m.onDamageTaken(30);
    const s = m.takeSnapshot(state());
    expect(s.t).toBe(2);
    expect(s.spd).toBe(4);
    expect(s.dpsOut).toBe(10);
    expect(s.dpsIn).toBe(15);
    expect(s.acc).toBe(50);
    expect(s.shots).toBe(4);
    expect(s.sps).toBe(2); // 4 Schüsse / 2 s
  });

  it('Position landet im Snapshot (wo wird gekämpft)', () => {
    const m = createRunMetrics();
    m.frame(0.1, 0, 0);
    const s = m.takeSnapshot(state({ px: 42.7, pz: -13.2 }));
    expect(s.px).toBe(43);
    expect(s.pz).toBe(-13);
  });

  it('pro Typ: gespawnt, gekillt, Ø-Lebensdauer, Schaden am Spieler', () => {
    const m = createRunMetrics();
    m.frame(1, 0, 2);
    m.onSpawn('closer'); m.onSpawn('closer'); m.onSpawn('flanker');
    m.onKill('closer', 8); m.onKill('closer', 12); // Ø 10 s
    m.onDamageTaken(20, 'flanker'); m.onDamageTaken(10, 'flanker');
    const s = m.takeSnapshot(state({ mix: { closer: 1, flanker: 1 } }));
    expect(s.types.closer).toMatchObject({ n: 1, sp: 2, k: 2, life: 10, dmg: 0 });
    expect(s.types.flanker).toMatchObject({ n: 1, sp: 1, k: 0, dmg: 30 });
  });

  it('lastDamager merkt sich den letzten Schädiger-Typ (Tod-Ursache)', () => {
    const m = createRunMetrics();
    m.onDamageTaken(5, 'closer');
    m.onDamageTaken(5, 'disruptor');
    expect(m.lastDamager()).toBe('disruptor');
  });

  it('Peak + Spawns je Intervall; Tod setzt Überlebenszeit zurück', () => {
    const m = createRunMetrics();
    m.frame(0.1, 0, 3); m.frame(0.1, 0, 12); m.frame(0.1, 0, 7);
    m.onSpawn('closer'); m.onSpawn('swarm');
    m.onKill('closer', 2); m.onDeath();
    for (let i = 0; i < 30; i++) m.frame(0.1, 1, 1);
    const s = m.takeSnapshot(state({ alive: 7 }));
    expect(s.peak).toBe(12);
    expect(s.spawns).toBe(2);
    expect(s.deaths).toBe(1);
    expect(s.surv).toBe(3);
  });

  it('Intervall-Raten werden zurückgesetzt (acc/Typ-Summen bleiben kumulativ)', () => {
    const m = createRunMetrics();
    for (let i = 0; i < 10; i++) m.frame(0.1, 5, 4);
    m.onShot(); m.onHitDealt(5); m.onSpawn('closer');
    m.takeSnapshot(state());
    for (let i = 0; i < 10; i++) m.frame(0.1, 0, 4);
    const s2 = m.takeSnapshot(state());
    expect(s2.dpsOut).toBe(0);
    expect(s2.spd).toBe(0);
    expect(s2.shots).toBe(0);
    expect(s2.acc).toBe(100); // kumulativ: 1/1
    expect(s2.types.closer.sp).toBe(1); // kumulativ
  });

  it('Pause-Frames (dt<=0) zählen nicht', () => {
    const m = createRunMetrics();
    m.frame(0, 99, 4); m.frame(-1, 99, 4);
    const s = m.takeSnapshot(state());
    expect(s.t).toBe(0);
    expect(s.spd).toBe(0);
  });
});
