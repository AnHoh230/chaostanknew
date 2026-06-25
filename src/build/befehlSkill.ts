/**
 * Befehl-Build Skill-System (erste Schicht) — analog zum Garten-skilltree, aber für den Kommandanten.
 * VORERST nur die drei Pol-Ults (Talentbaum folgt später). Reine Definitionen, kein Engine-Bezug;
 * die Effekte (Auto-Exekution / Massen-Markierung / Seuche) setzt main.ts um.
 */
export type BefehlUltId = 'kommando' | 'streuung' | 'seuche';

export interface BefehlUltDef {
  id: BefehlUltId;
  pol: string; // Kompass-Pol (Befehl/Raum/Zustand)
  name: string;
  text: string;
  taste: string;
  icon: string;
  dauer: number; // s aktiv
  cd: number; // s Cooldown nach Ablauf
}

export const BEFEHL_ULTS: readonly BefehlUltDef[] = [
  {
    id: 'kommando', pol: 'Befehl', name: 'Generalstab', taste: 'Q', icon: '⚔', dauer: 20, cd: 30,
    text: 'Aktiv 20 s: markiert + exekutiert automatisch, eins nach dem anderen — zählt als selbst gemacht.',
  },
  {
    id: 'streuung', pol: 'Raum', name: 'Sperrfeuer', taste: 'Q', icon: '▦', dauer: 20, cd: 30,
    text: 'Aktiv 20 s: alle Ziele in Sicht markiert (kein Counter) — frei abknallen, kein Reihenfolge-Bruch.',
  },
  {
    id: 'seuche', pol: 'Zustand', name: 'Verfall', taste: 'Q', icon: '☣', dauer: 20, cd: 30,
    text: 'Aktiv 20 s: markierte werden zu DoT, Dauer-Slomo, unbegrenztes Markieren — am Ende explodieren alle + 1 % Lifesteal.',
  },
];

export const SEUCHE_LIFESTEAL = 0.01; // Basis-Lifesteal der Seuche-Ult (Aderlass-Talent hebt es)

/** Die Definition zur gegebenen Befehl-Ult-Id (fällt auf die erste zurück; null → erste). */
export function befehlUltDef(id: BefehlUltId | null): BefehlUltDef {
  return BEFEHL_ULTS.find((u) => u.id === id) ?? BEFEHL_ULTS[0]!;
}

// — TALENTE (analog Garten: 5 Slots, je TALENT_MAX Ränge; Stufe 1-4 universal, Stufe 5 an die Ult gekoppelt) —
export type BefehlTalentId = 'disziplin' | 'dauer' | 'beute' | 'cooldown' | 'pol';

export const BEFEHL_TALENT_MAX = 3;

export interface BefehlSkillState {
  ult: BefehlUltId | null; // gewählte Pol-Ult (erster Punkt)
  ranks: Record<BefehlTalentId, number>;
  punkte: number;
}

export function createBefehlSkillState(): BefehlSkillState {
  return { ult: null, ranks: { disziplin: 0, dauer: 0, beute: 0, cooldown: 0, pol: 0 }, punkte: 0 };
}

export interface BefehlTalentDef { id: BefehlTalentId; name: string; text: string }
export const BEFEHL_TALENTS: readonly BefehlTalentDef[] = [
  { id: 'disziplin', name: 'Eiserne Disziplin', text: 'Schutz-Ladung: ein Reihenfolge-Bruch wird verziehen (lädt bei Kette ≥15 nach)' },
  { id: 'dauer', name: 'Dauerbefehl', text: '+Ult-Dauer' },
  { id: 'beute', name: 'Kriegsbeute', text: '+1 Buff pro Kill je Rang (1 → 2/3/4 Aufbau-Stufen je in-Reihe-Kill)' },
  { id: 'cooldown', name: 'Schneller Stab', text: '−Ult-Cooldown' },
  { id: 'pol', name: 'Pol-Talent', text: 'je nach Ult: +Auto-Ziel / +Lifesteal / +Slow' },
];

// Effekt-Konstanten pro Rang (Startwerte, frei tunebar):
export const DAUER_PRO_RANG = 5; // s zusätzliche Ult-Dauer
export const CD_PRO_RANG = 5; // s weniger Ult-Cooldown
export const SCHUTZ_NACHLADE_KETTE = 15; // ab dieser Kette lädt eine Schutz-Ladung nach
export const POL_UEBERMACHT_PRO_RANG = 1; // Generalstab: +gleichzeitige Auto-Ziele
export const POL_ADERLASS_PRO_RANG = 0.01; // Verfall: +Lifesteal-Anteil
export const POL_KLAMMER_PRO_RANG = 0.02; // Sperrfeuer: +Slow-Anteil auf Markierte

/** Erster Punkt: Pol-Ult wählen (kostet 1 Punkt). Nur möglich, wenn noch keine Ult + ein Punkt frei. */
export function chooseBefehlUlt(st: BefehlSkillState, id: BefehlUltId): boolean {
  if (st.ult !== null || st.punkte <= 0) return false;
  st.ult = id; st.punkte -= 1; return true;
}

/** Talent-Rang erhöhen. Voraussetzung: Ult gewählt, Punkt frei, Rang < Max. */
export function spendBefehlTalent(st: BefehlSkillState, id: BefehlTalentId): boolean {
  if (st.ult === null || st.punkte <= 0 || st.ranks[id] >= BEFEHL_TALENT_MAX) return false;
  st.ranks[id] += 1; st.punkte -= 1; return true;
}
