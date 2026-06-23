import { describe, it, expect } from 'vitest';
import { buildStufe, gegnerWelle, gartenTypStats, pulkGroesse } from './gartenProgression';

describe('buildStufe', () => {
  it('startet bei 0 (Grundschuss) und steigt monoton: Z → ZZ → ZZZ → Verstärkung', () => {
    expect(buildStufe(0)).toBe(0);
    expect(buildStufe(24)).toBe(0);
    expect(buildStufe(25)).toBe(1); // Z
    expect(buildStufe(70)).toBe(2); // ZZ
    expect(buildStufe(130)).toBe(3); // ZZZ
    expect(buildStufe(210)).toBe(4); // Verstärkung
    expect(buildStufe(300)).toBe(5);
  });
});

describe('gegnerWelle', () => {
  it('startet sparsam (1 Panzer/Tick, langer Takt, nur Allrounder)', () => {
    const w0 = gegnerWelle(0);
    expect(w0.batch).toBe(1);
    expect(w0.interval).toBeGreaterThan(8);
    expect(Object.keys(w0.weights)).toEqual(['allrounder']);
    expect(w0.level).toBe(1);
  });
  it('eskaliert über die Zeit: Takt schrumpft, Batch wächst, Mix + Level steigen', () => {
    const early = gegnerWelle(0);
    const late = gegnerWelle(600);
    expect(late.interval).toBeLessThan(early.interval);
    expect(late.batch).toBeGreaterThan(early.batch);
    expect(Object.keys(late.weights).length).toBeGreaterThan(1);
    expect(late.level).toBeGreaterThan(early.level);
  });
  it('Takt fällt nicht unter ~1,5s (kein unendlicher Spawn-Sturm)', () => {
    expect(gegnerWelle(99999).interval).toBeGreaterThanOrEqual(1.5);
  });
  it('Schwarm + Brocken erscheinen gestaffelt (Schwarm vor Brocken)', () => {
    expect(gegnerWelle(120).weights.swarm).toBeUndefined(); // frühe Phase: nur Allrounder/Läufer
    expect(gegnerWelle(300).weights.swarm).toBeGreaterThan(0); // Schwarm-Phase
    expect(gegnerWelle(300).weights.bunker).toBeUndefined(); // Brocken noch nicht
    expect(gegnerWelle(450).weights.bunker).toBeGreaterThan(0); // Brocken-Phase
  });
});

describe('gartenTypStats', () => {
  it('Level 1 = Basiswerte des Typs', () => {
    expect(gartenTypStats('swarm', 1)).toEqual({ hp: 35, damage: 8, speed: 9 });
  });
  it('höheres Level = zäher + härter + schneller', () => {
    const l1 = gartenTypStats('allrounder', 1);
    const l4 = gartenTypStats('allrounder', 4);
    expect(l4.hp).toBeGreaterThan(l1.hp);
    expect(l4.damage).toBeGreaterThan(l1.damage);
    expect(l4.speed).toBeGreaterThan(l1.speed);
  });
  it('Brocken ist viel zäher als Schwarm', () => {
    expect(gartenTypStats('bunker', 1).hp).toBeGreaterThan(gartenTypStats('swarm', 1).hp * 3);
  });
});

describe('pulkGroesse', () => {
  it('Schwarm kommt als Pulk, der Rest einzeln', () => {
    expect(pulkGroesse('swarm')).toBeGreaterThan(1);
    expect(pulkGroesse('allrounder')).toBe(1);
    expect(pulkGroesse('bunker')).toBe(1);
  });
});
