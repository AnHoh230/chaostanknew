/** Maximale Winkel-Streuung (rad) bei Treffsicherheit 0. */
export const MAX_JITTER = 0.25;

/**
 * Streut eine Feuer-Richtung gemäß Treffsicherheit. accuracy=1 → exakt,
 * darunter zufällige Abweichung bis ±MAX_JITTER*(1-accuracy). Nur für
 * AUTO-Feuer gedacht — manuelles Spielerfeuer zielt direkt (ignoriert dies).
 */
export function applyJitter(dir: number, accuracy: number, rng: () => number): number {
  const a = accuracy < 0 ? 0 : accuracy > 1 ? 1 : accuracy;
  if (a >= 1) return dir;
  const spread = MAX_JITTER * (1 - a);
  return dir + (rng() * 2 - 1) * spread;
}

/** Wird ein eingehender Treffer ausgewichen? Chance = dodge (0..1). */
export function dodgeRoll(dodge: number, rng: () => number): boolean {
  const d = dodge < 0 ? 0 : dodge > 1 ? 1 : dodge;
  return rng() < d;
}
