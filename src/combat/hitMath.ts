/** Kreis-gegen-Kreis-Überlappung in der XZ-Ebene (Treffertest für Projektil↔Panzer). */
export function circleOverlap(
  ax: number,
  az: number,
  ar: number,
  bx: number,
  bz: number,
  br: number,
): boolean {
  const dx = ax - bx;
  const dz = az - bz;
  const r = ar + br;
  return dx * dx + dz * dz <= r * r;
}
