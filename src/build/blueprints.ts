/**
 * Gate 3 — Blueprint-Controller (Spec 5 §6). Reiner Zustand; Zufall wird als `rng: () => number`
 * INJIZIERT (deterministisch testbar). Baupläne sind die Tier-2/3-Finisher (Tier-1 sind bei Pol-Max
 * automatisch bekannt → kein Bauplan). Regeln: Gewichtung 60/25/15, Pity (erster + relevanter),
 * Duplikatschutz, Slot-Limit mit Replace-Pfad.
 *
 * Hinweis: Mit nur 3 Polen schneidet jedes Paar jede „Top-2" → es gibt im MVP faktisch keine
 * irrelevanten Baupläne (Klasse C bleibt leer). Die Maschinerie ist trotzdem vollständig (zukunftsfest
 * für Einzelpol-/mehr Baupläne) und fällt sauber zurück.
 */
import type { Pol } from './buildModell';
import { ALLE_POLE } from './buildModell';
import {
  BLUEPRINT_SLOTS, FIRST_BLUEPRINT_PITY_SECONDS_AFTER_KOMPASS, RELEVANT_BLUEPRINT_PITY_SECONDS,
} from './evolutionTuning';

export type BlueprintId = 'bombardement' | 'sporenfeld' | 'urteil' | 'systembruch';

export interface BlueprintDef {
  id: BlueprintId;
  bedarf: Pol[]; // welche Pole gemaxt sein müssen
}

export const BLUEPRINT_POOL: readonly BlueprintDef[] = [
  { id: 'bombardement', bedarf: ['befehl', 'raum'] },
  { id: 'sporenfeld', bedarf: ['raum', 'zustand'] },
  { id: 'urteil', bedarf: ['befehl', 'zustand'] },
  { id: 'systembruch', bedarf: ['befehl', 'raum', 'zustand'] },
];

export interface BlueprintState {
  besessen: BlueprintId[]; // in Slots (max BLUEPRINT_SLOTS)
  sekGesamt: number; // seit Kompass-Freischaltung
  sekSeitLetztemRelevanten: number;
  ersterGezogen: boolean;
}

export interface Angebot {
  id: BlueprintId;
  relevant: boolean;
}

export function createBlueprintState(): BlueprintState {
  return { besessen: [], sekGesamt: 0, sekSeitLetztemRelevanten: 0, ersterGezogen: false };
}

export function tickBlueprint(s: BlueprintState, dt: number): void {
  s.sekGesamt += dt;
  s.sekSeitLetztemRelevanten += dt;
}

/** Die zwei Pole mit höchstem Level (stabile Reihenfolge ALLE_POLE bei Gleichstand). */
function topZweiPole(polLevels: Record<Pol, number>): Pol[] {
  return [...ALLE_POLE].sort((a, b) => polLevels[b] - polLevels[a]).slice(0, 2);
}

/** Relevant = Bedarf enthält mind. einen der zwei höchsten Pole (Spec 5 §6). */
export function istRelevant(def: BlueprintDef, polLevels: Record<Pol, number>): boolean {
  const top = topZweiPole(polLevels);
  return def.bedarf.some((p) => top.includes(p));
}

/** Pity: erster Bauplan spätestens FIRST_BLUEPRINT_PITY_SECONDS_AFTER_KOMPASS nach Freischaltung. */
export function mussErstenErzwingen(s: BlueprintState): boolean {
  return !s.ersterGezogen && s.sekGesamt >= FIRST_BLUEPRINT_PITY_SECONDS_AFTER_KOMPASS;
}

/** Pity: relevanter Bauplan spätestens RELEVANT_BLUEPRINT_PITY_SECONDS nach dem letzten relevanten. */
export function mussRelevantenErzwingen(s: BlueprintState): boolean {
  return s.sekSeitLetztemRelevanten >= RELEVANT_BLUEPRINT_PITY_SECONDS;
}

/**
 * Zieht einen Bauplan aus den noch NICHT besessenen (Duplikatschutz). Gewichtung 60/25/15 über
 * Relevanzklassen; bei Pity (oder `erzwingeRelevant`) wird ein relevanter erzwungen. null, wenn nichts
 * mehr ziehbar ist.
 */
export function zieheBauplan(
  s: BlueprintState,
  polLevels: Record<Pol, number>,
  rng: () => number,
  erzwingeRelevant = false,
): Angebot | null {
  const unowned = BLUEPRINT_POOL.filter((b) => !s.besessen.includes(b.id));
  if (unowned.length === 0) return null;

  const top = topZweiPole(polLevels);
  const relevante = unowned.filter((b) => istRelevant(b, polLevels));
  const klasseA = unowned.filter((b) => b.bedarf.every((p) => top.includes(p))); // beide Pole top
  const klasseB = relevante.filter((b) => !klasseA.includes(b)); // genau einer top
  const klasseC = unowned.filter((b) => !istRelevant(b, polLevels)); // fremd (im MVP leer)

  let pool: BlueprintDef[];
  if (erzwingeRelevant || mussRelevantenErzwingen(s)) {
    pool = relevante.length ? relevante : unowned;
  } else {
    const r = rng();
    if (r < 0.6 && klasseA.length) pool = klasseA;
    else if (r < 0.85 && klasseB.length) pool = klasseB;
    else if (klasseC.length) pool = klasseC;
    else pool = klasseA.length ? klasseA : klasseB.length ? klasseB : unowned;
  }

  const gewaehlt = pool[Math.floor(rng() * pool.length)] ?? pool[0]!;
  const angebot: Angebot = { id: gewaehlt.id, relevant: istRelevant(gewaehlt, polLevels) };
  s.ersterGezogen = true;
  if (angebot.relevant) s.sekSeitLetztemRelevanten = 0;
  return angebot;
}

/** Bauplan annehmen → freier Slot. false bei vollen Slots (Replace-Pfad nötig) oder schon besessen. */
export function nimmBauplan(s: BlueprintState, id: BlueprintId): boolean {
  if (s.besessen.includes(id)) return false;
  if (s.besessen.length >= BLUEPRINT_SLOTS) return false;
  s.besessen.push(id);
  return true;
}

/** Vollen Slot ersetzen (alt raus, neu rein). false bei alt nicht besessen oder neu schon da. */
export function ersetzeBauplan(s: BlueprintState, alt: BlueprintId, neu: BlueprintId): boolean {
  const i = s.besessen.indexOf(alt);
  if (i < 0 || s.besessen.includes(neu)) return false;
  s.besessen[i] = neu;
  return true;
}
