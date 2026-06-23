/**
 * Skill-System (erste Schicht) für den ZZZ-Build. Greift, sobald `dot_core` St3 (ZZZ) erreicht hat —
 * ab dann werden weitere Impulse zu Skillpunkten (siehe main: Impuls-Überschuss → Punkte).
 *
 * Modell A (passiv): man wählt EINE von 3 Pol-Ults (immer an, kein getaktetes Ult-Fenster), danach
 * flache Wert-Talente. Reine Logik, kein Engine-Bezug (TDD). Die Ult-Effekte (Heilung/Execute/Ausbruch)
 * setzt der Aufrufer um — hier stehen nur die Zahlen + welche Ult/Talente aktiv sind.
 */
import { type GartenConfig } from './garten';

export type UltId = 'naehrboden' | 'gnadenstoss' | 'ausbruch';
export type TalentId = 'saat' | 'reife' | 'koechel' | 'drossel' | 'reifschaden';

export interface SkillState {
  ult: UltId | null; // gewählte Pol-Ult (erster Punkt); null = noch keine
  ranks: Record<TalentId, number>; // Talent-Ränge 0..TALENT_MAX
  punkte: number; // offene (noch nicht vergebene) Skillpunkte
}

export const TALENT_MAX = 3; // Ränge pro Talent

export function createSkillState(): SkillState {
  return { ult: null, ranks: { saat: 0, reife: 0, koechel: 0, drossel: 0, reifschaden: 0 }, punkte: 0 };
}

/**
 * Pol-Ults sind AKTIVIERTE Fähigkeiten: Taste drücken → `dauer` s aktiv (Effekt läuft) → `cd` s Cooldown.
 * Außerhalb des aktiven Fensters spielt man den Basis-ZZZ-Build; die Ult ist das getaktete Power-Fenster.
 */
export interface UltDef {
  id: UltId; pol: string; name: string; text: string;
  taste: string; icon: string; dauer: number; cd: number;
}
export const ULTS: readonly UltDef[] = [
  { id: 'naehrboden', pol: 'Zustand', name: 'Nährboden', taste: 'Q', icon: '🌱', dauer: 6, cd: 12, text: 'Aktiv: jede Ernte heilt dich.' },
  { id: 'gnadenstoss', pol: 'Befehl', name: 'Gnadenstoß', taste: 'Q', icon: '⚔', dauer: 5, cd: 12, text: 'Aktiv: Angesteckte unter 25 % HP sterben sofort.' },
  { id: 'ausbruch', pol: 'Raum', name: 'Ausbruch', taste: 'Q', icon: '☣', dauer: 5, cd: 14, text: 'Aktiv: jede Ernte steckt den Umkreis an (+Erntefieber).' },
];

/** Die Definition der aktuell gewählten Ult (oder null). */
export function activeUltDef(st: SkillState): UltDef | null {
  return st.ult ? (ULTS.find((u) => u.id === st.ult) ?? null) : null;
}

export interface TalentDef { id: TalentId; name: string; text: string }
export const TALENTS: readonly TalentDef[] = [
  { id: 'saat', name: 'Saatstärke', text: '+Start-Potenz pro Infektion' },
  { id: 'reife', name: 'Reifedruck', text: 'Gift reift schneller (Schwelle ↓)' },
  { id: 'koechel', name: 'Köchelschaden', text: '+Schaden des unreifen Gifts' },
  { id: 'drossel', name: 'Drosselung', text: 'Gegner stärker verlangsamt' },
  { id: 'reifschaden', name: 'Reifschaden', text: '+tödlicher Schaden des reifen Gifts' },
];

// Effekt-Konstanten (pro Rang bzw. pro Ult). Alles Startwerte, frei tunebar.
export const SAAT_PRO_RANG = 2;
export const ERNTEPOT_PRO_RANG = 4; // wird ABGEZOGEN (niedriger = schneller reif)
export const KOECHEL_PRO_RANG = 2; // +tickDmg (ZZ) UND +St1-DoT
export const DROSSEL_PRO_RANG = 0.12;
export const REIFDMG_PRO_RANG = 3;
export const HEAL_PRO_ERNTE = 4; // Nährboden: HP pro Ernte
export const EXECUTE_FRAC = 0.25; // Gnadenstoß: Angesteckte unter diesem HP-Anteil sterben sofort
export const AUSBRUCH_RADIUS = 60; // Raum: Ernte steckt diesen Welt-Radius an
export const AUSBRUCH_FIEBER = 2; // Raum: zusätzliches Erntefieber pro Ausbruch
export const PUNKT_KOSTEN = 50; // Impuls-Fortschritt (nach St3) pro Skillpunkt

export interface AppliedSkills {
  cfg: GartenConfig; // effektive Gift-Config (Talente auf die Basis angewandt)
  st1DotBonus: number; // Zuschlag auf den St1-Köchel-DoT (GIFT_DOT_ST1)
  ult: UltId | null;
}

/** Basis-Config + Talent-Ränge → effektive Werte (mutiert nichts; gibt eine neue Config zurück). */
export function applySkills(base: GartenConfig, st: SkillState): AppliedSkills {
  const r = st.ranks;
  const cfg: GartenConfig = {
    ...base,
    saat: base.saat + r.saat * SAAT_PRO_RANG,
    erntePot: Math.max(8, base.erntePot - r.reife * ERNTEPOT_PRO_RANG),
    tickDmg: base.tickDmg + r.koechel * KOECHEL_PRO_RANG,
    slow: Math.min(1, base.slow + r.drossel * DROSSEL_PRO_RANG),
    reifDmg: base.reifDmg + r.reifschaden * REIFDMG_PRO_RANG,
  };
  return { cfg, st1DotBonus: r.koechel * KOECHEL_PRO_RANG, ult: st.ult };
}

/** Erster Punkt: Pol-Ult wählen (kostet 1 Punkt). Nur möglich, wenn noch keine Ult + ein Punkt frei. */
export function chooseUlt(st: SkillState, id: UltId): boolean {
  if (st.ult !== null || st.punkte <= 0) return false;
  st.ult = id;
  st.punkte -= 1;
  return true;
}

/** Talent-Rang erhöhen. Voraussetzung: Ult gewählt, Punkt frei, Rang < Max. */
export function spendTalent(st: SkillState, id: TalentId): boolean {
  if (st.ult === null || st.punkte <= 0 || st.ranks[id] >= TALENT_MAX) return false;
  st.ranks[id] += 1;
  st.punkte -= 1;
  return true;
}
