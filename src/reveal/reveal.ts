import { Vector3, Matrix, HighlightLayer, Color3 } from '@babylonjs/core';
import type { Scene, Camera, Engine, TransformNode, Mesh } from '@babylonjs/core';
import type { Clock } from '../core/clock';
import type { Named } from '../named/promotion';
import type { Akte } from '../named/akte';
import { revealLine, recognitionLine, archetypStil } from '../named/revealText';

const SLOWMO_DUR = 1.6; // Gesamtdauer der Zeitlupe (Echtzeit-Sekunden)
const SLOWMO_MIN = 0.2; // tiefster simSpeed
const RAMP_DOWN = 0.3; // Einblendkurve
const RAMP_UP = 0.45; // Ausblendkurve
const BILLBOARD_LINGER = 1.4; // Spruch steht nach dem Slowmo noch kurz

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface Reveal {
  triggerReveal(named: Named, target: TransformNode, akte: Akte): void;
  triggerRecognition(named: Named, target: TransformNode, akte: Akte): void;
  update(realDt: number): void;
  active(): boolean;
}

/**
 * Inszeniert den Erstkontakt mit einem Named: Zeitlupe (simSpeed-Kurve, wirkt auf
 * Bewegung/Projektile/KI), Highlight-Glühen am Panzer und ein charaktergefärbtes
 * Billboard (DOM, Echtzeit, per Vector3.Project an die Panzer-Bildschirmposition).
 * HUD/DOM läuft in Echtzeit weiter — daher update(realDt), NICHT simDt.
 */
export function createReveal(scene: Scene, camera: Camera, engine: Engine, clock: Clock): Reveal {
  const hl = new HighlightLayer('reveal_hl', scene);
  let highlighted: Mesh[] = [];

  let slowT = -1; // <0 = keine Zeitlupe aktiv

  const bb = document.createElement('div');
  bb.id = 'reveal-billboard';
  bb.style.cssText =
    'position:fixed;z-index:30;transform:translateX(-50%);pointer-events:none;display:none;' +
    'font:bold 17px/1.3 system-ui,sans-serif;text-shadow:0 2px 6px #000,0 0 3px #000;' +
    'padding:8px 14px;white-space:normal;text-align:center;max-width:320px;letter-spacing:0.3px;' +
    'background:rgba(8,10,12,0.55);border-radius:8px;';
  document.body.appendChild(bb);
  let bbTarget: TransformNode | null = null;
  let bbT = -1;
  let bbDur = 0;

  function showBillboard(text: string, color: string, target: TransformNode, dur: number): void {
    bb.textContent = text;
    bb.style.color = color;
    bbTarget = target;
    bbT = 0;
    bbDur = dur;
    bb.style.display = 'block';
    bb.style.opacity = '1';
  }

  function clearHighlight(): void {
    for (const m of highlighted) hl.removeMesh(m);
    highlighted = [];
  }

  function highlight(target: TransformNode, color: string): void {
    clearHighlight();
    const c = Color3.FromHexString(color);
    for (const m of target.getChildMeshes()) {
      hl.addMesh(m as Mesh, c);
      highlighted.push(m as Mesh);
    }
  }

  function projectTo(target: TransformNode): { x: number; y: number; visible: boolean } {
    const pos = target.getAbsolutePosition();
    const top = new Vector3(pos.x, pos.y + 3, pos.z);
    const s = Vector3.Project(
      top,
      Matrix.IdentityReadOnly,
      scene.getTransformMatrix(),
      camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
    );
    return { x: s.x, y: s.y, visible: s.z > 0 && s.z < 1 };
  }

  function triggerReveal(named: Named, target: TransformNode, akte: Akte): void {
    slowT = 0;
    const st = archetypStil(named.archetyp);
    highlight(target, st.farbe);
    showBillboard(revealLine(named, akte), st.farbe, target, SLOWMO_DUR + BILLBOARD_LINGER);
  }

  function triggerRecognition(named: Named, target: TransformNode, akte: Akte): void {
    const st = archetypStil(named.archetyp);
    showBillboard(recognitionLine(named, akte), st.farbe, target, 1.6); // kein Slowmo/Highlight
  }

  function update(realDt: number): void {
    if (slowT >= 0) {
      slowT += realDt;
      let s: number;
      if (slowT < RAMP_DOWN) s = lerp(1, SLOWMO_MIN, slowT / RAMP_DOWN);
      else if (slowT > SLOWMO_DUR - RAMP_UP) s = lerp(SLOWMO_MIN, 1, (slowT - (SLOWMO_DUR - RAMP_UP)) / RAMP_UP);
      else s = SLOWMO_MIN;
      if (slowT >= SLOWMO_DUR) {
        s = 1;
        slowT = -1;
        clearHighlight();
      }
      clock.simSpeed = s;
    }

    if (bbT >= 0) {
      bbT += realDt;
      if (bbTarget) {
        const p = projectTo(bbTarget);
        bb.style.opacity = p.visible ? '1' : '0';
        if (p.visible) {
          // In den sichtbaren Bereich klemmen (sonst läuft der Spruch oben/seitlich raus).
          const margin = 170;
          const x = Math.max(margin, Math.min(window.innerWidth - margin, p.x));
          const y = Math.max(12, p.y - 78); // knapp über dem Panzer, nie über den Rand
          bb.style.left = x + 'px';
          bb.style.top = y + 'px';
        }
      }
      if (bbT >= bbDur) {
        bbT = -1;
        bbTarget = null;
        bb.style.display = 'none';
      }
    }
  }

  function active(): boolean {
    return slowT >= 0;
  }

  return { triggerReveal, triggerRecognition, update, active };
}
