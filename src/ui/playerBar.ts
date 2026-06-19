import { Vector3, Matrix } from '@babylonjs/core';
import type { Scene, Camera, Engine } from '@babylonjs/core';

export interface PlayerBarState {
  x: number;
  z: number;
  hpFrac: number;
  xpFrac: number;
  level: number;
  mk: number;
}

export interface PlayerBar {
  update(s: PlayerBarState): void;
}

function hpColor(frac: number): string {
  const f = frac < 0 ? 0 : frac > 1 ? 1 : frac;
  return `hsl(${Math.round(f * 120)}, 70%, 45%)`;
}

/** Schwebende HP- + EP-Leiste direkt über dem eigenen Panzer (DOM, per Vector3.Project). */
export function createPlayerBar(scene: Scene, camera: Camera, engine: Engine): PlayerBar {
  const wrap = document.createElement('div');
  wrap.id = 'player-bar';
  wrap.style.cssText =
    'position:fixed;z-index:18;transform:translate(-50%,-100%);pointer-events:none;display:none;' +
    'width:120px;text-align:center;';

  const label = document.createElement('div');
  label.style.cssText =
    'font:700 10px/1.2 system-ui,sans-serif;color:#eef;text-shadow:0 1px 2px #000;margin-bottom:2px;';

  const hpTrack = document.createElement('div');
  hpTrack.style.cssText =
    'width:100%;height:7px;background:rgba(0,0,0,0.6);border:1px solid #0008;border-radius:3px;overflow:hidden;';
  const hpFill = document.createElement('div');
  hpFill.style.cssText = 'height:100%;width:100%;';
  hpTrack.appendChild(hpFill);

  const xpTrack = document.createElement('div');
  xpTrack.style.cssText =
    'width:100%;height:4px;background:rgba(0,0,0,0.6);border:1px solid #0008;border-radius:2px;overflow:hidden;margin-top:2px;';
  const xpFill = document.createElement('div');
  xpFill.style.cssText = 'height:100%;width:0%;background:#6aa6ff;';
  xpTrack.appendChild(xpFill);

  wrap.appendChild(label);
  wrap.appendChild(hpTrack);
  wrap.appendChild(xpTrack);
  document.body.appendChild(wrap);

  function update(s: PlayerBarState): void {
    const proj = Vector3.Project(
      new Vector3(s.x, 3.2, s.z),
      Matrix.IdentityReadOnly,
      scene.getTransformMatrix(),
      camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
    );
    if (!(proj.z > 0 && proj.z < 1)) {
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = 'block';
    wrap.style.left = proj.x + 'px';
    wrap.style.top = proj.y + 'px';
    label.textContent = `Lvl ${s.level} · MK ${s.mk}`;
    hpFill.style.width = Math.max(0, Math.min(1, s.hpFrac) * 100) + '%';
    hpFill.style.background = hpColor(s.hpFrac);
    xpFill.style.width = Math.max(0, Math.min(1, s.xpFrac) * 100) + '%';
  }

  return { update };
}
