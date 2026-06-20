import { Vector3, Matrix } from '@babylonjs/core';
import type { Scene, Camera, Engine } from '@babylonjs/core';

export interface EnemyBarInfo {
  x: number;
  z: number;
  hpFrac: number;
  name: string; // "Panzer N" oder Named-Name — wird IMMER angezeigt
  isNamed: boolean; // true = benannter Rivale (rot + fett)
  mode?: string; // aktueller KI-Modus (scout/annähern/feuern/…) — Mess-Overlay
}

export interface EnemyBars {
  update(list: readonly EnemyBarInfo[]): void;
}

function hpColor(frac: number): string {
  const f = frac < 0 ? 0 : frac > 1 ? 1 : frac;
  return `hsl(${Math.round(f * 120)}, 70%, 45%)`;
}

interface Bar {
  wrap: HTMLElement;
  fill: HTMLElement;
  label: HTMLElement;
  mode: HTMLElement;
}

/**
 * Schwebende HP-Balken direkt über den Gegnern (DOM, Echtzeit, per Vector3.Project).
 * Ein DOM-Pool wird wiederverwendet (kein Erzeugen/Zerstören pro Frame).
 */
export function createEnemyBars(scene: Scene, camera: Camera, engine: Engine): EnemyBars {
  const pool: Bar[] = [];

  function makeBar(): Bar {
    const wrap = document.createElement('div');
    wrap.style.cssText =
      'position:fixed;z-index:17;transform:translate(-50%,-100%);pointer-events:none;display:none;' +
      'width:46px;text-align:center;';
    const label = document.createElement('div');
    label.style.cssText =
      'font:700 9px/1.2 system-ui,sans-serif;text-shadow:0 1px 2px #000;' +
      'margin-bottom:2px;white-space:nowrap;';
    const track = document.createElement('div');
    track.style.cssText =
      'width:100%;height:5px;background:rgba(0,0,0,0.6);border:1px solid #0008;border-radius:3px;overflow:hidden;';
    const fill = document.createElement('div');
    fill.style.cssText = 'height:100%;width:100%;';
    track.appendChild(fill);
    const mode = document.createElement('div');
    mode.style.cssText =
      'font:600 8px/1.1 system-ui,sans-serif;color:#9fb0c0;text-shadow:0 1px 2px #000;margin-top:1px;white-space:nowrap;';
    wrap.appendChild(label);
    wrap.appendChild(track);
    wrap.appendChild(mode);
    document.body.appendChild(wrap);
    return { wrap, fill, label, mode };
  }

  function project(x: number, z: number): { sx: number; sy: number; visible: boolean } {
    const s = Vector3.Project(
      new Vector3(x, 2.8, z),
      Matrix.IdentityReadOnly,
      scene.getTransformMatrix(),
      camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
    );
    return { sx: s.x, sy: s.y, visible: s.z > 0 && s.z < 1 };
  }

  function update(list: readonly EnemyBarInfo[]): void {
    while (pool.length < list.length) pool.push(makeBar());
    for (let i = 0; i < pool.length; i++) {
      const b = pool[i]!;
      const e = list[i];
      if (!e) {
        b.wrap.style.display = 'none';
        continue;
      }
      const p = project(e.x, e.z);
      if (!p.visible) {
        b.wrap.style.display = 'none';
        continue;
      }
      b.wrap.style.display = 'block';
      b.wrap.style.left = p.sx + 'px';
      b.wrap.style.top = p.sy + 'px';
      b.fill.style.width = Math.max(0, Math.min(1, e.hpFrac) * 100) + '%';
      b.fill.style.background = e.isNamed ? '#ff3b30' : hpColor(e.hpFrac);
      b.label.textContent = e.name;
      b.label.style.color = e.isNamed ? '#ff8a72' : '#cdd6dd';
      b.label.style.fontSize = e.isNamed ? '11px' : '9px';
      b.mode.textContent = e.mode ?? '';
    }
  }

  return { update };
}
