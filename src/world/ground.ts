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
const TILE_WORLD = 10; // Welt-Größe einer Schachbrett-Kachel
const TEX_PX = 64; // Pixel pro Kachel in der DynamicTexture

/**
 * Endlos wirkender Boden: großer Plane mit getiltem Schachbrett (sichtbare Bewegung),
 * der pro update() auf ein Kachelraster um den Spieler schnappt. Snapping in Vielfachen
 * der Kachel-Weltgröße hält das Muster bündig -> kein sichtbares Springen, kein dispose/new.
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

  // Schachbrett-Textur aus zwei Schattierungen der Biomfarbe.
  const tex = new DynamicTexture('ground_tex', { width: TEX_PX, height: TEX_PX }, scene, false);
  const ctx = tex.getContext();
  const toCss = (cr: number, cg: number, cb: number): string =>
    `rgb(${Math.round(cr * 255)},${Math.round(cg * 255)},${Math.round(cb * 255)})`;
  ctx.fillStyle = toCss(r, g, b);
  ctx.fillRect(0, 0, TEX_PX, TEX_PX);
  ctx.fillStyle = toCss(r * 0.82, g * 0.82, b * 0.82);
  ctx.fillRect(0, 0, TEX_PX / 2, TEX_PX / 2);
  ctx.fillRect(TEX_PX / 2, TEX_PX / 2, TEX_PX / 2, TEX_PX / 2);
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
