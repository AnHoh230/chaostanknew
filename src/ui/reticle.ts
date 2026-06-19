import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import type { Scene, Mesh, Vector3 } from '@babylonjs/core';

export interface Reticle {
  update(target: Vector3 | null): void;
}

/**
 * In-Engine-Fadenkreuz auf der Bodenebene. Wird im SELBEN Frame wie der Turm
 * aktualisiert (gleicher Render-Weg) — dadurch kein Versatz zwischen sichtbarem
 * Ziel und Turmrohr mehr. Ersetzt den OS-Mauszeiger (canvas cursor:none).
 */
export function createReticle(scene: Scene): Reticle {
  const mat = new StandardMaterial('reticle_mat', scene);
  mat.emissiveColor = new Color3(0.95, 0.97, 1);
  mat.disableLighting = true;

  // Torus liegt um die Y-Achse -> flach in der XZ-Ebene (Ring auf dem Boden).
  const ring: Mesh = MeshBuilder.CreateTorus(
    'reticle_ring',
    { diameter: 1.7, thickness: 0.13, tessellation: 28 },
    scene,
  );
  ring.material = mat;
  ring.isPickable = false;

  const dot: Mesh = MeshBuilder.CreateSphere('reticle_dot', { diameter: 0.28, segments: 8 }, scene);
  dot.material = mat;
  dot.isPickable = false;

  function update(target: Vector3 | null): void {
    const on = target !== null;
    ring.setEnabled(on);
    dot.setEnabled(on);
    if (target) {
      ring.position.set(target.x, 0.12, target.z);
      dot.position.set(target.x, 0.12, target.z);
    }
  }

  return { update };
}
