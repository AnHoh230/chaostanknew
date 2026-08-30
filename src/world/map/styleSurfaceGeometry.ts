import type { Vec2 } from './mapTypes';
import type { GridSpec } from './worldTypes';

export interface MeshGeometryData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

export interface TransitionGeometryInput {
  center: Vec2;
  tangent: Vec2;
  normal: Vec2;
  length: number;
}

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`invalid-style-geometry-${label}:${value}`);
}

function emptyGeometry(): MeshGeometryData {
  return { positions: [], normals: [], uvs: [], indices: [] };
}

function addQuad(
  geometry: MeshGeometryData,
  points: readonly [Vec2, Vec2, Vec2, Vec2],
  uvs: readonly [number, number, number, number, number, number, number, number],
): void {
  const base = geometry.positions.length / 3;
  for (const point of points) geometry.positions.push(point.x, 0, point.z);
  geometry.normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
  geometry.uvs.push(...uvs);
  geometry.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

export function buildCellSurfaceGeometry(
  grid: GridSpec,
  cells: readonly number[],
  uvScale: number,
): MeshGeometryData {
  assertPositive(uvScale, 'uv-scale');
  const geometry = emptyGeometry();
  const uniqueCells = [...new Set(cells)].sort((a, b) => a - b);
  for (const cell of uniqueCells) {
    if (!Number.isInteger(cell) || cell < 0 || cell >= grid.cols * grid.rows) {
      throw new Error(`style-surface-cell-out-of-range:${cell}`);
    }
    const col = cell % grid.cols;
    const row = Math.floor(cell / grid.cols);
    const x0 = -grid.extents.halfX + col * grid.cellSize;
    const z0 = -grid.extents.halfZ + row * grid.cellSize;
    const x1 = x0 + grid.cellSize;
    const z1 = z0 + grid.cellSize;
    addQuad(
      geometry,
      [{ x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 }],
      [x0 / uvScale, z0 / uvScale, x1 / uvScale, z0 / uvScale, x1 / uvScale, z1 / uvScale, x0 / uvScale, z1 / uvScale],
    );
  }
  return geometry;
}

function unit(vector: Vec2, label: string): Vec2 {
  const length = Math.hypot(vector.x, vector.z);
  if (!Number.isFinite(length) || length <= 1e-8) throw new Error(`invalid-transition-${label}`);
  return { x: vector.x / length, z: vector.z / length };
}

export function buildTransitionGeometry(
  input: TransitionGeometryInput,
  blendWidth: number,
  uvScale: number,
): MeshGeometryData {
  assertPositive(input.length, 'transition-length');
  assertPositive(blendWidth, 'transition-width');
  assertPositive(uvScale, 'uv-scale');
  const tangent = unit(input.tangent, 'tangent');
  const normal = unit(input.normal, 'normal');
  const halfLength = input.length / 2;
  const halfWidth = blendWidth / 2;
  const point = (along: number, across: number): Vec2 => ({
    x: input.center.x + tangent.x * along + normal.x * across,
    z: input.center.z + tangent.z * along + normal.z * across,
  });
  const geometry = emptyGeometry();
  addQuad(
    geometry,
    [
      point(-halfLength, -halfWidth),
      point(-halfLength, halfWidth),
      point(halfLength, halfWidth),
      point(halfLength, -halfWidth),
    ],
    [0, 0, 1, 0, 1, input.length / uvScale, 0, input.length / uvScale],
  );
  return geometry;
}
