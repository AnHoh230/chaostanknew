/**
 * Zentrale Tuning-Werte + reine Helfer für die Permanente Evolution (Spec 5 — Gates/Balance, Gate 0).
 * NUR Konstanten, Kostenfunktion, Pacing-Helfer und die umschaltbare Impuls-Politik.
 * KEIN State, KEIN Gameplay — alles rein & testbar. Quelle der Wahrheit fürs Tuning.
 */

// — Kompass-Ökonomie (Spec 5 §3) —
export const POL_MAX_LEVEL = 5;
export const KOMPASS_WACHSTUM = 1.25;
export const KOMPASS_BASIS = 14; // auf normalisiertes Ziel geeicht (30/min → ~7.5 min/Paar)
export const TARGET_PAIR_MINUTES = 7.5;
export const TARGET_IMPULSE_PER_MINUTE = 30;

// — Fuel (Spec 5 §5) —
export const POL_FUEL_CAP = 6;
export const FUEL_IMPULSE_COST = 10; // (effektive) Impulse je 1 Fuel, erst nach Pol-Max

// — Impuls-Politik (Spec 5 §4) —
export type ImpulsModus = 'roh' | 'normalisiert';
export const IMPULS_MODUS: ImpulsModus = 'roh'; // Start: Dopamin
export const NORMALIZE_WINDOW_SECONDS = 60;
export const IMPULSE_RATE_MIN_MULT = 0.35;
export const IMPULSE_RATE_MAX_MULT = 2.5;

// — Blueprints (Spec 5 §6) —
export const BLUEPRINT_SLOTS = 3;
export const FIRST_BLUEPRINT_PITY_SECONDS_AFTER_KOMPASS = 120;
export const RELEVANT_BLUEPRINT_PITY_SECONDS = 180;

// — BoardScore (Spec 5 §7) —
export const BOARD_WEIGHT_MARK = 1.0;
export const BOARD_WEIGHT_FIELD = 1.2;
export const BOARD_WEIGHT_POISON_STACK = 0.25;
export const BOARD_POISON_STACK_CAP = 8;
export const BOARD_WEIGHT_TWO_MATCHING_STATES = 2.0;
export const BOARD_WEIGHT_THREE_MATCHING_STATES = 5.0;
export const MIN_EFFECTIVE_BOARDSCORE_TIER_1 = 6;
export const MIN_EFFECTIVE_BOARDSCORE_TIER_2 = 10;
export const MIN_EFFECTIVE_BOARDSCORE_TIER_3 = 18;
/** Tier-Power-Kurve (Spec 5 §7): [base, max] für sqrt-Skalierung der Wucht. */
export const TIER_POWER: Readonly<Record<1 | 2 | 3, { base: number; max: number }>> = {
  1: { base: 1.0, max: 3.0 },
  2: { base: 2.0, max: 6.0 },
  3: { base: 4.0, max: 12.0 },
};

// — Finisher / Auto-Feuer / Edikt (Spec 5 §8–§11) —
export const FINISHER_EFFECTIVE_USES_TO_HARDEN = 8;
export const AUTO_FIRE_EVALUATION_SECONDS = 1.0;
export const EDIKT_DAUER_SECONDS = 6;
export const EDIKT_COOLDOWN_SECONDS = 30;
export const EDIKT_TICK_SECONDS = 0.75;
export const EDIKT_MAX_PULSES = 8;

// — Helfer: Kosten & Pacing (Spec 5 §3) —

/** Kosten, um von `levelIndex` auf `levelIndex+1` zu steigen: basis * wachstum^levelIndex. */
export function levelKosten(levelIndex: number, basis = KOMPASS_BASIS, wachstum = KOMPASS_WACHSTUM): number {
  return basis * Math.pow(wachstum, levelIndex);
}

/** Summe der Wachstums-Gewichte über alle Level (Default 8.20703125 für 5 Level / 1.25). */
export function summeGewichte(maxLevel = POL_MAX_LEVEL, wachstum = KOMPASS_WACHSTUM): number {
  let s = 0;
  for (let i = 0; i < maxLevel; i++) s += Math.pow(wachstum, i);
  return s;
}

/** Gesamtkosten, einen Pol von 0 auf maxLevel zu bringen (Default ~114.9 Impulse). */
export function polGesamtKosten(basis = KOMPASS_BASIS, maxLevel = POL_MAX_LEVEL, wachstum = KOMPASS_WACHSTUM): number {
  return basis * summeGewichte(maxLevel, wachstum);
}

/** Gesamtkosten für ein Pol-PAAR — zwei Pole gemaxt (Default ~229.8 Impulse). */
export function paarGesamtKosten(basis = KOMPASS_BASIS, maxLevel = POL_MAX_LEVEL, wachstum = KOMPASS_WACHSTUM): number {
  return 2 * polGesamtKosten(basis, maxLevel, wachstum);
}

/** Minuten bis ein Pol-Paar gemaxt ist, bei gegebener (effektiver) Impulsrate/min. */
export function paarMinuten(impulseProMin: number, basis = KOMPASS_BASIS): number {
  return paarGesamtKosten(basis) / impulseProMin;
}

/** Die Basis, die ein Pol-Paar in `zielMinuten` bei `impulseProMin` maxt (begründet die 14). */
export function basisFuerZiel(zielMinuten = TARGET_PAIR_MINUTES, impulseProMin = TARGET_IMPULSE_PER_MINUTE): number {
  return (zielMinuten * impulseProMin) / paarGesamtKosten(1);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Umschaltbare Impuls-Politik (Spec 5 §4). Der Kompass sieht NUR das Ergebnis, kennt den Modus nicht.
 * - 'roh':          effektiv = raw (mehr Kills → mehr Fortschritt, VS-Dopamin).
 * - 'normalisiert': raw × clamp(ziel/ewma, MIN, MAX) (verlässliche Zeit-Taktung).
 * EWMA 0 ist sicher (→ Multiplikator clamped auf MAX, kein NaN).
 */
export function effektiverImpuls(raw: number, ewmaRawProMin: number, modus: ImpulsModus = IMPULS_MODUS): number {
  if (modus === 'roh') return raw;
  const mult = clamp(TARGET_IMPULSE_PER_MINUTE / ewmaRawProMin, IMPULSE_RATE_MIN_MULT, IMPULSE_RATE_MAX_MULT);
  return raw * mult;
}
