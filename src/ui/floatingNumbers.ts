import { Vector3, Matrix } from '@babylonjs/core';
import type { Scene, Camera, Engine } from '@babylonjs/core';

/**
 * Schwebende Schadenszahlen über den Gegnern (DOM-Pool, per Vector3.Project). Eine Zahl steigt kurz
 * auf und blendet aus. Reine Anzeige — der Aufrufer ruft spawn() bei jedem Schaden, update() pro Frame.
 */
interface FloatNum {
  el: HTMLElement;
  x: number; // Weltposition X
  z: number; // Weltposition Z
  life: number; // s seit dem Spawn
  active: boolean;
}

const DUR = 0.85; // s Lebensdauer einer Zahl
const RISE = 28; // px Anstieg über die Lebensdauer

export interface FloatingNumbers {
  spawn(x: number, z: number, amount: number, color?: string): void;
  update(dt: number): void;
}

export function createFloatingNumbers(scene: Scene, camera: Camera, engine: Engine): FloatingNumbers {
  const pool: FloatNum[] = [];

  function make(): FloatNum {
    const el = document.createElement('div');
    el.style.cssText =
      'position:fixed;z-index:18;pointer-events:none;display:none;transform:translate(-50%,-50%);' +
      'font:800 13px/1 system-ui,sans-serif;text-shadow:0 1px 3px #000,0 0 3px #000;white-space:nowrap;';
    document.body.appendChild(el);
    const f: FloatNum = { el, x: 0, z: 0, life: 0, active: false };
    pool.push(f);
    return f;
  }

  function spawn(x: number, z: number, amount: number, color = '#ffe08a'): void {
    const f = pool.find((p) => !p.active) ?? make();
    f.x = x; f.z = z; f.life = 0; f.active = true;
    f.el.textContent = String(Math.round(amount));
    f.el.style.color = color;
    f.el.style.display = 'block';
  }

  function update(dt: number): void {
    for (const f of pool) {
      if (!f.active) continue;
      f.life += dt;
      if (f.life >= DUR) { f.active = false; f.el.style.display = 'none'; continue; }
      const t = f.life / DUR;
      const s = Vector3.Project(
        new Vector3(f.x, 3.4, f.z),
        Matrix.IdentityReadOnly,
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
      );
      if (s.z <= 0 || s.z >= 1) { f.el.style.display = 'none'; continue; }
      f.el.style.display = 'block';
      f.el.style.left = s.x + 'px';
      f.el.style.top = (s.y - t * RISE) + 'px';
      f.el.style.opacity = String(1 - t);
    }
  }

  return { spawn, update };
}
