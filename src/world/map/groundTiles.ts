/**
 * Modul-Boden (crude Render): legt pro platziertem Modul-Footprint eine flache, texturierte
 * Bodenplatte (Theme -> nahtlos gebackene Textur) knapp über den Basis-Boden. So lesen die
 * Distrikte als eigene Flächen (Depot = Beton, Schlamm = Dreck, Krater = rissig …).
 *
 * Damit die Platten NICHT als harte Rechtecke erscheinen ("verschieden große Vierecke"), bekommt
 * jede eine organisch ausgefranste Kanten-Maske (opacityTexture, tools/bakeMask.mjs) -> weicher
 * Material-Fleck, der in den Hauptboden übergeht. Alle flachen Layer in renderingGroupId 0 (damit
 * Panzer/Props sie per Tiefentest verdecken); alphaIndex schichtet sie: Boden < Straße < Decal.
 *
 * Footprint kommt aus cityGen.blockRects (Welt-Mittelpunkt + Größe inkl. Theme). Eine Platte je
 * Modul (≤ ~12), eingefroren, nicht pickbar.
 */
import { MeshBuilder, StandardMaterial, Texture, Color3 } from '@babylonjs/core';
import type { Scene, Mesh } from '@babylonjs/core';
import type { BlockRect } from './cityGen';
import { bodenFuerTheme } from './tileAssets';

const TILE_WORLD = 90; // Welt-Periode der gebackenen Theme-Textur (groß -> meist 1x pro Modul = kein Raster)
const Y = 0.03; // über Basis-Boden (0), unter Straßen (0.06)
const ANZ_MASKEN = 6; // mask_0..5

export interface GroundTilesHandle {
  dispose(): void;
}

export function createGroundTiles(scene: Scene, blocks: readonly BlockRect[]): GroundTilesHandle {
  const meshes: Mesh[] = [];
  blocks.forEach((b, i) => {
    if (b.w <= 0 || b.h <= 0) return;
    const q = MeshBuilder.CreateGround('boden_' + b.id, { width: b.w, height: b.h }, scene);
    q.position.set(b.x, Y, b.z);

    const m = new StandardMaterial('bodenmat_' + b.id, scene);
    const t = new Texture(bodenFuerTheme(b.theme), scene);
    t.wrapU = Texture.WRAP_ADDRESSMODE;
    t.wrapV = Texture.WRAP_ADDRESSMODE;
    t.uScale = Math.max(1, Math.round(b.w / TILE_WORLD));
    t.vScale = Math.max(1, Math.round(b.h / TILE_WORLD));
    m.diffuseTexture = t;

    // Organische Kanten-Maske -> kein hartes Rechteck, sondern ein weicher ausgefranster Fleck.
    const maske = new Texture(`/tiles/mask_${i % ANZ_MASKEN}.png`, scene);
    maske.getAlphaFromRGB = true;
    maske.wrapU = Texture.CLAMP_ADDRESSMODE;
    maske.wrapV = Texture.CLAMP_ADDRESSMODE;
    m.opacityTexture = maske;

    m.specularColor = new Color3(0, 0, 0);
    q.material = m;
    q.isPickable = false;
    q.renderingGroupId = 0; // alle flachen Layer in Gruppe 0 -> Tiefentest verdeckt sie hinter Panzer/Props
    q.alphaIndex = 1; // Reihenfolge der transparenten Flach-Layer: Modul-Boden (1) < Straße (2) < Decal (3)
    q.freezeWorldMatrix();
    meshes.push(q);
  });

  return {
    dispose(): void {
      for (const x of meshes) {
        x.material?.dispose(false, true); // inkl. Texturen (Diffuse + Maske)
        x.dispose();
      }
    },
  };
}
