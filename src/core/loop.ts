import type { Engine, Scene } from '@babylonjs/core';
import type { Clock } from './clock';

export function startLoop(
  engine: Engine,
  scene: Scene,
  clock: Clock,
  update: (simDt: number) => void,
): void {
  engine.runRenderLoop(() => {
    const simDt = clock.tick(engine.getDeltaTime());
    update(simDt);
    scene.render();
  });
}
