/**
 * Raum-Build (RRR) Skill-System — analog zu befehlSkill, aber für den Felder-Build. VORERST nur die
 * drei Pol-Ults (Talente folgen später). Reine Definitionen, kein Engine-Bezug; die Effekte
 * (freie Verlegung / ×3 Feldgröße / ansteckender Feld-DoT) setzt main.ts um.
 */
export type RaumUltId = 'umlagerung' | 'grossfeld' | 'verseuchung';

export interface RaumUltDef {
  id: RaumUltId;
  pol: string; // Kompass-Pol (Befehl/Raum/Zustand)
  name: string;
  text: string;
  taste: string;
  icon: string;
  dauer: number; // s aktiv
  cd: number; // s Cooldown nach Ablauf
}

export const RAUM_ULTS: readonly RaumUltDef[] = [
  {
    id: 'umlagerung', pol: 'Befehl', name: 'Umlagerung', taste: 'Q', icon: '⚔', dauer: 20, cd: 30,
    text: 'Aktiv 20 s: Felder frei hin- und herverlegen OHNE Munitionsverbrauch (Logistik).',
  },
  {
    id: 'grossfeld', pol: 'Raum', name: 'Großfeld', taste: 'Q', icon: '▦', dauer: 20, cd: 30,
    text: 'Aktiv 20 s: alle Felder wachsen auf 300 % ihrer Größe.',
  },
  {
    id: 'verseuchung', pol: 'Zustand', name: 'Verseuchung', taste: 'Q', icon: '☣', dauer: 20, cd: 30,
    text: 'Aktiv 20 s: Felder geben einen ANSTECKENDEN DoT; kein Fangen/Slow auf den Feldern; der DoT hält bis zum Tod.',
  },
];

// Effekt-Konstanten (main.ts liest sie):
export const RAUM_ULT_GROSSFELD_MUL = 3; // Großfeld: Feldgröße ×3 während der Ult
export const RAUM_ULT_DOT_PRO_TICK = 6; // Verseuchung: Schaden je Gift-Tick des Feld-DoT
export const RAUM_ULT_ANSTECK_RADIUS = 20; // Verseuchung: Welt-Radius, in dem der Feld-DoT ansteckt

// — TALENTE (unter der Ult): 5 Slots, je RAUM_TALENT_MAX Ränge —
export type RaumTalentId = 'dauer' | 'cooldown' | 'beute' | 'schaden' | 'munition';
export const RAUM_TALENT_MAX = 3;

// Effekt pro Rang:
export const RAUM_DAUER_PRO_RANG = 2; // +2 s Ult-Dauer
export const RAUM_CD_PRO_RANG = 5; // −5 s Ult-Cooldown
export const RAUM_BEUTE_PRO_RANG = 1; // +1 Ernte-Buff je Kill, WÄHREND die Ult läuft
export const RAUM_DMG_PRO_RANG = 0.05; // +5 % Feld-Schaden, WÄHREND die Ult läuft
export const RAUM_MUNITION_PRO_RANG = 1; // +1 Munition (Magazin)

export interface RaumTalentDef { id: RaumTalentId; name: string; text: string }
export const RAUM_TALENTS: readonly RaumTalentDef[] = [
  { id: 'dauer', name: 'Ausdauer', text: '+2 s Ult-Dauer je Rang' },
  { id: 'cooldown', name: 'Abklingen', text: '−5 s Ult-Cooldown je Rang' },
  { id: 'beute', name: 'Erntegier', text: 'während der Ult: +1 Buff je Kill je Rang' },
  { id: 'schaden', name: 'Verdichtung', text: 'während der Ult: +5 % Feld-Schaden je Rang' },
  { id: 'munition', name: 'Vorrat', text: '+1 Munition (Magazin) je Rang' },
];

/** Die Definition zur gegebenen Raum-Ult-Id (fällt auf die erste zurück; null → erste). */
export function raumUltDef(id: RaumUltId | null): RaumUltDef {
  return RAUM_ULTS.find((u) => u.id === id) ?? RAUM_ULTS[0]!;
}

export interface RaumSkillState {
  ult: RaumUltId | null; // gewählte Pol-Ult (erster Punkt)
  ranks: Record<RaumTalentId, number>;
  punkte: number;
}

export function createRaumSkillState(): RaumSkillState {
  return { ult: null, ranks: { dauer: 0, cooldown: 0, beute: 0, schaden: 0, munition: 0 }, punkte: 0 };
}

/** Pol-Ult wählen (kostet 1 Punkt). Nur möglich, wenn noch keine Ult gewählt + ein Punkt frei. */
export function chooseRaumUlt(st: RaumSkillState, id: RaumUltId): boolean {
  if (st.ult !== null || st.punkte <= 0) return false;
  st.ult = id; st.punkte -= 1; return true;
}

/** Talent-Rang erhöhen. Voraussetzung: Ult gewählt, Punkt frei, Rang < Max. */
export function spendRaumTalent(st: RaumSkillState, id: RaumTalentId): boolean {
  if (st.ult === null || st.punkte <= 0 || st.ranks[id] >= RAUM_TALENT_MAX) return false;
  st.ranks[id] += 1; st.punkte -= 1; return true;
}
