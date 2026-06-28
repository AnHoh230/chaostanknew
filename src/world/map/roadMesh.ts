/**
 * Straßen-Render (crude): malt die vom Wegzeichner erzeugten Road-Zellen als flache, dunkle
 * Kacheln knapp über dem Boden — ein sichtbares Asphaltband statt eines Mathe-Strichs. Alles zu
 * EINEM Mesh gemergt, eingefroren, nicht pickbar. Optik folgt später; hier geht es ums Sehen.
 *
 * Zell→Welt passend zum Painter (moduleRoads.weltZuZelle): x = col*cs - halfX, z = row*cs - halfZ.
 */
import { MeshBuilder, StandardMaterial, Color3, Mesh } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';

export interface RoadMeshHandle {
  dispose(): void;
}

export function createRoadMesh(
  scene: Scene,
  roadZellen: readonly string[],
  cellSize: number,
  halfX: number,
  halfZ: number,
): RoadMeshHandle {
  if (roadZellen.length === 0) return { dispose() {} };

  const mat = new StandardMaterial('road_mat', scene);
  mat.diffuseColor = new Color3(0.12, 0.12, 0.14); // dunkler Asphalt
  mat.specularColor = new Color3(0.02, 0.02, 0.03);

  const parts: Mesh[] = [];
  for (const key of roadZellen) {
    const komma = key.indexOf(',');
    const col = Number(key.slice(0, komma));
    const row = Number(key.slice(komma + 1));
    const tile = MeshBuilder.CreateBox('road_t', { width: cellSize + 0.4, height: 0.08, depth: cellSize + 0.4 }, scene);
    tile.position.set(col * cellSize - halfX, 0.05, row * cellSize - halfZ);
    tile.isPickable = false;
    parts.push(tile);
  }

  const merged = parts.length === 1 ? parts[0] : Mesh.MergeMeshes(parts, true, true, undefined, false, false);
  if (merged) {
    merged.name = 'roads';
    merged.material = mat;
    merged.isPickable = false;
    merged.freezeWorldMatrix();
  }

  return {
    dispose(): void {
      merged?.dispose();
      mat.dispose();
    },
  };
}
