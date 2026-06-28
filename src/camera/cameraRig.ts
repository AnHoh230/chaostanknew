import { UniversalCamera, Vector3 } from '@babylonjs/core';
import type { Scene, TransformNode, Camera } from '@babylonjs/core';
import { fovForAspect } from './cameraFov';

// Höhe über und Distanz hinter dem Ziel + FOV bestimmen Winkel, Distanz und Zoom.
// Höher = steiler (mehr Draufsicht), größerer Betrag von back = flacher/weiter.
const HEIGHT = 25; // über dem Ziel
const BACK = 55; // hinter dem Ziel (−Z)
const FOV = 0.87;

/**
 * Perspektivische Folgekamera mit fester Schräg-Distanz (2.5D-Look). Folgt dem
 * Ziel pro Frame. Live-Tuning über window.__cam.set(height, back, fov).
 *
 * Vorschub-Offset (setOffset): verschiebt BLICKPUNKT *und* Kamera um denselben
 * Welt-Vektor (x,z). Dadurch rückt nicht der Panzer in die Mitte, sondern ein
 * Punkt VOR ihm — der Panzer rutscht an den Rand, man sieht weit in Blickrichtung
 * (Sniper-Scope). Offset 0/0 = normale Folgekamera (Panzer mittig).
 */
export function createCameraRig(scene: Scene, target: TransformNode): Camera {
  const off = { height: HEIGHT, back: BACK, ox: 0, oz: 0 };
  const cam = new UniversalCamera(
    'cam',
    target.position.add(new Vector3(0, off.height, -off.back)),
    scene,
  );
  // baseFov = gewünschte vertikale FOV bei 16:9; die effektive cam.fov wird daraus
  // pro Aspect abgeleitet, damit breite/große Displays NICHT mehr Welt sehen.
  let baseFov = FOV;
  let lastAspect = -1;
  const refreshFov = (): void => {
    const aspect = scene.getEngine().getAspectRatio(cam);
    if (Math.abs(aspect - lastAspect) < 1e-4) return; // nur bei echter Änderung (resize)
    lastAspect = aspect;
    cam.fov = fovForAspect(baseFov, aspect);
  };
  refreshFov();
  cam.minZ = 0.1;
  cam.maxZ = 700; // Ferngrenze bewusst knapp: nichts jenseits des Nebels rendern (main.ts stellt live nach)
  cam.setTarget(target.position.clone());

  scene.onBeforeRenderObservable.add(() => {
    const t = target.position;
    cam.position.set(t.x + off.ox, t.y + off.height, t.z - off.back + off.oz);
    cam.setTarget(new Vector3(t.x + off.ox, t.y, t.z + off.oz));
    refreshFov();
  });

  // Debug-Live-Regler: in der Konsole z. B. __cam.set(38, 22, 0.55) ausprobieren.
  (window as unknown as { __cam: unknown }).__cam = {
    set(height: number, back: number, fov?: number): void {
      off.height = height;
      off.back = back;
      if (fov !== undefined) { baseFov = fov; lastAspect = -1; refreshFov(); } // fov = Basis @16:9; Aspect-Anpassung bleibt aktiv
    },
    setOffset(ox: number, oz: number): void {
      off.ox = ox;
      off.oz = oz;
    },
    // fov = Basis-FOV (NICHT die aspect-reduzierte cam.fov) — sonst würde ein erneutes set() doppelt reduzieren.
    get: () => ({ height: off.height, back: off.back, fov: baseFov, ox: off.ox, oz: off.oz }),
  };

  return cam;
}
