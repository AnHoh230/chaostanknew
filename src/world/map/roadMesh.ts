/**
 * Korridor-Render: Die logische Breite und Belegungszellen bleiben im Generatorergebnis.
 * Sichtbar wird die geglaettete Centerline als breites Ribbon gerendert, damit diagonale und
 * feldgefuehrte Wege nicht wieder in orthogonale Einzeltiles zerfallen.
 */
import { Color3, MeshBuilder, StandardMaterial, Texture, Vector2, Vector3 } from '@babylonjs/core';
import type { Mesh, Scene } from '@babylonjs/core';
import { ROAD_TILE } from './tileAssets';
import type { GridSpec, RoutedCorridor } from './worldTypes';

const Y = 0.065;

export interface RoadMeshHandle { dispose(): void }

/** Reine Debug-/Topologieprojektion der weiterhin autoritativen Korridorzellen. */
export function corridorRenderCells(corridors: readonly RoutedCorridor[], grid: GridSpec): string[] {
  const cells = new Set<number>();
  corridors.forEach((corridor) => corridor.cells.forEach((cell) => {
    if (cell >= 0 && cell < grid.cols * grid.rows) cells.add(cell);
  }));
  return [...cells]
    .sort((a, b) => a - b)
    .map((cell) => `${cell % grid.cols},${Math.floor(cell / grid.cols)}`);
}

function densify(corridor: RoutedCorridor, step: number): Array<{ x: number; z: number }> {
  const source = corridor.centerline;
  if (source.length < 2) return [];
  const result: Array<{ x: number; z: number }> = [{ ...source[0]! }];
  for (let index = 1; index < source.length; index++) {
    const a = source[index - 1]!, b = source[index]!;
    const distance = Math.hypot(b.x - a.x, b.z - a.z);
    const subdivisions = Math.max(1, Math.ceil(distance / step));
    for (let part = 1; part <= subdivisions; part++) {
      const t = part / subdivisions;
      result.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return result;
}

interface RibbonGeometry {
  sides: [Vector3[], Vector3[]];
  uvs: Vector2[];
}

function ribbonGeometry(corridor: RoutedCorridor, grid: GridSpec): RibbonGeometry | null {
  const points = densify(corridor, grid.cellSize);
  if (points.length < 2) return null;
  const left: Vector3[] = [];
  const right: Vector3[] = [];
  const leftUvs: Vector2[] = [];
  const rightUvs: Vector2[] = [];
  const halfWidth = corridor.width * 0.48;
  let travelled = 0;
  points.forEach((point, index) => {
    const before = points[Math.max(0, index - 1)]!;
    const after = points[Math.min(points.length - 1, index + 1)]!;
    if (index > 0) travelled += Math.hypot(point.x - before.x, point.z - before.z);
    const dx = after.x - before.x, dz = after.z - before.z;
    const length = Math.hypot(dx, dz) || 1;
    const nx = -dz / length, nz = dx / length;
    left.push(new Vector3(point.x + nx * halfWidth, Y, point.z + nz * halfWidth));
    right.push(new Vector3(point.x - nx * halfWidth, Y, point.z - nz * halfWidth));
    const v = travelled / grid.cellSize;
    leftUvs.push(new Vector2(0, v));
    rightUvs.push(new Vector2(1, v));
  });
  return { sides: [left, right], uvs: [...leftUvs, ...rightUvs] };
}

export function createRoadMesh(
  scene: Scene,
  corridors: readonly RoutedCorridor[],
  grid: GridSpec,
): RoadMeshHandle {
  const material = new StandardMaterial('corridor_road_material', scene);
  const texture = new Texture(ROAD_TILE.gerade, scene);
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.uScale = 1;
  texture.vScale = 1;
  texture.anisotropicFilteringLevel = 16;
  texture.hasAlpha = true;
  material.diffuseTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.specularColor = new Color3(0, 0, 0);
  material.backFaceCulling = false;

  const meshes: Mesh[] = [];
  for (const corridor of corridors) {
    const geometry = ribbonGeometry(corridor, grid);
    if (!geometry) continue;
    const mesh = MeshBuilder.CreateRibbon(
      `road_corridor_${corridor.id}`,
      {
        pathArray: geometry.sides,
        uvs: geometry.uvs,
        closeArray: false,
        closePath: false,
        sideOrientation: 2,
      },
      scene,
    );
    mesh.material = material;
    mesh.isPickable = false;
    mesh.renderingGroupId = 0;
    mesh.alphaIndex = 2;
    mesh.freezeWorldMatrix();
    meshes.push(mesh);
  }

  return {
    dispose(): void {
      meshes.forEach((mesh) => mesh.dispose());
      material.dispose(false, true);
    },
  };
}
