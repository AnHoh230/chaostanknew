/**
 * Modul-Boden (crude Render): legt pro platziertem Modul-Footprint eine flache, texturierte
 * Bodenplatte (Theme -> Tile) knapp über den Basis-Boden. So lesen die Distrikte als eigene
 * Flächen (Depot = Beton, Schlamm = Dreck, Krater = rissig …) statt überall Öldreck. Zwischen
 * den Modulen bleibt bewusst der prozedurale Ödland-Boden.
 *
 * Footprint kommt aus cityGen.blockRects (Welt-Mittelpunkt + Größe inkl. Theme). Eine Platte je
 * Modul (≤ ~12), eingefroren, nicht pickbar.
 */
import { MeshBuilder, StandardMaterial, Texture, Color3 } from '@babylonjs/core';
import type { Scene, Mesh } from '@babylonjs/core';
import type { BlockRect } from './cityGen';
import { bodenFuerTheme } from './tileAssets';

const TILE_WORLD = 12; // Welt-Größe einer Boden-Kachel (Tiling-Periode)
const Y = 0.03; // über Basis-Boden (0), unter Straßen (0.06)

export interface GroundTilesHandle {
  dispose(): void;
}

export function createGroundTiles(scene: Scene, blocks: readonly BlockRect[]): GroundTilesHandle {
  const meshes: Mesh[] = [];
  for (const b of blocks) {
    if (b.w <= 0 || b.h <= 0) continue;
    const q = MeshBuilder.CreateGround('boden_' + b.id, { width: b.w, height: b.h }, scene);
    q.position.set(b.x, Y, b.z);
    const m = new StandardMaterial('bodenmat_' + b.id, scene);
    const t = new Texture(bodenFuerTheme(b.theme), scene);
    t.wrapU = Texture.WRAP_ADDRESSMODE;
    t.wrapV = Texture.WRAP_ADDRESSMODE;
    t.uScale = Math.max(1, Math.round(b.w / TILE_WORLD));
    t.vScale = Math.max(1, Math.round(b.h / TILE_WORLD));
    m.diffuseTexture = t;
    m.specularColor = new Color3(0, 0, 0);
    q.material = m;
    q.isPickable = false;
    q.freezeWorldMatrix();
    meshes.push(q);
  }
  return {
    dispose(): void {
      for (const x of meshes) {
        x.material?.dispose(false, true); // inkl. Texturen
        x.dispose();
      }
    },
  };
}
