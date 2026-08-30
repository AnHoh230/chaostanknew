import type { Vec2 } from './mapTypes';
import type { GridCell, GridSpec } from './worldTypes';

export function createGridSpec(cols: number, rows: number, cellSize: number): GridSpec {
  if (!Number.isInteger(cols) || cols <= 0 || !Number.isInteger(rows) || rows <= 0 || cellSize <= 0) {
    throw new Error('invalid-grid-spec');
  }
  return {
    cols,
    rows,
    cellSize,
    extents: { halfX: cols * cellSize / 2, halfZ: rows * cellSize / 2 },
  };
}

export const FIELD_GRID = createGridSpec(80, 64, 10);
export const TRAVERSAL_GRID = createGridSpec(160, 128, 5);

export function cellIndex(grid: GridSpec, col: number, row: number): number {
  if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) return -1;
  return row * grid.cols + col;
}

export function cellAtWorld(grid: GridSpec, point: Vec2): GridCell | null {
  if (
    point.x < -grid.extents.halfX || point.x > grid.extents.halfX ||
    point.z < -grid.extents.halfZ || point.z > grid.extents.halfZ
  ) return null;
  const col = Math.min(grid.cols - 1, Math.floor((point.x + grid.extents.halfX) / grid.cellSize));
  const row = Math.min(grid.rows - 1, Math.floor((point.z + grid.extents.halfZ) / grid.cellSize));
  return { col, row, index: row * grid.cols + col };
}

export function cellCenter(grid: GridSpec, index: number): Vec2 {
  if (index < 0 || index >= grid.cols * grid.rows) throw new Error('grid-index-out-of-bounds');
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  return {
    x: -grid.extents.halfX + (col + 0.5) * grid.cellSize,
    z: -grid.extents.halfZ + (row + 0.5) * grid.cellSize,
  };
}

export function neighbors4(grid: GridSpec, index: number): number[] {
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  const result: number[] = [];
  const candidates: [number, number][] = [[col, row - 1], [col + 1, row], [col, row + 1], [col - 1, row]];
  for (const [c, r] of candidates) {
    const i = cellIndex(grid, c, r);
    if (i >= 0) result.push(i);
  }
  return result;
}

export function sampleContinuous(grid: GridSpec, values: Float32Array, point: Vec2): number {
  if (values.length !== grid.cols * grid.rows) throw new Error('grid-value-count-mismatch');
  const gx = (point.x + grid.extents.halfX) / grid.cellSize - 0.5;
  const gz = (point.z + grid.extents.halfZ) / grid.cellSize - 0.5;
  const x0 = Math.max(0, Math.min(grid.cols - 1, Math.floor(gx)));
  const z0 = Math.max(0, Math.min(grid.rows - 1, Math.floor(gz)));
  const x1 = Math.min(grid.cols - 1, x0 + 1);
  const z1 = Math.min(grid.rows - 1, z0 + 1);
  const tx = Math.max(0, Math.min(1, gx - Math.floor(gx)));
  const tz = Math.max(0, Math.min(1, gz - Math.floor(gz)));
  const a = values[z0 * grid.cols + x0]!;
  const b = values[z0 * grid.cols + x1]!;
  const c = values[z1 * grid.cols + x0]!;
  const d = values[z1 * grid.cols + x1]!;
  return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * tz;
}

export function sampleCategorical<T>(grid: GridSpec, values: readonly T[], point: Vec2): T | undefined {
  if (values.length !== grid.cols * grid.rows) throw new Error('grid-value-count-mismatch');
  const cell = cellAtWorld(grid, point);
  return cell ? values[cell.index] : undefined;
}
