import { MeshBuilder, StandardMaterial, Color3, Vector3, Matrix } from '@babylonjs/core';
import type { Scene, Camera, Mesh, LinesMesh } from '@babylonjs/core';
import type { Tank } from '../tank/tank';
import { rayGroundY0 } from '../input/aimMath';

export interface AimDebug {
  update(): void;
  setEnabled(on: boolean): void;
}

/** Projiziert den aktuellen Cursor analytisch auf y=0 (GROUND TRUTH des Cursors am Boden). */
function groundPointUnderPointer(scene: Scene, camera: Camera): Vector3 | null {
  const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), camera);
  const g = rayGroundY0(
    ray.origin.x,
    ray.origin.y,
    ray.origin.z,
    ray.direction.x,
    ray.direction.y,
    ray.direction.z,
  );
  return g ? new Vector3(g.x, 0, g.z) : null;
}

/**
 * Mess-Overlay zum Debuggen des Zielens (verändert keine Spiel-Logik).
 * Taste "`" (Backtick) schaltet es ein/aus. Standard: aus.
 *  - gruen: echter Cursor-Bodenpunkt   - rot: worauf der Turm zielt
 *  - gelb:  echte Schussrichtung        - HUD: Live-Zahlen inkl. AIM ERROR
 */
export function createAimDebug(
  scene: Scene,
  camera: Camera,
  tank: Tank,
  getStoredTarget: () => Vector3 | null,
): AimDebug {
  let enabled = false;
  let dbgFrame = 0;
  let loggedErr = false;

  const mkMarker = (name: string, rgb: [number, number, number]): Mesh => {
    const m = MeshBuilder.CreateSphere(name, { diameter: 0.9, segments: 8 }, scene);
    const mat = new StandardMaterial(name + '_mat', scene);
    mat.emissiveColor = new Color3(rgb[0], rgb[1], rgb[2]);
    mat.disableLighting = true;
    m.material = mat;
    m.isPickable = false;
    return m;
  };

  const cursorMarker = mkMarker('dbg_cursor', [0.15, 1, 0.35]);
  const aimTargetMarker = mkMarker('dbg_aimTarget', [1, 0.2, 0.2]);

  let aimLine: LinesMesh = MeshBuilder.CreateLines(
    'dbg_aimLine',
    { points: [Vector3.Zero(), new Vector3(0, 0, 1)], updatable: true },
    scene,
  );
  aimLine.color = new Color3(1, 0.9, 0.1);
  aimLine.isPickable = false;

  const hud = document.createElement('div');
  hud.id = 'aim-debug';
  hud.style.cssText =
    'position:fixed;top:8px;left:8px;z-index:20;font:12px/1.45 monospace;color:#cdd6dd;' +
    'background:rgba(0,0,0,0.6);padding:8px 10px;border:1px solid #2a343b;border-radius:6px;' +
    'white-space:pre;pointer-events:none;';
  document.body.appendChild(hud);

  function setEnabled(on: boolean): void {
    enabled = on;
    cursorMarker.setEnabled(on);
    aimTargetMarker.setEnabled(on);
    aimLine.setEnabled(on);
    hud.style.display = on ? 'block' : 'none';
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.key === '`') setEnabled(!enabled);
  });

  const f2 = (n: number): string => n.toFixed(2);

  function update(): void {
    if (!enabled) return;
    dbgFrame++;
    try {
      const root = tank.view.root;
      const turret = tank.view.turretNode;
      turret.computeWorldMatrix(true);
      const muzzle = turret.getAbsolutePosition();
      const fwd = turret.getDirection(new Vector3(0, 0, 1));
      const flen = Math.hypot(fwd.x, fwd.z) || 1;
      const adx = fwd.x / flen;
      const adz = fwd.z / flen;

      const cursor = groundPointUnderPointer(scene, camera);
      const stored = getStoredTarget();

      if (cursor) {
        cursorMarker.position.copyFrom(cursor);
        cursorMarker.setEnabled(true);
      } else {
        cursorMarker.setEnabled(false);
      }
      if (stored) {
        aimTargetMarker.position.set(stored.x, 0, stored.z);
        aimTargetMarker.setEnabled(true);
      } else {
        aimTargetMarker.setEnabled(false);
      }

      let errDeg = NaN;
      if (cursor) {
        const tx = cursor.x - muzzle.x;
        const tz = cursor.z - muzzle.z;
        const tl = Math.hypot(tx, tz) || 1;
        const dot = (adx * tx + adz * tz) / tl;
        errDeg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
      }
      const yawDeg = (turret.rotation.y * 180) / Math.PI;

      hud.textContent =
        `frame ${dbgFrame}\n` +
        `tank   xz : ${f2(root.position.x)}, ${f2(root.position.z)}\n` +
        `cursor xz : ${cursor ? f2(cursor.x) + ', ' + f2(cursor.z) : '—'}   [gruen]\n` +
        `aim tgt xz: ${stored ? f2(stored.x) + ', ' + f2(stored.z) : '—'}   [rot]\n` +
        `turret yaw: ${f2(yawDeg)} deg\n` +
        `shot  dir : ${f2(adx)}, ${f2(adz)}   [gelb]\n` +
        `AIM ERROR : ${isNaN(errDeg) ? '—' : f2(errDeg) + ' deg'}`;

      const a = new Vector3(muzzle.x, 0.5, muzzle.z);
      const b = new Vector3(muzzle.x + adx * 40, 0.5, muzzle.z + adz * 40);
      aimLine = MeshBuilder.CreateLines('dbg_aimLine', { points: [a, b], instance: aimLine });
    } catch (e) {
      if (!loggedErr) {
        loggedErr = true;
        // eslint-disable-next-line no-console
        console.error('[aimDebug] update error:', e);
      }
    }
  }

  setEnabled(false);
  return { update, setEnabled };
}
