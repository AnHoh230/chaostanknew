import { Color3, Mesh, StandardMaterial, VertexData } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import { buildRegionGroundData } from './regionGroundData';
import type { RuntimeKarte } from './runtimeMap';
import type { BiomeId } from './worldTypes';

const BIOME_COLORS: Record<BiomeId, [number, number, number]> = {
  wasteland: [0.29, 0.27, 0.23],
  scrap: [0.34, 0.29, 0.23],
  industrial: [0.25, 0.28, 0.3],
  mud: [0.23, 0.2, 0.14],
  ruins: [0.3, 0.3, 0.27],
  crater: [0.22, 0.2, 0.2],
};

export interface RegionGroundHandle { dispose(): void }

export function createRegionGround(scene: Scene, runtime: RuntimeKarte): RegionGroundHandle {
  const data = buildRegionGroundData(runtime);
  const meshes: Mesh[] = [];
  for (const [biome, meshData] of Object.entries(data) as [BiomeId, ReturnType<typeof buildRegionGroundData>[BiomeId]][]) {
    if (meshData.cellCount === 0) continue;
    const mesh = new Mesh(`region_ground_${biome}`, scene);
    const vertexData = new VertexData();
    vertexData.positions = meshData.positions;
    vertexData.normals = meshData.normals;
    vertexData.uvs = meshData.uvs;
    vertexData.indices = meshData.indices;
    vertexData.applyToMesh(mesh);
    const material = new StandardMaterial(`region_ground_material_${biome}`, scene);
    const [r, g, b] = BIOME_COLORS[biome];
    material.diffuseColor = new Color3(r, g, b);
    material.specularColor = new Color3(0, 0, 0);
    mesh.material = material;
    mesh.position.y = 0.025;
    mesh.isPickable = false;
    mesh.freezeWorldMatrix();
    meshes.push(mesh);
  }
  return {
    dispose(): void {
      for (const mesh of meshes) {
        mesh.material?.dispose(false, true);
        mesh.dispose();
      }
    },
  };
}
