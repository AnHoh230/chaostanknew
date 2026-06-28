import { MeshBuilder, StandardMaterial, Color3, Texture } from '@babylonjs/core';
import type { Scene, TransformNode } from '@babylonjs/core';

const GROUND_SIZE = 1000; // sehr groß -> innerhalb des Demos nie erreichter Rand
const TILE_WORLD = 160; // Welt-Periode der Boden-Textur (groß -> Wiederholung fällt im Nebel kaum auf)

/**
 * Endlos wirkender Schrottplatz-Boden: großer Plane mit der NAHTLOS GEBACKENEN Boden-Textur
 * (tools/bakeGround.mjs verschmilzt die diskreten Sheet-Kacheln per Splatting -> kein
 * „hintereinander gepackte Vierecke"-Raster mehr). Schnappt pro update() auf ein Kachelraster
 * um den Spieler — Snapping in Vielfachen der Welt-Periode hält das Muster bündig (kein Springen,
 * kein dispose/new).
 */
export function createEndlessGround(
  scene: Scene,
  follow: TransformNode,
  _biomeId: string,
): { update(): void } {
  const ground = MeshBuilder.CreateGround(
    'ground',
    { width: GROUND_SIZE, height: GROUND_SIZE, subdivisions: 1 },
    scene,
  );

  const tex = new Texture('/tiles/boden_basis.png', scene);
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
    // In Vielfachen der Welt-Periode schnappen -> Muster bleibt bündig.
    ground.position.x = Math.round(follow.position.x / TILE_WORLD) * TILE_WORLD;
    ground.position.z = Math.round(follow.position.z / TILE_WORLD) * TILE_WORLD;
  }

  update();
  return { update };
}
