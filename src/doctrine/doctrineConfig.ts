import type { PlayerStyleProfile } from './styleProfile';

/** Ein Stil-Wert, der Heat für eine Richtung erzeugt (Schwellen in der Einheit des Feldes). */
export interface DoctrineTrigger {
  field: keyof PlayerStyleProfile;
  mid: number; // ab hier „mittel"
  strong: number; // ab hier „stark"
}

/**
 * Konfiguration einer Spielstil-RICHTUNG (Daten — die Engine ist generisch).
 * Heat dieser Richtung bestimmt, WELCHE Monster-Typen spawnen (pro Stufe) und WIE VIELE.
 */
export interface DoctrineConfig {
  id: string;
  displayName: string; // „Störkrieg" (Info/HUD)
  triggers: DoctrineTrigger[];
  /** Stufe 0..3 → welche Monster-Typ-IDs in dieser Richtung auftauchen (R2 liefert die Typen). */
  enemyTypesByStufe: string[][];
}

// — Heat-Regeln (Defaults, live per Regler korrigierbar) —
export const HEAT_STRONG = 25; // Anstieg/Puls bei starkem Stil-Signal
export const HEAT_MID = 15; // Anstieg/Puls bei mittlerem Signal
export const HEAT_LIGHT = 8; // Anstieg/Puls bei leichtem Signal
export const DECAY = 5; // Abkühlung/Puls für ungenutzte Richtungen (asymmetrisch: deutlich < Anstieg)
export const BANDS: readonly number[] = [30, 60, 85]; // Heat-Schwellen für Stufe 1 / 2 / 3

/** Stufe 0..3 aus dem Heat über die Bänder. */
export function stufeFromHeat(heat: number, bands: readonly number[] = BANDS): number {
  let s = 0;
  for (const b of bands) if (heat >= b) s += 1;
  return s;
}

/**
 * Die 4 MVP-Richtungen (Quelle der Wahrheit für die Engine). Konter entsteht über das
 * VERHALTEN der gewählten Monster-Typen (R2), nicht über an den Spieler balancierte Stats.
 * Typ-IDs entsprechen Verhaltensmustern aus dem R2-Register (closer/flanker/swarm/disruptor/blocker).
 */
export const DOCTRINES: DoctrineConfig[] = [
  {
    id: 'stoerkrieg', // Auto-Turret-lastig → Typen, die in den Nahbereich/hinter die Wanne drängen
    displayName: 'Störkrieg',
    triggers: [{ field: 'autoTurretDamageRatio', mid: 0.35, strong: 0.55 }],
    enemyTypesByStufe: [[], ['closer'], ['closer', 'flanker'], ['closer', 'flanker', 'swarm']],
  },
  {
    id: 'belagerung', // Einbunkern → Typen, die die feste Stellung anstürmen/umstellen
    displayName: 'Belagerungsdruck',
    triggers: [
      { field: 'stationaryRatio', mid: 0.4, strong: 0.6 },
      { field: 'timeInSameArea', mid: 20, strong: 40 },
    ],
    enemyTypesByStufe: [[], ['disruptor'], ['disruptor', 'blocker'], ['disruptor', 'blocker', 'flanker']],
  },
  {
    id: 'nebel', // Distanz/Sniper → schnelle Typen, die die Distanz schließen / Sichtlinie brechen
    displayName: 'Nahkampfdruck',
    triggers: [{ field: 'longRangeKillRatio', mid: 0.4, strong: 0.65 }],
    // Konter zum Sniper = der schnelle Racer. In JEDER Stufe präsent → je höher der Distanz-Heat,
    // desto mehr Racer (höherer targetCount + Anteil); ab Stufe 2/3 zusätzlich Closer/Flanker.
    enemyTypesByStufe: [[], ['racer'], ['racer', 'closer'], ['racer', 'closer', 'flanker']],
  },
  {
    id: 'sperrkrieg', // Rush → Typen, die den Vorstoß stoppen / sich in den Weg stellen
    displayName: 'Sperrkrieg',
    triggers: [
      { field: 'closeRangeKillRatio', mid: 0.4, strong: 0.6 },
      { field: 'avgSpeed', mid: 6, strong: 9 },
    ],
    enemyTypesByStufe: [[], ['blocker'], ['blocker', 'swarm'], ['blocker', 'swarm', 'disruptor']],
  },
];
