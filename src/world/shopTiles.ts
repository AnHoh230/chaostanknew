import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import type { Scene, Mesh } from '@babylonjs/core';
import { onAnyTile, nearestTile, type TilePos } from './shopTilesMath';

/** Feste Shop-Felder in der Welt (endlose Welt → fixe Weltkoordinaten, erreichbar). */
const DEFAULT_TILES: TilePos[] = [
  { x: 40, z: 0 },
  { x: -40, z: 0 },
  { x: 0, z: 40 },
  { x: 0, z: -40 },
  { x: 85, z: 85 },
  { x: -85, z: -85 },
  { x: 85, z: -85 },
  { x: -85, z: 85 },
];

export const TILE_RADIUS = 5.5; // Spieler "auf dem Feld", wenn Mittelpunktabstand <= dies

export interface ShopField {
  positions: readonly TilePos[];
  isOnTile(x: number, z: number): boolean;
  nearest(x: number, z: number): { x: number; z: number; dist: number } | null;
  update(): void;
}

/** Leuchtende Scheibe + hoher Beacon-Pfeiler je Feld (aus der Ferne sichtbar). */
export function createShopField(scene: Scene, tiles: TilePos[] = DEFAULT_TILES): ShopField {
  const discMat = new StandardMaterial('shoptile_mat', scene);
  discMat.emissiveColor = new Color3(0.12, 0.62, 0.9); // cyan-blau (≠ gelbes Loot)
  discMat.disableLighting = true;
  discMat.alpha = 0.5;

  const beaconMat = new StandardMaterial('shopbeacon_mat', scene);
  beaconMat.emissiveColor = new Color3(0.2, 0.75, 1);
  beaconMat.disableLighting = true;
  beaconMat.alpha = 0.7;

  const discs: Mesh[] = [];
  for (const t of tiles) {
    const disc = MeshBuilder.CreateCylinder(
      'shoptile',
      { diameter: TILE_RADIUS * 2, height: 0.18, tessellation: 28 },
      scene,
    );
    disc.material = discMat;
    disc.isPickable = false;
    disc.position.set(t.x, 0.09, t.z);
    discs.push(disc);

    const beacon = MeshBuilder.CreateBox('shopbeacon', { width: 0.7, depth: 0.7, height: 7 }, scene);
    beacon.material = beaconMat;
    beacon.isPickable = false;
    beacon.position.set(t.x, 3.5, t.z);
  }

  let phase = 0;
  function update(): void {
    phase += 0.05;
    discMat.alpha = 0.35 + 0.2 * Math.sin(phase);
  }

  return {
    positions: tiles,
    isOnTile: (x, z) => onAnyTile(tiles, x, z, TILE_RADIUS),
    nearest: (x, z) => nearestTile(tiles, x, z),
    update,
  };
}
