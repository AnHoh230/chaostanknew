import type { TankComposition } from '../tank/sockets';
import type { EnemyBehavior } from './enemyBehavior';

/**
 * Ein Gegner-Typ = eine Optik + ein Verhaltensmuster. Mehr nicht: Kampfwerte kommen
 * weiterhin aus Ausrüstung + Level (enemyStats), NICHT aus dem Typ. Typen unterscheiden
 * sich also rein darüber, WIE sie sich bewegen/angreifen.
 */
export interface EnemyType {
  id: string;
  behavior: EnemyBehavior;
  comp: TankComposition; // Optik, damit die Muster im Spiel unterscheidbar sind
  label: string; // Anzeigename — identisch zum Regler-Namen, damit der Bezug eindeutig ist
  color: string; // Farbe für Welt-Label + Schwarm-Anzeige (schneller Scan)
}

export const ENEMY_TYPES: Record<string, EnemyType> = {
  closer: { id: 'closer', behavior: 'closer', label: 'Closer', color: '#ff6b6b', comp: { chassis: 'c_box', wheels: 'w_round', turret: 't_small', weapon: 'g_short' } },
  flanker: { id: 'flanker', behavior: 'flanker', label: 'Flanker', color: '#c77dff', comp: { chassis: 'c_box', wheels: 'w_round', turret: 't_small', weapon: 'g_long' } },
  swarm: { id: 'swarm', behavior: 'swarm', label: 'Swarm', color: '#ffd166', comp: { chassis: 'c_box', wheels: 'w_tread', turret: 't_small', weapon: 'g_short' } },
  disruptor: { id: 'disruptor', behavior: 'disruptor', label: 'Disruptor', color: '#ff922b', comp: { chassis: 'c_wide', wheels: 'w_tread', turret: 't_big', weapon: 'g_short' } },
  // — INAKTIV (nicht mehr im Spawn; Aufräumen offen, TECH-DEBT TD-8) —
  blocker: { id: 'blocker', behavior: 'blocker', label: 'Blocker', color: '#4dabf7', comp: { chassis: 'c_wide', wheels: 'w_tread', turret: 't_big', weapon: 'g_long' } },
  // — AKTIVER Sniper-Roster (Werte in roster.ts) —
  allrounder: { id: 'allrounder', behavior: 'closer', label: 'Allrounder', color: '#cfd8dc', comp: { chassis: 'c_box', wheels: 'w_tread', turret: 't_small', weapon: 'g_long' } },
  racer: { id: 'racer', behavior: 'racer', label: 'Racer', color: '#69db7c', comp: { chassis: 'c_box', wheels: 'w_round', turret: 't_small', weapon: 'g_short' } },
  bunker: { id: 'bunker', behavior: 'closer', label: 'Bunker', color: '#3b5bdb', comp: { chassis: 'c_wide', wheels: 'w_tread', turret: 't_big', weapon: 'g_long' } },
  // — Häscher: graue, zähe Vollstrecker aus dem Bewegungs-Heat (heatTracker/haescher); geben KEINE Belohnung —
  haescher: { id: 'haescher', behavior: 'closer', label: 'Häscher', color: '#8a8a90', comp: { chassis: 'c_wide', wheels: 'w_tread', turret: 't_big', weapon: 'g_short' } },
};

export const ENEMY_TYPE_IDS = Object.keys(ENEMY_TYPES);
