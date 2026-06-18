import { UniversalCamera, Vector3 } from '@babylonjs/core';
import type { Scene, TransformNode, Camera } from '@babylonjs/core';

// Feste Schräg-/Höhen-Distanz hinter und über dem Ziel -> 2.5D-Look.
const OFFSET = new Vector3(0, 20, -20);

/**
 * Perspektivische Folgekamera mit kleinem FOV und fester Schräg-Distanz.
 * Nicht frei drehbar (Slice 1a): kein attachControl. Folgt dem Ziel pro Frame.
 */
export function createCameraRig(scene: Scene, target: TransformNode): Camera {
  const cam = new UniversalCamera('cam', target.position.add(OFFSET), scene);
  cam.fov = 0.55; // kleiner FOV verstärkt den 2.5D-Eindruck
  cam.minZ = 0.1;
  cam.maxZ = 2000;
  cam.setTarget(target.position.clone());

  scene.onBeforeRenderObservable.add(() => {
    const t = target.position;
    cam.position.set(t.x + OFFSET.x, t.y + OFFSET.y, t.z + OFFSET.z);
    cam.setTarget(t);
  });

  return cam;
}
