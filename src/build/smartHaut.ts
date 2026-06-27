/**
 * Spec 7 (code-abgeglichen) — Smart Hautabschluss: REINE Logik für sichere Verhärtung/Signaturen.
 * Konsolidiert Gate 1–5: Schicht-Status (Übergänge), sichere Zustands-Applies, Mastery-Messung,
 * Signatur-Entscheidungen, Ult-Kategorien. Kein Engine-Bezug (TDD). Werte sind gegen den echten Code
 * geeicht (garten.ts/raum.ts/befehl*). main.ts ruft das hier auf, wendet es aber selbst auf die Welt an.
 */
import type { Pol } from './buildModell';
import { saeGift, type GiftState, type GartenConfig } from './garten';

// — Gate 1: Schicht-Status (kein Überspringen: active → progressFull → masteryPassed → signed) —
export type LayerId = 'build' | 'skillbaum' | 'finisher';
export type LayerStatus = 'locked' | 'active' | 'progressFull' | 'masteryPassed' | 'signed';
const ORDER: readonly LayerStatus[] = ['locked', 'active', 'progressFull', 'masteryPassed', 'signed'];

/** Erlaubt nur Schritt-für-Schritt-Übergänge (z. B. active→signed ist verboten). */
export function darfUebergang(von: LayerStatus, nach: LayerStatus): boolean {
  return ORDER.indexOf(nach) === ORDER.indexOf(von) + 1;
}

// — Gate 2: sichere Zustands-Applies (Invarianten aus Spec 7 §3) —
export function istInfiziert(g: GiftState | undefined): boolean {
  return !!g && g.potency > 0;
}
/** Infektion ist additiv (saeGift, potency += saat) → Reife sinkt NIE. Wrapper macht die Invariante explizit. */
export function infiziereMonoton(g: GiftState | undefined, cfg: GartenConfig): GiftState {
  const vorher = g?.potency ?? 0;
  const next = saeGift(g, cfg);
  return next.potency >= vorher ? next : { ...next, potency: vorher }; // Sicherheitsnetz: niemals senken
}
/** Feld darf nur unter dem Cap (= maxAmmo()) neu entstehen (Spec 7 §6.2 / §9.3). */
export function feldDarfEntstehen(aktiveFelder: number, cap: number): boolean {
  return aktiveFelder < cap;
}

// — Gate 3: Mastery-Messung (Spielnachweis je Build; tunbar, neu — kein Code-Äquivalent) —
export const MASTERY_MARKED_KILLS = 16; // Befehl: markierte Kills
export const MASTERY_FIELD_KILLS = 16; // Raum: Kills in eigenen Feldern
export const MASTERY_MATURE_KILLS = 16; // Zustand: am reifen Gift gestorben
export const MASTERY_MIN_AGE_S = 0.75; // Mark/Feld/Gift muss so alt sein, damit der Kill „echt" zählt

export interface Mastery { markedKills: number; fieldKills: number; matureKills: number }
export function createMastery(): Mastery {
  return { markedKills: 0, fieldKills: 0, matureKills: 0 };
}
export function buildGemeistert(build: Pol, m: Mastery): boolean {
  if (build === 'befehl') return m.markedKills >= MASTERY_MARKED_KILLS;
  if (build === 'raum') return m.fieldKills >= MASTERY_FIELD_KILLS;
  return m.matureKills >= MASTERY_MATURE_KILLS;
}

// — Gate 4: Talent-Signatur-Entscheidungen (rein) —
export const SIG_LINK_RANGE = 6; // Welt-Einheiten (Befehlsnetz / Kritische Masse Sprung)
export const SIG_MAX_LINKS = 2;

/** Die bis zu maxLinks nächsten Kandidaten in Reichweite (Ids) — für Befehlsnetz/Kritische-Masse-Sprung. */
export function naheKandidaten(
  cx: number,
  cz: number,
  kandidaten: readonly { id: string; x: number; z: number }[],
  range = SIG_LINK_RANGE,
  maxLinks = SIG_MAX_LINKS,
): string[] {
  return kandidaten
    .map((k) => ({ id: k.id, d: (k.x - cx) ** 2 + (k.z - cz) ** 2 }))
    .filter((k) => k.d <= range * range)
    .sort((a, b) => a.d - b.d)
    .slice(0, maxLinks)
    .map((k) => k.id);
}
/** Kritische Masse / Spread: neue Reife = max(bestehend, einkommend) — verschlechtert nie (Spec 7 §7.4). */
export function besserReife(bestehend: number, einkommend: number): number {
  return Math.max(bestehend, einkommend);
}

// — Gate 5: Ult-Kategorien + Wirksamkeit —
export type UltKategorie = 'zielsalve' | 'feldverlagerung' | 'reifeschub';
export const ULT_EFFECTIVE_USES = 6;
export const ULT_MIN_EFFECT_SCORE = 8;

/** Jede der 3 Pol-Ults eines Builds fällt in eine Kategorie (Spec 7 §8 / §13.9). */
export function ultKategorie(build: Pol): UltKategorie {
  return build === 'befehl' ? 'zielsalve' : build === 'raum' ? 'feldverlagerung' : 'reifeschub';
}
export function ultWirksam(effektScore: number): boolean {
  return effektScore >= ULT_MIN_EFFECT_SCORE;
}
