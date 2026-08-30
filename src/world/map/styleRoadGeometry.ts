import type { Vec2 } from './mapTypes';
import type { MeshGeometryData } from './styleSurfaceGeometry';

const EPSILON = 1e-7;
const MITER_LIMIT = 1.75;

function emptyGeometry(): MeshGeometryData {
  return { positions: [], normals: [], uvs: [], indices: [] };
}

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`invalid-road-geometry-${label}:${value}`);
}

function cleanCenterline(centerline: readonly Vec2[]): Vec2[] {
  const result: Vec2[] = [];
  for (const point of centerline) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) throw new Error('road-centerline-non-finite');
    const previous = result.at(-1);
    if (!previous || Math.hypot(point.x - previous.x, point.z - previous.z) > EPSILON) {
      result.push({ ...point });
    }
  }
  return result;
}

function segmentNormal(a: Vec2, b: Vec2): Vec2 {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  return { x: -dz / length, z: dx / length };
}

function offsetAt(points: readonly Vec2[], index: number, halfWidth: number): Vec2 {
  if (index === 0) {
    const normal = segmentNormal(points[0]!, points[1]!);
    return { x: normal.x * halfWidth, z: normal.z * halfWidth };
  }
  if (index === points.length - 1) {
    const normal = segmentNormal(points[index - 1]!, points[index]!);
    return { x: normal.x * halfWidth, z: normal.z * halfWidth };
  }
  const before = segmentNormal(points[index - 1]!, points[index]!);
  const after = segmentNormal(points[index]!, points[index + 1]!);
  const sumX = before.x + after.x;
  const sumZ = before.z + after.z;
  const sumLength = Math.hypot(sumX, sumZ);
  if (sumLength <= EPSILON) return { x: after.x * halfWidth, z: after.z * halfWidth };
  const miter = { x: sumX / sumLength, z: sumZ / sumLength };
  const denominator = Math.abs(miter.x * after.x + miter.z * after.z);
  const rawLength = denominator <= EPSILON ? halfWidth : halfWidth / denominator;
  const length = Math.min(rawLength, halfWidth * MITER_LIMIT);
  return { x: miter.x * length, z: miter.z * length };
}

export function buildRoadRibbonGeometry(
  centerline: readonly Vec2[],
  width: number,
  uvScale: number,
): MeshGeometryData {
  assertPositive(width, 'width');
  assertPositive(uvScale, 'uv-scale');
  const points = cleanCenterline(centerline);
  if (points.length < 2) return emptyGeometry();
  const geometry = emptyGeometry();
  const halfWidth = width / 2;
  let travelled = 0;
  for (let index = 0; index < points.length; index++) {
    const point = points[index]!;
    if (index > 0) {
      const previous = points[index - 1]!;
      travelled += Math.hypot(point.x - previous.x, point.z - previous.z);
    }
    const offset = offsetAt(points, index, halfWidth);
    geometry.positions.push(
      point.x + offset.x, 0, point.z + offset.z,
      point.x - offset.x, 0, point.z - offset.z,
    );
    geometry.normals.push(0, 1, 0, 0, 1, 0);
    geometry.uvs.push(0, travelled / uvScale, 1, travelled / uvScale);
    if (index > 0) {
      const base = (index - 1) * 2;
      geometry.indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  return geometry;
}

export function buildRoadCapGeometry(
  position: Vec2,
  radius: number,
  uvScale: number,
  segments = 16,
): MeshGeometryData {
  assertPositive(radius, 'cap-radius');
  assertPositive(uvScale, 'uv-scale');
  if (!Number.isInteger(segments) || segments < 3) throw new Error(`invalid-road-cap-segments:${segments}`);
  const geometry = emptyGeometry();
  geometry.positions.push(position.x, 0, position.z);
  geometry.normals.push(0, 1, 0);
  geometry.uvs.push(0.5, 0.5);
  for (let index = 0; index < segments; index++) {
    const angle = (index / segments) * Math.PI * 2;
    const x = Math.cos(angle);
    const z = Math.sin(angle);
    geometry.positions.push(position.x + x * radius, 0, position.z + z * radius);
    geometry.normals.push(0, 1, 0);
    geometry.uvs.push(0.5 + (x * radius) / (uvScale * 2), 0.5 + (z * radius) / (uvScale * 2));
    geometry.indices.push(0, index + 1, ((index + 1) % segments) + 1);
  }
  return geometry;
}
