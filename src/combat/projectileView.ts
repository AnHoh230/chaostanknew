import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import type { Scene, Mesh } from '@babylonjs/core';
import type { ProjectilePool, Projectile } from './projectilePool';

export interface ProjectileView {
  /** Synchronisiert sichtbare Meshes mit den aktiven (inflight) Projektilen des Pools. */
  sync(): void;
  /** Anzahl aktuell SICHTBARER (enabled) Projektil-Meshes — fuer §21.5 Log-Abgleich. */
  visibleCount(): number;
  dispose(): void;
}

/**
 * Erzeugt capacity vorab-allokierte Kugel-Meshes (Pooling, kein Spawn/Dispose im Flug).
 * sync() bindet jedes inflight-Projektil an genau ein Mesh und versteckt den Rest.
 */
export function createProjectileView(
  scene: Scene,
  pool: ProjectilePool,
  capacity: number,
): ProjectileView {
  const mat = new StandardMaterial('projectileMat', scene);
  mat.diffuseColor = new Color3(1, 0.85, 0.2);
  mat.emissiveColor = new Color3(0.8, 0.6, 0.05);

  const meshes: Mesh[] = [];
  for (let i = 0; i < capacity; i++) {
    const m = MeshBuilder.CreateSphere(`projectile_${i}`, { diameter: 0.4, segments: 6 }, scene);
    m.material = mat;
    m.isPickable = false;
    m.setEnabled(false);
    meshes.push(m);
  }

  let visible = 0;

  function sync(): void {
    let i = 0;
    pool.forEachActive((p: Projectile) => {
      const m = meshes[i];
      if (m) {
        m.position.set(p.x, p.y, p.z);
        m.setEnabled(true);
      }
      i++;
    });
    // Restliche Meshes verstecken -> sichtbar == aktiv.
    for (let j = i; j < meshes.length; j++) {
      meshes[j].setEnabled(false);
    }
    visible = i;
  }

  function visibleCount(): number {
    return visible;
  }

  function dispose(): void {
    for (const m of meshes) m.dispose();
    mat.dispose();
  }

  return { sync, visibleCount, dispose };
}
