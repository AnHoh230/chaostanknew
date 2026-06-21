/** Spielstil-Profil eines Auswertungsfensters (Frontlage-Puls). Rein, kein Babylon. */
export interface PlayerStyleProfile {
  autoTurretDamageRatio: number; // Anteil Spielerschaden aus der Sekundärwaffe (Auto-Turret) 0..1
  stationaryRatio: number; // Anteil Zeit unter Bewegungs-Schwelle 0..1
  timeInSameArea: number; // längste Verweildauer (s) im Umkreis eines Ankers
  longRangeKillRatio: number; // Anteil Kills jenseits LONG_DIST 0..1
  closeRangeKillRatio: number; // Anteil Kills innerhalb CLOSE_DIST 0..1
  avgSpeed: number; // zeit-gewichtetes Durchschnittstempo (Welt-Einheiten/s)
  boosterUsage: number; // gezündete Booster im Fenster
  damageTakenWhileStationary: number; // im Stand erlittener Schaden
}

export const LONG_DIST = 28; // Kill jenseits = Fernkampf (Schussweite-Default ~40)
export const CLOSE_DIST = 10; // Kill innerhalb = Nahkampf
export const STATIONARY_SPEED = 1.5; // darunter gilt der Spieler als „steht"
export const SAME_AREA_RADIUS = 12; // Umkreis für „in derselben Zone"

export function emptyProfile(): PlayerStyleProfile {
  return {
    autoTurretDamageRatio: 0,
    stationaryRatio: 0,
    timeInSameArea: 0,
    longRangeKillRatio: 0,
    closeRangeKillRatio: 0,
    avgSpeed: 0,
    boosterUsage: 0,
    damageTakenWhileStationary: 0,
  };
}
