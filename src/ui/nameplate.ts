/**
 * In-Welt-Nameplate: ein einzelnes Billboard-Schild, das beim Annähern über dem
 * nächsten interagierbaren Prop erscheint und es benennt ("🛢 Fass", "⚠ Presse" ...).
 * Genau EIN Schild (wandert zum nächsten Objekt) — kein Text-Wald, billig: Textur
 * wird nur neu gezeichnet, wenn sich der Text ändert.
 */
import { MeshBuilder, DynamicTexture, StandardMaterial, Color3, Mesh } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';

export interface Nameplate {
  zeige(x: number, y: number, z: number, text: string): void;
  verstecke(): void;
  dispose(): void;
}

export function createNameplate(scene: Scene): Nameplate {
  const W = 512;
  const H = 128;
  const plane = MeshBuilder.CreatePlane('nameplate', { width: 7, height: 1.75 }, scene);
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  plane.isPickable = false;
  plane.renderingGroupId = 1; // über der Welt, nie verdeckt

  const tex = new DynamicTexture('nameplate_tex', { width: W, height: H }, scene, true);
  tex.hasAlpha = true;
  const mat = new StandardMaterial('nameplate_mat', scene);
  mat.diffuseTexture = tex;
  mat.opacityTexture = tex;
  mat.emissiveColor = new Color3(1, 1, 1);
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  plane.material = mat;
  plane.setEnabled(false);

  let aktuell = '';

  function zeichne(text: string): void {
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, W, H);
    // abgerundete Sprechblase
    const pad = 14;
    ctx.fillStyle = 'rgba(10,14,18,0.82)';
    ctx.strokeStyle = 'rgba(150,200,230,0.9)';
    ctx.lineWidth = 4;
    const r = 22;
    ctx.beginPath();
    ctx.moveTo(pad + r, pad);
    ctx.arcTo(W - pad, pad, W - pad, H - pad, r);
    ctx.arcTo(W - pad, H - pad, pad, H - pad, r);
    ctx.arcTo(pad, H - pad, pad, pad, r);
    ctx.arcTo(pad, pad, W - pad, pad, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillStyle = '#eef4f8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2 + 2);
    tex.update();
  }

  return {
    zeige(x, y, z, text): void {
      if (text !== aktuell) {
        zeichne(text);
        aktuell = text;
      }
      plane.position.set(x, y, z);
      plane.setEnabled(true);
    },
    verstecke(): void {
      plane.setEnabled(false);
    },
    dispose(): void {
      plane.dispose();
      tex.dispose();
      mat.dispose();
    },
  };
}
