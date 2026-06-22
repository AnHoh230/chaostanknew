import { describe, it, expect } from 'vitest';
import { PROFILES, maxStage, thresholdForStage } from './profiles';

describe('PROFILES', () => {
  it('LOOP_TEST: Stufe 1–3, kein Hauptconter', () => {
    expect(maxStage('LOOP_TEST')).toBe(3);
    expect(PROFILES.LOOP_TEST.director.mainCounterFromSec).toBeNull();
    expect(PROFILES.LOOP_TEST.director.ambientAllowed).toBe(true);
  });

  it('EVOLUTION_TEST: Stufe 1–4, Hauptconter ab 150 s', () => {
    expect(maxStage('EVOLUTION_TEST')).toBe(4);
    expect(PROFILES.EVOLUTION_TEST.director.mainCounterFromSec).toBe(150);
  });

  it('FULL_RUN: Stufe 1–5, Director schneller (20 s) und früher (120 s)', () => {
    expect(maxStage('FULL_RUN')).toBe(5);
    expect(PROFILES.FULL_RUN.director.pulseSec).toBe(20);
    expect(PROFILES.FULL_RUN.director.mainCounterFromSec).toBe(120);
  });

  it('Schwellen sind je Profil streng steigend', () => {
    for (const p of Object.values(PROFILES)) {
      for (let i = 1; i < p.stageThresholds.length; i++) {
        expect(p.stageThresholds[i]!).toBeGreaterThan(p.stageThresholds[i - 1]!);
      }
    }
  });
});

describe('thresholdForStage', () => {
  it('liefert die Schwelle der Stufe, null außerhalb des Profils', () => {
    expect(thresholdForStage('LOOP_TEST', 1)).toBe(25);
    expect(thresholdForStage('LOOP_TEST', 3)).toBe(150);
    expect(thresholdForStage('LOOP_TEST', 4)).toBeNull(); // Stufe 4 in LOOP_TEST deaktiviert
    expect(thresholdForStage('FULL_RUN', 5)).toBe(650);
    expect(thresholdForStage('FULL_RUN', 0)).toBeNull();
  });
});
