/**
 * Schicht 1 — Bauprofile. Steuern, wie hart Evolution/Director laufen, je nachdem wie weit der
 * Loop trägt (Spec 4.7/5.1 §2.2, §17). Default LOOP_TEST, bis der Loop 5+ min stabil hält.
 *
 *  LOOP_TEST      Loop soll erst tragen → flache Schwellen, nur Stufe 1–3, Director nur Ambient.
 *  EVOLUTION_TEST Kompass/Form im 5–8-min-Run testen → Stufe 1–4, eine Hauptlinie ab 150 s.
 *  FULL_RUN       finaleres 10–12-min-Gefühl → Stufe 1–5, Director voll (aber nur Verhalten).
 */
export type TuningProfile = 'LOOP_TEST' | 'EVOLUTION_TEST' | 'FULL_RUN';

export interface DirectorCadence {
  pulseSec: number; // Abstand der Director-Pulse
  mainCounterFromSec: number | null; // ab wann eine Haupt-Gegenlinie erlaubt ist (null = nie)
  minorCounterAllowed: boolean;
  ambientAllowed: boolean;
}

export interface ProfileConfig {
  /** Gesamt-Fortschritt je Stufe; Länge = höchste erreichbare Stufe (Stufe n = thresholds[n-1]). */
  stageThresholds: readonly number[];
  director: DirectorCadence;
}

export const PROFILES: Record<TuningProfile, ProfileConfig> = {
  LOOP_TEST: {
    stageThresholds: [25, 70, 150], // Stufe 1–3
    director: { pulseSec: 30, mainCounterFromSec: null, minorCounterAllowed: false, ambientAllowed: true },
  },
  EVOLUTION_TEST: {
    stageThresholds: [35, 95, 190, 340], // Stufe 1–4
    director: { pulseSec: 25, mainCounterFromSec: 150, minorCounterAllowed: true, ambientAllowed: true },
  },
  FULL_RUN: {
    stageThresholds: [45, 125, 250, 430, 650], // Stufe 1–5
    director: { pulseSec: 20, mainCounterFromSec: 120, minorCounterAllowed: true, ambientAllowed: true },
  },
};

/** Höchste in diesem Profil erreichbare Stufe. */
export function maxStage(profile: TuningProfile): number {
  return PROFILES[profile].stageThresholds.length;
}

/** Schwelle (Gesamt-Fortschritt) für die nächste Stufe; null wenn diese Stufe im Profil nicht existiert. */
export function thresholdForStage(profile: TuningProfile, stage: number): number | null {
  const t = PROFILES[profile].stageThresholds;
  if (stage < 1 || stage > t.length) return null;
  return t[stage - 1]!;
}
