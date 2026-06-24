import { Vector3, Matrix } from '@babylonjs/core';
import type { Scene, Camera, Engine } from '@babylonjs/core';

export interface EnemyBarInfo {
  x: number;
  z: number;
  hpFrac: number;
  hp?: number; // aktuelle HP als ZAHL (auf dem Balken) — nicht nur der Balken
  hpMax?: number; // maximale HP (für "hp/max")
  name: string; // "Panzer N" — wird IMMER angezeigt
  marks?: string; // aktive Debuff-Marken (🎯 markiert / 💨 vernebelt)
  level?: number; // eigenes Level (sichtbar machen: „was für ein Panzer")
  mk?: number; // MK-Stufe (aus dem Level abgeleitet)
  typeLabel?: string; // Gegner-Typ (= Regler-Name) — macht sichtbar, was die Regler steuern
  typeColor?: string;
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
  hpNum: HTMLElement; // HP als Zahl, mittig auf dem Balken
}

/**
 * Schwebende HP-Balken direkt über den Gegnern (DOM, Echtzeit, per Vector3.Project).
 * Ein DOM-Pool wird wiederverwendet (kein Erzeugen/Zerstören pro Frame).
 */
export function createEnemyBars(scene: Scene, camera: Camera, engine: Engine): EnemyBars {
  const pool: Bar[] = [];

  function makeBar(): Bar {
    const wrap = document.createElement('div');
    wrap.className = 'hud-bar'; // UI-Scale: translate(-50%,-100%) + scale via Klasse; Position bleibt per Projektion
    wrap.style.cssText =
      'position:fixed;z-index:17;pointer-events:none;display:none;' +
      'width:46px;text-align:center;';
    const label = document.createElement('div');
    label.style.cssText =
      'font:700 9px/1.2 system-ui,sans-serif;text-shadow:0 1px 2px #000;' +
      'margin-bottom:2px;white-space:nowrap;';
    const track = document.createElement('div');
    track.style.cssText =
      'position:relative;width:100%;height:9px;background:rgba(0,0,0,0.6);border:1px solid #0008;border-radius:3px;overflow:hidden;';
    const fill = document.createElement('div');
    fill.style.cssText = 'height:100%;width:100%;';
    const hpNum = document.createElement('div');
    hpNum.style.cssText =
      'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
      'font:800 8px/1 system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px #000,0 0 2px #000;letter-spacing:0.3px;';
    track.appendChild(fill);
    track.appendChild(hpNum);
    wrap.appendChild(label);
    wrap.appendChild(track);
    document.body.appendChild(wrap);
    return { wrap, fill, label, hpNum };
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
      b.fill.style.background = hpColor(e.hpFrac);
      b.hpNum.textContent = e.hp != null
        ? (e.hpMax != null ? `${Math.ceil(e.hp)}/${Math.round(e.hpMax)}` : `${Math.ceil(e.hp)}`)
        : '';
      const tankTag = e.level != null && e.mk != null
        ? ` <span style="color:#ffcf6b;font-weight:800">L${e.level}·MK${e.mk}</span>`
        : '';
      const typeTag = e.typeLabel
        ? `<div style="color:${e.typeColor ?? '#fff'};font-weight:800;font-size:9px">${e.typeLabel}</div>`
        : '';
      b.label.innerHTML =
        `${typeTag}<span style="color:#cdd6dd">${e.marks ? e.marks + ' ' : ''}${e.name}</span>${tankTag}`;
    }
  }

  return { update };
}
