import { Vector3, PointerEventTypes } from '@babylonjs/core';
import type { Scene, PickingInfo } from '@babylonjs/core';
import type { Tank } from '../tank/tank';
import { createLogger } from '../core/log';

export function createInput(
  scene: Scene,
  tank: Tank,
  speed: number,
  onFire: () => void,
): { update(simDt: number): void } {
  const log = createLogger('input');

  const keys: Record<string, boolean> = Object.create(null);
  let pointerGroundTarget: Vector3 | null = null;

  function isGroundPick(info: PickingInfo | null): boolean {
    return !!info && info.hit && !!info.pickedPoint;
  }

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
    if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
      const pick = scene.pick(scene.pointerX, scene.pointerY);
      if (isGroundPick(pick) && pick.pickedPoint) {
        pointerGroundTarget = pick.pickedPoint.clone();
      }
    } else if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
      // button 0 = Linksklick
      if (pointerInfo.event.button === 0) {
        onFire();
      }
    }
  });

  function update(simDt: number): void {
    const root = tank.view.root;

    // WASD: Bewegung in X/Z-Ebene, distanz = speed * simDt
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

    // Maus: Turm zum Boden-Pointer drehen (Y-Yaw via atan2)
    if (pointerGroundTarget) {
      const turret = tank.view.turretNode;
      const worldRoot = root.position;
      const dx = pointerGroundTarget.x - worldRoot.x;
      const dz = pointerGroundTarget.z - worldRoot.z;
      if (dx !== 0 || dz !== 0) {
        turret.rotation.y = Math.atan2(dx, dz);
      }
    }
  }

  return { update };
}
