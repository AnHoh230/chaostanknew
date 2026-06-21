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
 * EINE Startklasse (Rogue-like-Fokus): der Panzer ist gesetzt, Fortschritt kommt über
 * Fähigkeiten (Dash) + Loot, nicht über Klassenwahl. Die Multiklasse wurde entfernt.
 */
export const TANK_CLASSES: readonly TankClass[] = [
  {
    id: 'haubitze',
    name: 'Panzer',
    beschreibung: 'Schwer gepanzert, harte Schläge. Weiche per Dash (Shift+WASD) aus.',
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
