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
  it('startet dünn (nur Allrounder) und wird über die Zeit mehr, gemischter, stärker', () => {
    const w0 = gegnerWelle(0);
    expect(w0.targetCount).toBe(4);
    expect(Object.keys(w0.weights)).toEqual(['allrounder']);
    const wLate = gegnerWelle(500);
    expect(wLate.targetCount).toBeGreaterThan(w0.targetCount);
    expect(Object.keys(wLate.weights).length).toBeGreaterThan(1);
    expect(wLate.level).toBeGreaterThan(w0.level);
  });
  it('targetCount ist gedeckelt (rennt nicht ins Unendliche)', () => {
    expect(gegnerWelle(99999).targetCount).toBeLessThanOrEqual(24);
  });
  it('Schwarm + Brocken erscheinen gestaffelt (Schwarm vor Brocken)', () => {
    expect(gegnerWelle(100).weights.swarm).toBeUndefined(); // frühe Phase: nur Allrounder/Läufer
    expect(gegnerWelle(200).weights.swarm).toBeGreaterThan(0); // Schwarm-Phase
    expect(gegnerWelle(200).weights.bunker).toBeUndefined(); // Brocken noch nicht
    expect(gegnerWelle(300).weights.bunker).toBeGreaterThan(0); // Brocken-Phase
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
