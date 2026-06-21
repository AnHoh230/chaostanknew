import type { PlayerStyleProfile } from './styleProfile';

/** Stufen einer Doktrin (Spec §7.2). */
export type DoctrineStage = 'inactive' | 'hint' | 'preparing' | 'active' | 'escalated';

/** Ein Stil-Wert, der Hitze für eine Doktrin erzeugt (Schwellen in der Einheit des Feldes). */
export interface DoctrineTrigger {
  field: keyof PlayerStyleProfile;
  mid: number; // ab hier „mittel"
  strong: number; // ab hier „stark"
}

/** Konfiguration einer Doktrin (Daten — die Engine ist generisch). */
export interface DoctrineConfig {
  id: string;
  displayName: string; // „Störkrieg"
  playerReason: string; // Frontlage-Erklärung (player-facing)
  triggers: DoctrineTrigger[];
  enemyTemplateIds: string[]; // Doktrin-Gegner (P5)
  fieldObjectId: string; // Quell-/Zielobjekt (P5)
  objectiveText: string; // „Zerstöre das Signal-Relay"
  lootMarkId: string; // Freischalt-Marke (P6)
  shopUnlockIds: string[]; // Konter-Items (P6)
}

// — Heat-/Stage-Regeln (Spec §23) —
export const HINT = 25;
export const PREPARE = 50;
export const ACTIVE = 75;
export const ESCALATED = 90;
export const HEAT_STRONG = 25;
export const HEAT_MID = 15;
export const HEAT_LIGHT = 8;
export const HEAT_DECAY = -10;
export const SABOTAGE = -30;
export const PROVOKE = 25;
export const COMMITMENT = 2; // Pulse, die eine aktive Doktrin mindestens bleibt

/** Reihenfolge für Stufen-Vergleiche/Deckelung. */
export const STAGE_ORDER: DoctrineStage[] = ['inactive', 'hint', 'preparing', 'active', 'escalated'];

export function stageFromHeat(heat: number): DoctrineStage {
  if (heat >= ESCALATED) return 'escalated';
  if (heat >= ACTIVE) return 'active';
  if (heat >= PREPARE) return 'preparing';
  if (heat >= HINT) return 'hint';
  return 'inactive';
}

/** Die 4 MVP-Doktrinen (Quelle der Wahrheit für die Engine). */
export const DOCTRINES: DoctrineConfig[] = [
  {
    id: 'stoerkrieg',
    displayName: 'Störkrieg',
    playerReason: 'Feindliche Aufklärung hat starke automatische Waffen erkannt.',
    triggers: [{ field: 'autoTurretDamageRatio', mid: 0.35, strong: 0.55 }],
    enemyTemplateIds: ['jammer_bike', 'stoerpanzer'],
    fieldObjectId: 'signal_relay',
    objectiveText: 'Zerstöre das Signal-Relay',
    lootMarkId: 'stoerspule',
    shopUnlockIds: ['turret_abschirmung'],
  },
  {
    id: 'belagerung',
    displayName: 'Belagerungsdruck',
    playerReason: 'Die Feinde haben deine Stellung erkannt. Belagerungseinheiten rücken an.',
    triggers: [
      { field: 'stationaryRatio', mid: 0.4, strong: 0.6 },
      { field: 'timeInSameArea', mid: 20, strong: 40 },
    ],
    enemyTemplateIds: ['beobachterwagen', 'belagerungspanzer'],
    fieldObjectId: 'beobachtungsturm',
    objectiveText: 'Schalte den Beobachter aus',
    lootMarkId: 'optikmodul',
    shopUnlockIds: ['zielwarn_empfaenger'],
  },
  {
    id: 'nebel',
    displayName: 'Nebel & Aufklärung',
    playerReason: 'Die Feinde verschleiern ihre Bewegung und schicken Aufklärer gegen deine Sichtlinien.',
    triggers: [{ field: 'longRangeKillRatio', mid: 0.4, strong: 0.65 }],
    enemyTemplateIds: ['rauchwerfer', 'scout_runner'],
    fieldObjectId: 'rauchgenerator',
    objectiveText: 'Zerstöre den Rauchgenerator',
    lootMarkId: 'scout_optik',
    shopUnlockIds: ['waermebild_optik'],
  },
  {
    id: 'sperrkrieg',
    displayName: 'Sperrkrieg',
    playerReason: 'Die Feinde legen Sperren, Minen und Köder aus, um deinen Vorstoß zu bremsen.',
    triggers: [
      { field: 'closeRangeKillRatio', mid: 0.4, strong: 0.6 },
      { field: 'avgSpeed', mid: 6, strong: 9 },
    ],
    enemyTemplateIds: ['minenleger', 'blocker_panzer'],
    fieldObjectId: 'minenleger_kommandowagen',
    objectiveText: 'Zerstöre den Minenleger',
    lootMarkId: 'minenkit',
    shopUnlockIds: ['minenpflug'],
  },
];
