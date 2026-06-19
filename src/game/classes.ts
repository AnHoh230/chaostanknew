import type { TankComposition } from '../tank/sockets';

/** Spielbare Panzerklasse: Teile-Komposition + Grundwerte. */
export interface TankClass {
  id: string;
  name: string;
  beschreibung: string;
  composition: TankComposition;
  speed: number; // Welt-Einheiten/s
  maxHp: number;
  damage: number; // Schaden pro Schuss
}

/**
 * Drei Startklassen, sichtbar aus verschiedenen Teilen komponiert und mit klarem
 * Stat-Profil (schnell-leicht ↔ langsam-schwer). Klasse ist nur ein Startpunkt —
 * Teile lassen sich später per Loot/Shop verändern.
 */
export const TANK_CLASSES: readonly TankClass[] = [
  {
    id: 'spaeher',
    name: 'Späher',
    beschreibung: 'Schnell und wendig, aber dünn gepanzert. Für Hit-and-Run.',
    composition: { chassis: 'c_box', wheels: 'w_round', turret: 't_small', weapon: 'g_short' },
    speed: 12,
    maxHp: 70,
    damage: 14,
  },
  {
    id: 'allrounder',
    name: 'Allrounder',
    beschreibung: 'Ausgewogen in Tempo, Panzerung und Feuerkraft.',
    composition: { chassis: 'c_box', wheels: 'w_tread', turret: 't_big', weapon: 'g_short' },
    speed: 8,
    maxHp: 110,
    damage: 22,
  },
  {
    id: 'haubitze',
    name: 'Haubitze',
    beschreibung: 'Langsam und schwer, dafür dicke Panzerung und harte Schläge.',
    composition: { chassis: 'c_wide', wheels: 'w_tread', turret: 't_big', weapon: 'g_long' },
    speed: 5,
    maxHp: 160,
    damage: 36,
  },
];

/** Klasse per id holen; unbekannte id = lauter Fehler (kein stiller Fallback). */
export function getClass(id: string): TankClass {
  const c = TANK_CLASSES.find((k) => k.id === id);
  if (!c) throw new Error('Unbekannte Klasse: ' + id);
  return c;
}
