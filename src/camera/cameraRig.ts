import { UniversalCamera, Vector3 } from '@babylonjs/core';
import type { Scene, TransformNode, Camera } from '@babylonjs/core';

// Höhe über und Distanz hinter dem Ziel + FOV bestimmen Winkel, Distanz und Zoom.
// Höher = steiler (mehr Draufsicht), größerer Betrag von back = flacher/weiter.
const HEIGHT = 25; // über dem Ziel
const BACK = 55; // hinter dem Ziel (−Z)
const FOV = 0.87;

/**
 * Perspektivische Folgekamera mit fester Schräg-Distanz (2.5D-Look). Folgt dem
 * Ziel pro Frame. Live-Tuning über window.__cam.set(height, back, fov).
 */
export function createCameraRig(scene: Scene, target: TransformNode): Camera {
  const off = { height: HEIGHT, back: BACK };
  const cam = new UniversalCamera(
    'cam',
    target.position.add(new Vector3(0, off.height, -off.back)),
    scene,
  );
  cam.fov = FOV;
  cam.minZ = 0.1;
  cam.maxZ = 2000;
  cam.setTarget(target.position.clone());

  scene.onBeforeRenderObservable.add(() => {
    const t = target.position;
    cam.position.set(t.x, t.y + off.height, t.z - off.back);
    cam.setTarget(t);
  });

  // Debug-Live-Regler: in der Konsole z. B. __cam.set(38, 22, 0.55) ausprobieren.
  (window as unknown as { __cam: unknown }).__cam = {
    set(height: number, back: number, fov?: number): void {
      off.height = height;
      off.back = back;
      if (fov !== undefined) cam.fov = fov;
    },
    get: () => ({ height: off.height, back: off.back, fov: cam.fov }),
  };

  return cam;
}
