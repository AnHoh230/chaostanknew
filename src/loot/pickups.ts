import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import type { Scene, Mesh } from '@babylonjs/core';
import { circleOverlap } from '../combat/hitMath';
import type { ShopItem } from '../shop/catalog';

interface Pickup {
  id: number;
  part: ShopItem;
  x: number;
  z: number;
  mesh: Mesh;
}

export interface PickupInfo {
  id: number;
  x: number;
  z: number;
  name: string;
}

export interface PickupField {
  spawn(part: ShopItem, x: number, z: number): void;
  update(playerX: number, playerZ: number, radius: number, onCollect: (part: ShopItem) => void): void;
  /** Aktuelle Beute-Teile (Position + Name) — für Namens-Labels und Gegner-Jagd. */
  list(): PickupInfo[];
  /** Nächstes Teil innerhalb maxDist zu (x,z) — oder null. */
  nearest(x: number, z: number, maxDist: number): { id: number; x: number; z: number; dist: number } | null;
  /** Erstes Teil im Radius um (x,z) einsammeln (für Gegner): entfernt + liefert es. */
  collectAt(x: number, z: number, radius: number): ShopItem | null;
  count(): number;
}

/**
 * Beute-Teile liegen als leuchtende Würfel in der Welt. Fährt der Spieler in
 * Reichweite, wird das Teil eingesammelt (onCollect) und der Würfel verschwindet.
 * Gegner können Teile über collectAt einsammeln (Schatzjäger).
 */
export function createPickupField(scene: Scene): PickupField {
  const items: Pickup[] = [];
  const mat = new StandardMaterial('pickup_mat', scene);
  mat.emissiveColor = new Color3(1, 0.85, 0.2);
  mat.disableLighting = true;
  let spin = 0;
  let seq = 0;

  function spawn(part: ShopItem, x: number, z: number): void {
    const mesh = MeshBuilder.CreateBox('pickup_' + part.id + '_' + seq, { size: 0.9 }, scene);
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.position.set(x, 0.7, z);
    items.push({ id: seq++, part, x, z, mesh });
  }

  function update(
    playerX: number,
    playerZ: number,
    radius: number,
    onCollect: (part: ShopItem) => void,
  ): void {
    spin += 0.03;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]!;
      it.mesh.rotation.y = spin;
      if (circleOverlap(playerX, playerZ, radius, it.x, it.z, 0.6)) {
        it.mesh.dispose();
        items.splice(i, 1);
        onCollect(it.part);
      }
    }
  }

  function list(): PickupInfo[] {
    return items.map((it) => ({ id: it.id, x: it.x, z: it.z, name: it.part.name }));
  }

  function nearest(
    x: number,
    z: number,
    maxDist: number,
  ): { id: number; x: number; z: number; dist: number } | null {
    let best: { id: number; x: number; z: number; dist: number } | null = null;
    for (const it of items) {
      const d = Math.hypot(it.x - x, it.z - z);
      if (d <= maxDist && (!best || d < best.dist)) best = { id: it.id, x: it.x, z: it.z, dist: d };
    }
    return best;
  }

  function collectAt(x: number, z: number, radius: number): ShopItem | null {
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      if (circleOverlap(x, z, radius, it.x, it.z, 0.6)) {
        it.mesh.dispose();
        items.splice(i, 1);
        return it.part;
      }
    }
    return null;
  }

  function count(): number {
    return items.length;
  }

  return { spawn, update, list, nearest, collectAt, count };
}
