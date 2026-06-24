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

export const SEUCHE_LIFESTEAL = 0.01; // Anteil des in der Seuche-Ult ausgeteilten Schadens, der als HP zurückkommt

/** Die Definition zur gegebenen Befehl-Ult-Id (fällt auf die erste zurück). */
export function befehlUltDef(id: BefehlUltId): BefehlUltDef {
  return BEFEHL_ULTS.find((u) => u.id === id) ?? BEFEHL_ULTS[0]!;
}
