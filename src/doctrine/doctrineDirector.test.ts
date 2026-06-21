import { describe, it, expect } from 'vitest';
import { createDoctrineDirector, type DoctrineDirector } from './doctrineDirector';
import { DOCTRINES } from './doctrineConfig';
import { emptyProfile, type PlayerStyleProfile } from './styleProfile';

const empty = emptyProfile();
const sniper: PlayerStyleProfile = { ...empty, longRangeKillRatio: 0.7 }; // → nebel (Distanz)
const rush: PlayerStyleProfile = { ...empty, closeRangeKillRatio: 0.7, avgSpeed: 10 }; // → sperrkrieg

const heatOf = (d: DoctrineDirector, id: string) => d.states().find((s) => s.id === id)!.heat;
const stufeOf = (d: DoctrineDirector, id: string) => d.states().find((s) => s.id === id)!.stufe;

describe('DoctrineDirector (Schwarm-Heat pro Richtung)', () => {
  it('genutzte Richtung heizt schnell, Stufe steigt', () => {
    const d = createDoctrineDirector(DOCTRINES);
    for (let i = 0; i < 3; i++) d.evaluate(sniper); // 25 → 50 → 75
    expect(heatOf(d, 'nebel')).toBe(75);
    expect(stufeOf(d, 'nebel')).toBe(2); // 75 ≥ 60 (Band 2)
  });

  it('ungenutzte Richtung kühlt nur langsam (asymmetrisch)', () => {
    const d = createDoctrineDirector(DOCTRINES);
    for (let i = 0; i < 3; i++) d.evaluate(sniper); // nebel = 75
    d.evaluate(rush); // 1 Puls Rush: sperrkrieg +25, nebel nur −5
    expect(heatOf(d, 'sperrkrieg')).toBe(25);
    expect(heatOf(d, 'nebel')).toBe(70); // nicht zurück auf 0 — kühlt langsam
  });

  it('mehrere Richtungen gleichzeitig heiß — keine Deckelung (kein single-active)', () => {
    const d = createDoctrineDirector(DOCTRINES);
    for (let i = 0; i < 3; i++) d.evaluate(sniper); // nebel = 75
    for (let i = 0; i < 3; i++) d.evaluate(rush); // sperrkrieg 25→50→75, nebel 70→65→60
    expect(stufeOf(d, 'sperrkrieg')).toBeGreaterThanOrEqual(2);
    expect(stufeOf(d, 'nebel')).toBeGreaterThanOrEqual(2);
    const hot = d.states().filter((s) => s.stufe >= 2);
    expect(hot.length).toBe(2); // beide gleichzeitig hoch — nichts wird gedeckelt
  });

  it('ohne Stil-Signal bleiben alle kalt (Decay klemmt bei 0)', () => {
    const d = createDoctrineDirector(DOCTRINES);
    for (let i = 0; i < 5; i++) d.evaluate(empty);
    expect(d.states().every((s) => s.heat === 0 && s.stufe === 0)).toBe(true);
  });

  it('Heat-Anstieg/Decay/Bänder kommen aus der Tuning-Quelle (Regler)', () => {
    const d = createDoctrineDirector(DOCTRINES, {
      heatStrong: () => 50, heatMid: () => 30, heatLight: () => 10,
      decay: () => 20, bands: () => [10, 20, 40],
    });
    d.evaluate(sniper); // strong → +50
    expect(heatOf(d, 'nebel')).toBe(50);
    expect(stufeOf(d, 'nebel')).toBe(3); // 50 ≥ 40 (eigene Bänder)
    d.evaluate(empty); // decay 20 → 30
    expect(heatOf(d, 'nebel')).toBe(30);
  });

  it('jede Richtung hat 4 Stufen-Typsets (0..3)', () => {
    for (const c of DOCTRINES) {
      expect(c.enemyTypesByStufe).toHaveLength(4);
      expect(c.enemyTypesByStufe[0]).toEqual([]); // Stufe 0 = keine Sonder-Typen
      expect(c.enemyTypesByStufe[3]!.length).toBeGreaterThan(0);
    }
  });
});
