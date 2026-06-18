import { Vector3, PointerEventTypes, Matrix } from '@babylonjs/core';
import type { Scene, Camera } from '@babylonjs/core';
import type { Tank } from '../tank/tank';
import { createLogger } from '../core/log';
import { yawTo, rayGroundY0 } from './aimMath';

export function createInput(
  scene: Scene,
  camera: Camera,
  tank: Tank,
  speed: number,
  onFire: () => void,
): { update(simDt: number): void; getAimTarget(): Vector3 | null } {
  const log = createLogger('input');

  const keys: Record<string, boolean> = Object.create(null);
  let aimTarget: Vector3 | null = null;

  const onKeyDown = (ev: KeyboardEvent): void => {
    const k = ev.key.toLowerCase();
    keys[k] = true;
    if (k === 'm') {
      log.info('map toggle');
    }
  };
  const onKeyUp = (ev: KeyboardEvent): void => {
    keys[ev.key.toLowerCase()] = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type === PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 0) {
      onFire();
    }
  });

  function update(simDt: number): void {
    const root = tank.view.root;

    // WASD: Bewegung in der X/Z-Ebene, framerate-unabhängig (speed * simDt).
    let mx = 0;
    let mz = 0;
    if (keys['w']) mz += 1;
    if (keys['s']) mz -= 1;
    if (keys['a']) mx -= 1;
    if (keys['d']) mx += 1;
    if (mx !== 0 || mz !== 0) {
      const len = Math.hypot(mx, mz);
      const step = speed * simDt;
      root.position.addInPlace(new Vector3((mx / len) * step, 0, (mz / len) * step));
    }

    // Zielen: JEDEN Frame den AKTUELLEN Cursor frisch auf die Bodenebene (y=0)
    // projizieren — NICHT einen gespeicherten Welt-Punkt wiederverwenden. Sonst
    // läuft das Ziel weg, sobald die Kamera mitfährt (bewiesener Bug: AIM ERROR -> 120°).
    const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), camera);
    const g = rayGroundY0(
      ray.origin.x,
      ray.origin.y,
      ray.origin.z,
      ray.direction.x,
      ray.direction.y,
      ray.direction.z,
    );
    if (g) {
      aimTarget = new Vector3(g.x, 0, g.z);
      const turret = tank.view.turretNode;
      turret.computeWorldMatrix(true);
      const tp = turret.getAbsolutePosition();
      turret.rotation.y = yawTo(tp.x, tp.z, g.x, g.z);
    }
  }

  function getAimTarget(): Vector3 | null {
    return aimTarget;
  }

  return { update, getAimTarget };
}
