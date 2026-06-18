import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  Color4,
} from '@babylonjs/core';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('renderCanvas not found');
}

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

const scene = new Scene(engine);
// Dunkler Hintergrund (leerer Canvas-Eindruck)
scene.clearColor = new Color4(0.06, 0.06, 0.08, 1);

const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3, 20, Vector3.Zero(), scene);
camera.attachControl(canvas, true);

const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
light.intensity = 0.9;

// TEMPORAERER Render-Loop — wird vom Bootstrap-Task (Plan-Task 15) durch startLoop(...) aus src/core/loop.ts ersetzt.
engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener('resize', () => {
  engine.resize();
});
