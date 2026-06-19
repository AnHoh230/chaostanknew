import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import type { Scene, Mesh } from '@babylonjs/core';
import { circleOverlap } from '../combat/hitMath';
import type { Part } from './parts';

interface Pickup {
  part: Part;
  x: number;
  z: number;
  mesh: Mesh;
}

export interface PickupField {
  spawn(part: Part, x: number, z: number): void;
  update(playerX: number, playerZ: number, radius: number, onCollect: (part: Part) => void): void;
  count(): number;
}

/**
 * Beute-Teile liegen als leuchtende Würfel in der Welt. Fährt der Spieler in
 * Reichweite, wird das Teil eingesammelt (onCollect) und der Würfel verschwindet.
 */
export function createPickupField(scene: Scene): PickupField {
  const items: Pickup[] = [];
  const mat = new StandardMaterial('pickup_mat', scene);
  mat.emissiveColor = new Color3(1, 0.85, 0.2);
  mat.disableLighting = true;
  let spin = 0;
  let seq = 0;

  function spawn(part: Part, x: number, z: number): void {
    const mesh = MeshBuilder.CreateBox('pickup_' + part.id + '_' + seq++, { size: 0.9 }, scene);
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.position.set(x, 0.7, z);
    items.push({ part, x, z, mesh });
  }

  function update(
    playerX: number,
    playerZ: number,
    radius: number,
    onCollect: (part: Part) => void,
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

  function count(): number {
    return items.length;
  }

  return { spawn, update, count };
}
