import { ACTIONS, type AiAction, type AiWorldView, type TraitProfile } from './aiTypes';

const ENGAGE_RANGE = 30; // ab hier zählt ein Ziel als "nah genug"
const HOME_RANGE = 25; // ab dieser Revier-Entfernung zieht es zurück

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Welt-abgeleitete passung-Terme (0..1), aus denen sich die Aktions-Scores bauen. */
export interface Passung {
  gelegenheit: number; // nahes, sichtbares Ziel = Chance
  gefahr: number; // verletzt + Ziel präsent = Gefahr
  revierZug: number; // weit vom Revier = Rückzugsdruck
}

export function passung(w: AiWorldView): Passung {
  const sichtbar = w.targetVisible ? 1 : 0;
  const gelegenheit = sichtbar * clamp01(1 - w.distance / ENGAGE_RANGE);
  const gefahr = sichtbar * (1 - clamp01(w.selfHpFrac));
  const revierZug = clamp01(w.homeDistance / HOME_RANGE);
  return { gelegenheit, gefahr, revierZug };
}

/** score(option) = Σ traitᵢ · passungᵢ(weltzustand) (Spec 7.1). */
export function scoreAction(action: AiAction, t: TraitProfile, w: AiWorldView): number {
  const p = passung(w);
  switch (action) {
    case 'annähern':
      return t.mut * p.gelegenheit + t.gier * w.lootValue * p.gelegenheit + t.stolz * 0.3 * p.gelegenheit - t.vorsicht * p.gefahr;
    case 'fliehen':
      return t.vorsicht * p.gefahr + (1 - t.mut) * 0.6 * p.gefahr;
    case 'Revier_halten':
      return t.stolz * p.revierZug + t.vorsicht * 0.2 * p.revierZug;
    case 'looten':
      return t.gier * w.lootValue * 0.5 * p.gelegenheit;
    case 'anwerben':
      return t.geselligkeit * clamp01(1 - w.groupSize / 3) * 0.3;
    case 'sich_aufrüsten':
      return t.fortschrittsdrang * w.lootValue * 0.25;
    case 'Ziel_wählen':
      return t.mut * 0.15; // niedriger Grundpegel, damit immer etwas gewählt wird
    case 'einkaufen':
      return 0; // im Slice kein Shop in der Welt
  }
}

/**
 * Höchstbewertete Aktion (mit etwas Seed-Rauschen). rng() liefert 0..1.
 * noiseAmp=0 macht die Wahl deterministisch (für Tests).
 */
export function chooseAction(
  t: TraitProfile,
  w: AiWorldView,
  rng: () => number,
  noiseAmp = 0,
): AiAction {
  let best: AiAction = 'Ziel_wählen';
  let bestScore = -Infinity;
  for (const a of ACTIONS) {
    const s = scoreAction(a, t, w) + (noiseAmp > 0 ? (rng() - 0.5) * noiseAmp : 0);
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }
  return best;
}
