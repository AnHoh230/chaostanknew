/**
 * Gate 8 — Run-Telemetrie (Spec 5 §12). Reiner Zustand, kein Engine-Bezug.
 * Misst, was die Balance braucht: geglättete Roh-Impulsrate (EWMA, füttert auch den
 * `normalisiert`-Modus), Zeit bis zu den Häutungs-Meilensteinen, Finisher-Nutzung + Ø-BoardScore.
 * „Ohne Telemetrie keine Balance-Änderung." (Spec 5 §12 Gate 8)
 */
import { NORMALIZE_WINDOW_SECONDS } from './evolutionTuning';

export type Meilenstein =
  | 'kompassFrei' | 'polLvl5' | 'paarMax' | 'ersterBauplan' | 'ersterFinisher'
  | 'finisherVerhaertet' | 'evolution' | 'fusionPreview' | 'fusionPhase' | 'systemform';

const MEILENSTEINE: readonly Meilenstein[] = [
  'kompassFrei', 'polLvl5', 'paarMax', 'ersterBauplan', 'ersterFinisher',
  'finisherVerhaertet', 'evolution', 'fusionPreview', 'fusionPhase', 'systemform',
];

export interface RunTelemetry {
  zeit: number; // s seit Run-Start (intern hochgezählt)
  meilenstein: Record<Meilenstein, number | null>; // s-Zeitpunkt oder null (noch nicht erreicht)
  accImpulse: number; // Leck-Integrator über NORMALIZE_WINDOW_SECONDS
  ewmaRaw: number; // geglättete Roh-Impulse pro Minute
  rawGesamt: number;
  finisherZuendungen: number;
  finisherWirksam: number;
  boardSumme: number; // für Ø-BoardScore bei Zündung
  boardAnzahl: number;
}

export function createRunTelemetry(): RunTelemetry {
  const m = {} as Record<Meilenstein, number | null>;
  for (const k of MEILENSTEINE) m[k] = null;
  return { zeit: 0, meilenstein: m, accImpulse: 0, ewmaRaw: 0, rawGesamt: 0, finisherZuendungen: 0, finisherWirksam: 0, boardSumme: 0, boardAnzahl: 0 };
}

/** Pro Frame: Zeit + Roh-Impulse dieses Frames. Leck-Integrator → stabile Impulse/min (kein /dt). */
export function tickTelemetry(t: RunTelemetry, dt: number, rawImpulse: number): void {
  if (dt <= 0) return;
  t.zeit += dt;
  t.accImpulse = t.accImpulse * Math.exp(-dt / NORMALIZE_WINDOW_SECONDS) + rawImpulse;
  t.ewmaRaw = (t.accImpulse * 60) / NORMALIZE_WINDOW_SECONDS;
  t.rawGesamt += rawImpulse;
}

/** Meilenstein einmalig stempeln (idempotent — erste Erreichung zählt). */
export function markMeilenstein(t: RunTelemetry, m: Meilenstein): void {
  if (t.meilenstein[m] === null) t.meilenstein[m] = +t.zeit.toFixed(1);
}

/** Eine Finisher-Zündung verbuchen (wirksam + BoardScore für den Durchschnitt). */
export function zaehleFinisher(t: RunTelemetry, wirksam: boolean, boardScore: number): void {
  t.finisherZuendungen += 1;
  if (wirksam) { t.finisherWirksam += 1; t.boardSumme += boardScore; t.boardAnzahl += 1; }
}

export function avgBoardScore(t: RunTelemetry): number {
  return t.boardAnzahl > 0 ? t.boardSumme / t.boardAnzahl : 0;
}
