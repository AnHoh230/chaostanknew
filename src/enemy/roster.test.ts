import { describe, it, expect } from 'vitest';
import { ROSTER, DEFAULT_ESCALATION, scaleStats } from './roster';

describe('ROSTER', () => {
  it('hat genau die drei aktiven Sniper-Typen', () => {
    expect(Object.keys(ROSTER).sort()).toEqual(['allrounder', 'bunker', 'racer']);
  });

  it('allrounder stirbt bei Heat 0 an einem Sniper-Schuss (60 < 36*2)', () => {
    expect(ROSTER.allrounder!.hp).toBeLessThan(36 * 2);
  });

  it('bunker ist langsamer als der Spieler (12) und hält massiv mehr aus als allrounder', () => {
    expect(ROSTER.bunker!.speed).toBeLessThan(12);
    expect(ROSTER.bunker!.hp).toBeGreaterThan(ROSTER.allrounder!.hp * 3);
    expect(ROSTER.bunker!.damage).toBeGreaterThan(ROSTER.allrounder!.damage * 2);
  });

  it('racer ist schneller als allrounder', () => {
    expect(ROSTER.racer!.speed).toBeGreaterThan(ROSTER.allrounder!.speed);
  });
});

describe('scaleStats', () => {
  it('Stufe 0 = unverändert', () => {
    const s = scaleStats(ROSTER.allrounder!, 0, DEFAULT_ESCALATION);
    expect(s.hp).toBe(ROSTER.allrounder!.hp);
    expect(s.speed).toBe(ROSTER.allrounder!.speed);
    expect(s.damage).toBe(ROSTER.allrounder!.damage);
  });

  it('höhere Stufe = mehr HP/Tempo/Schaden (monoton)', () => {
    const s1 = scaleStats(ROSTER.allrounder!, 1, DEFAULT_ESCALATION);
    const s3 = scaleStats(ROSTER.allrounder!, 3, DEFAULT_ESCALATION);
    expect(s1.hp).toBeGreaterThan(ROSTER.allrounder!.hp);
    expect(s3.hp).toBeGreaterThan(s1.hp);
    expect(s3.speed).toBeGreaterThan(s1.speed);
    expect(s3.damage).toBeGreaterThan(s1.damage);
  });

  it('lootValue bleibt stufen-unabhängig', () => {
    expect(scaleStats(ROSTER.bunker!, 3, DEFAULT_ESCALATION).lootValue).toBe(ROSTER.bunker!.lootValue);
  });
});
