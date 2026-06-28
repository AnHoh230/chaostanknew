import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  DynamicTexture,
  Texture,
} from '@babylonjs/core';
import type { Scene, TransformNode } from '@babylonjs/core';
import { getBiome } from './biomeRegistry';

const GROUND_SIZE = 1000; // sehr groß -> innerhalb des Demos nie erreichter Rand
const TILE_WORLD = 20; // Welt-Größe einer Textur-Kachel (Snap-Periode)
const TEX_PX = 256; // Pixel pro Kachel in der DynamicTexture

/**
 * Endlos wirkender Schrottplatz-Boden: großer Plane mit gegrungter Öl-/Erde-Textur
 * (Rauschen, Ölflecken, Rost, Schutt, Risse statt Schachbrett), der pro update() auf ein
 * Kachelraster um den Spieler schnappt. Snapping in Vielfachen der Kachel-Weltgröße hält
 * das Muster bündig -> kein sichtbares Springen, kein dispose/new.
 */
export function createEndlessGround(
  scene: Scene,
  follow: TransformNode,
  biomeId: string,
): { update(): void } {
  const biome = getBiome(biomeId);
  const [r, g, b] = biome.groundColor;

  const ground = MeshBuilder.CreateGround(
    'ground',
    { width: GROUND_SIZE, height: GROUND_SIZE, subdivisions: 1 },
    scene,
  );

  // Schrottplatz-Textur: dunkle Erde + Rauschen, Ölpfützen, Rost, Schutt, Risse.
  const tex = new DynamicTexture('ground_tex', { width: TEX_PX, height: TEX_PX }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const css = (cr: number, cg: number, cb: number, a = 1): string =>
    `rgba(${Math.round(cr * 255)},${Math.round(cg * 255)},${Math.round(cb * 255)},${a})`;
  const rnd = (min: number, max: number): number => min + Math.random() * (max - min);

  ctx.fillStyle = css(r, g, b);
  ctx.fillRect(0, 0, TEX_PX, TEX_PX);
  // körniges Rauschen (heller/dunkler Dreck)
  for (let i = 0; i < 2600; i++) {
    const f = rnd(0.6, 1.45);
    ctx.fillStyle = css(r * f, g * f, b * f, rnd(0.15, 0.5));
    const sz = rnd(1, 3);
    ctx.fillRect(rnd(0, TEX_PX), rnd(0, TEX_PX), sz, sz);
  }
  // große Ölflecken (sehr dunkel)
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = css(0.04, 0.04, 0.05, rnd(0.25, 0.5));
    ctx.beginPath();
    ctx.ellipse(rnd(0, TEX_PX), rnd(0, TEX_PX), rnd(14, 38), rnd(10, 28), rnd(0, 3.14), 0, 6.29);
    ctx.fill();
  }
  // Rostflecken (rotbraun)
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = css(rnd(0.32, 0.5), rnd(0.18, 0.26), rnd(0.08, 0.14), rnd(0.2, 0.45));
    ctx.beginPath();
    ctx.ellipse(rnd(0, TEX_PX), rnd(0, TEX_PX), rnd(5, 16), rnd(4, 12), rnd(0, 3.14), 0, 6.29);
    ctx.fill();
  }
  // Schutt-Splitter (kleine helle/dunkle Rechtecke)
  for (let i = 0; i < 160; i++) {
    const d = Math.random() < 0.5;
    ctx.fillStyle = d ? css(0.1, 0.1, 0.11, 0.6) : css(0.42, 0.43, 0.44, 0.5);
    ctx.save();
    ctx.translate(rnd(0, TEX_PX), rnd(0, TEX_PX));
    ctx.rotate(rnd(0, 3.14));
    ctx.fillRect(0, 0, rnd(2, 6), rnd(1, 2.5));
    ctx.restore();
  }
  // verblasste Warn-Markierung (entsättigtes Gelb)
  ctx.strokeStyle = css(0.5, 0.45, 0.12, 0.18);
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(rnd(0, TEX_PX), 0);
  ctx.lineTo(rnd(0, TEX_PX), TEX_PX);
  ctx.stroke();
  // Risse (dünne dunkle Linien)
  ctx.strokeStyle = css(0.03, 0.03, 0.04, 0.55);
  for (let i = 0; i < 16; i++) {
    ctx.lineWidth = rnd(0.6, 1.6);
    let x = rnd(0, TEX_PX), y = rnd(0, TEX_PX);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += rnd(-20, 20); y += rnd(-20, 20);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  tex.update();
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.uScale = GROUND_SIZE / TILE_WORLD;
  tex.vScale = GROUND_SIZE / TILE_WORLD;

  const mat = new StandardMaterial('ground_mat', scene);
  mat.diffuseTexture = tex;
  mat.specularColor = new Color3(0, 0, 0);
  ground.material = mat;
  ground.position.y = 0;

  function update(): void {
    // In Vielfachen der Kachel-Weltgröße schnappen -> Muster bleibt bündig.
    ground.position.x = Math.round(follow.position.x / TILE_WORLD) * TILE_WORLD;
    ground.position.z = Math.round(follow.position.z / TILE_WORLD) * TILE_WORLD;
  }

  update();
  return { update };
}
