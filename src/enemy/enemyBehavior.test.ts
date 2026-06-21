import { describe, it, expect } from 'vitest';
import { behaviorTarget, type BehaviorInput } from './enemyBehavior';
import { ENEMY_TYPES } from './enemyTypes';
import { DOCTRINES } from '../doctrine/doctrineConfig';

const base: BehaviorInput = { ex: 30, ez: 0, px: 0, pz: 0, pvx: 0, pvz: 0, standoff: 40, phase: 0.2 };
const distToPlayer = (o: { tx: number; tz: number }, px = 0, pz = 0) => Math.hypot(o.tx - px, o.tz - pz);

describe('Gegner-Verhalten (reine Muster)', () => {
  it('closer steuert direkt auf den Spieler und hält erst nah', () => {
    const o = behaviorTarget('closer', base);
    expect(o.tx).toBe(0); expect(o.tz).toBe(0);
    expect(o.standoff).toBeLessThan(base.standoff); // näher als ein Sniper es will
  });

  it('disruptor stürmt am dichtesten ran und ist der schnellste Typ', () => {
    const o = behaviorTarget('disruptor', base);
    const c = behaviorTarget('closer', base);
    expect(o.standoff).toBeLessThan(c.standoff); // näher als der closer
    expect(o.speedMul).toBeGreaterThan(c.speedMul);
  });

  it('flanker zielt NICHT direkt auf den Spieler, sondern auf einen Orbit-Radius', () => {
    const o = behaviorTarget('flanker', base);
    expect(distToPlayer(o)).toBeCloseTo(base.standoff * 0.85, 5); // fester Orbit-Radius
    expect(o.tx === 0 && o.tz === 0).toBe(false);
  });

  it('flanker-Richtung hängt von der Phase ab (umkreist beidseitig)', () => {
    const a = behaviorTarget('flanker', { ...base, phase: 0.1 });
    const b = behaviorTarget('flanker', { ...base, phase: 0.9 });
    expect(a.tz).not.toBe(b.tz); // gegenläufiger Orbit
  });

  it('swarm konvergiert nah am Spieler, langsamer als closer', () => {
    const o = behaviorTarget('swarm', base);
    const c = behaviorTarget('closer', base);
    expect(distToPlayer(o)).toBeLessThanOrEqual(base.standoff * 0.4 + 1e-9);
    expect(o.speedMul).toBeLessThan(c.speedMul);
  });

  it('blocker stellt sich VOR den Spieler entlang seiner Bewegung', () => {
    const o = behaviorTarget('blocker', { ...base, pvx: 5, pvz: 0 }); // Spieler fährt +x
    expect(o.tx).toBeGreaterThan(0); // Ziel liegt in Fahrtrichtung vor dem Spieler
    expect(o.tz).toBeCloseTo(0, 5);
  });

  it('blocker ohne Spielerbewegung fällt auf direktes Annähern zurück', () => {
    const o = behaviorTarget('blocker', { ...base, pvx: 0, pvz: 0 });
    expect(o.tx).toBe(0); expect(o.tz).toBe(0);
  });

  it('racer stürmt direkt auf den Spieler und ist sehr schnell', () => {
    const o = behaviorTarget('racer', base);
    expect(o.tx).toBe(base.px); expect(o.tz).toBe(base.pz); // Ziel = Spieler
    expect(o.speedMul).toBeGreaterThan(2); // schneller als alle anderen Defaults
  });

  it('Tuning-Getter überschreiben Tempo/Orbit (Regler)', () => {
    const o = behaviorTarget('flanker', base, {
      closerSpeed: () => 1, flankerSpeed: () => 3, swarmSpeed: () => 1,
      disruptorSpeed: () => 1, blockerSpeed: () => 1, racerSpeed: () => 1, flankerOrbit: () => 0.5, blockerLead: () => 10,
    });
    expect(o.speedMul).toBe(3);
    expect(distToPlayer(o)).toBeCloseTo(base.standoff * 0.5, 5);
  });
});

describe('Gegner-Typ-Register', () => {
  it('jeder Typ hat Verhalten + Optik', () => {
    for (const t of Object.values(ENEMY_TYPES)) {
      expect(t.behavior).toBeTruthy();
      expect(t.comp.chassis).toBeTruthy();
    }
  });

  it('alle in den Richtungen referenzierten Typ-IDs existieren im Register', () => {
    const referenced = new Set(DOCTRINES.flatMap((d) => d.enemyTypesByStufe.flat()));
    for (const id of referenced) expect(ENEMY_TYPES[id], `Typ ${id} fehlt im Register`).toBeTruthy();
  });
});
