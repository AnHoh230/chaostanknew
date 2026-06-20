/**
 * Dreht `current` auf `target` zu, höchstens `slewRate*dt` pro Aufruf, auf dem
 * kürzeren Winkelweg (Wrap an ±π). slewRate=Infinity → sofort am Ziel.
 */
export function stepTurret(current: number, target: number, slewRate: number, dt: number): number {
  if (!isFinite(slewRate)) return target;
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const maxStep = slewRate * dt;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}
