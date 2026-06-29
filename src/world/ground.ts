import { MeshBuilder, StandardMaterial, Color3, Texture } from '@babylonjs/core';
import type { Scene, TransformNode } from '@babylonjs/core';

const GROUND_SIZE = 1000; // sehr groß -> innerhalb des Demos nie erreichter Rand
const TILE_WORLD = 160; // Welt-Periode der Boden-Textur (groß -> Wiederholung fällt im Nebel kaum auf)

/**
 * Endlos wirkender Schrottplatz-Boden: großer Plane mit EINER nahtlosen, hochaufgelösten Boden-Textur
 * (tiles/background.png), gekachelt über die Welt-Periode -> ein einheitlicher Untergrund statt eines
 * „hintereinander gepackte Vierecke"-Rasters. Schnappt pro update() auf ein Kachelraster um den Spieler —
 * Snapping in Vielfachen der Welt-Periode hält das Muster bündig (kein Springen, kein dispose/new).
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

  const tex = new Texture('tiles/background.png', scene); // relativ (kein '/') -> GitHub-Pages-Unterpfad-fest
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.uScale = GROUND_SIZE / TILE_WORLD;
  tex.vScale = GROUND_SIZE / TILE_WORLD;
  // Anisotrope Filterung MAX: die Kamera blickt flach (~24°, s. cameraRig) über den Boden, der dadurch in
  // die Ferne wegläuft. Ohne Aniso wählt das Mip-Mapping dort ein zu grobes Level -> der weglaufende Boden
  // „verwäscht". Aniso filtert pro Blickachse separat = scharf bis in die Tiefe (GPU clampt 16 auf ihr Max).
  tex.anisotropicFilteringLevel = 16;

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
