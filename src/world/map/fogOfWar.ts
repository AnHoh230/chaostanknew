/**
 * Kriegsnebel für die Übersichtskarte: ein Raster über das Feld, das sich merkt, WO der
 * Spieler schon war. Aufdeckung ist persistent (einmal gesehen = bekannt). Reine Logik —
 * der Overview-Renderer fragt istEnthuellt() je Zelle/Blip ab. Getestet, kein Engine-Bezug.
 */
export interface FogOfWar {
  readonly cols: number;
  readonly rows: number;
  readonly cellSize: number;
  readonly halfX: number;
  readonly halfZ: number;
  reveal(x: number, z: number, radius: number): void;
  istEnthuellt(x: number, z: number): boolean;
  istZelleEnthuellt(col: number, row: number): boolean;
  zelleZentrum(col: number, row: number): { x: number; z: number };
  reset(): void;
}

export function createFog(halfX: number, halfZ: number, cellSize: number): FogOfWar {
  const cols = Math.max(1, Math.ceil((2 * halfX) / cellSize));
  const rows = Math.max(1, Math.ceil((2 * halfZ) / cellSize));
  const revealed = new Uint8Array(cols * rows);

  const colOf = (x: number): number => Math.floor((x + halfX) / cellSize);
  const rowOf = (z: number): number => Math.floor((z + halfZ) / cellSize);
  const zentX = (c: number): number => -halfX + (c + 0.5) * cellSize;
  const zentZ = (r: number): number => -halfZ + (r + 0.5) * cellSize;

  function reveal(x: number, z: number, radius: number): void {
    const cMin = Math.max(0, colOf(x - radius));
    const cMax = Math.min(cols - 1, colOf(x + radius));
    const rMin = Math.max(0, rowOf(z - radius));
    const rMax = Math.min(rows - 1, rowOf(z + radius));
    const r2 = radius * radius;
    for (let c = cMin; c <= cMax; c++) {
      for (let r = rMin; r <= rMax; r++) {
        const dx = zentX(c) - x;
        const dz = zentZ(r) - z;
        if (dx * dx + dz * dz <= r2) revealed[r * cols + c] = 1;
      }
    }
  }

  function istZelleEnthuellt(col: number, row: number): boolean {
    return col >= 0 && col < cols && row >= 0 && row < rows && revealed[row * cols + col] === 1;
  }
  function istEnthuellt(x: number, z: number): boolean {
    return istZelleEnthuellt(colOf(x), rowOf(z));
  }

  return {
    cols,
    rows,
    cellSize,
    halfX,
    halfZ,
    reveal,
    istEnthuellt,
    istZelleEnthuellt,
    zelleZentrum: (c, r) => ({ x: zentX(c), z: zentZ(r) }),
    reset: () => revealed.fill(0),
  };
}
