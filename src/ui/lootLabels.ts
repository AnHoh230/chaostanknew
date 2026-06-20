import { Vector3, Matrix } from '@babylonjs/core';
import type { Scene, Camera, Engine } from '@babylonjs/core';

export interface LootLabelInfo {
  x: number;
  z: number;
  name: string;
}

export interface LootLabels {
  update(list: readonly LootLabelInfo[]): void;
}

/**
 * Schwebende Item-Namen direkt über den gelben Loot-Würfeln (DOM, per
 * Vector3.Project). Wiederverwendeter DOM-Pool (kein Erzeugen pro Frame).
 */
export function createLootLabels(scene: Scene, camera: Camera, engine: Engine): LootLabels {
  const pool: HTMLElement[] = [];

  function makeLabel(): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText =
      'position:fixed;z-index:16;transform:translate(-50%,-100%);pointer-events:none;display:none;' +
      'font:700 10px/1.2 system-ui,sans-serif;color:#ffe08a;text-shadow:0 1px 2px #000,0 0 4px #000;' +
      'white-space:nowrap;';
    document.body.appendChild(el);
    return el;
  }

  function project(x: number, z: number): { sx: number; sy: number; visible: boolean } {
    const s = Vector3.Project(
      new Vector3(x, 1.6, z),
      Matrix.IdentityReadOnly,
      scene.getTransformMatrix(),
      camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
    );
    return { sx: s.x, sy: s.y, visible: s.z > 0 && s.z < 1 };
  }

  function update(list: readonly LootLabelInfo[]): void {
    while (pool.length < list.length) pool.push(makeLabel());
    for (let i = 0; i < pool.length; i++) {
      const el = pool[i]!;
      const info = list[i];
      if (!info) {
        el.style.display = 'none';
        continue;
      }
      const p = project(info.x, info.z);
      if (!p.visible) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = 'block';
      el.style.left = p.sx + 'px';
      el.style.top = p.sy + 'px';
      el.textContent = info.name;
    }
  }

  return { update };
}
