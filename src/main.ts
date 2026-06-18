import { Engine, Scene, HemisphericLight, Vector3, Color4 } from '@babylonjs/core';
import { createClock } from './core/clock';
import { createBus } from './core/events';
import { createLogger, logConfig } from './core/log';
import { createRng } from './core/rng';
import { registerBiome, getBiome } from './world/biomeRegistry';
import { createEndlessGround } from './world/ground';
import { createCameraRig } from './camera/cameraRig';
import { createTankView } from './tank/tankFactory';
import { createTank } from './tank/tank';
import { createInput } from './input/input';
import { createProjectilePool } from './combat/projectilePool';
import { createProjectileView } from './combat/projectileView';
import { startLoop } from './core/loop';
import { createAimDebug } from './debug/aimDebug';
import type { TankComposition } from './tank/sockets';

const BIOME_ID = 'steppe';
const TANK_SPEED = 8; // Welt-Einheiten/s
const PROJECTILE_CAPACITY = 64;
const PROJECTILE_SPEED = 30;
const PROJECTILE_LIFE = 3; // Sekunden
const SEED = 1337;

const log = createLogger('main');

function mountStartScreen(onStart: () => void): void {
  const overlay = document.createElement('div');
  overlay.id = 'start-screen';
  overlay.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
    'background:#0b0d10;z-index:10;font-family:system-ui,sans-serif;';

  const btn = document.createElement('button');
  btn.textContent = 'Start';
  btn.style.cssText =
    'padding:16px 48px;font-size:20px;cursor:pointer;border:2px solid #d8b04a;' +
    'background:#1a1d22;color:#f0e6cc;border-radius:8px;';
  btn.addEventListener('click', () => {
    overlay.remove();
    onStart();
  });

  overlay.appendChild(btn);
  document.body.appendChild(overlay);
}

function getCanvas(): HTMLCanvasElement {
  let canvas = document.getElementById('renderCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'renderCanvas';
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;';
    document.body.appendChild(canvas);
  }
  return canvas;
}

function boot(): void {
  log.info('boot start', { seed: SEED, biome: BIOME_ID });

  const canvas = getCanvas();
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.05, 0.06, 0.07, 1);

  // Kerndienste
  const clock = createClock();
  const bus = createBus();
  const rng = createRng(SEED);

  // Licht
  const light = new HemisphericLight('sun', new Vector3(0.3, 1, 0.2), scene);
  light.intensity = 0.95;

  // Biom 'steppe' ist beim Modulladen registriert; defensiv sicherstellen.
  registerBiome({ id: BIOME_ID, groundColor: [0.36, 0.4, 0.24] });
  const biome = getBiome(BIOME_ID);
  log.debug('biome resolved', { id: biome.id, groundColor: biome.groundColor });

  // Panzer aus modularen Teilen komponieren
  const comp: TankComposition = {
    chassis: 'c_box',
    wheels: 'w_round',
    turret: 't_small',
    weapon: 'g_short',
  };
  const view = createTankView(scene, comp);
  const tank = createTank('player', view, 100);
  log.info('tank built', { id: tank.id, hp: tank.hp, comp });

  // Endlos-Boden folgt dem Panzer-Root
  const ground = createEndlessGround(scene, tank.view.root, BIOME_ID);

  // Kamera auf den Panzer-Root
  const camera = createCameraRig(scene, tank.view.root);

  // Projektil-Pool (rein logisch) + sichtbare Mesh-Brücke
  const pool = createProjectilePool(PROJECTILE_CAPACITY);
  const projectileView = createProjectileView(scene, pool, PROJECTILE_CAPACITY);

  // Feuern: Richtung aus der Turm-Weltausrichtung ableiten (lokal vorwärts = +Z)
  function fire(): void {
    const root = tank.view.root;
    const turret = tank.view.turretNode;
    turret.computeWorldMatrix(true);
    const fwd = turret.getDirection(new Vector3(0, 0, 1));
    const len = Math.hypot(fwd.x, fwd.z) || 1;
    const dx = fwd.x / len;
    const dz = fwd.z / len;
    const origin = root.getAbsolutePosition();
    const p = pool.acquire({
      x: origin.x,
      y: 0.5,
      z: origin.z,
      dx,
      dz,
      speed: PROJECTILE_SPEED,
      life: PROJECTILE_LIFE,
    });
    if (p) {
      bus.emit('tank.fired', { tankId: tank.id });
      bus.emit('projectile.spawned', { id: p.id });
      log.debug('fired', { tankId: tank.id, projectile: p.id, dx, dz });
    } else {
      log.warn('pool full, shot dropped', { capacity: PROJECTILE_CAPACITY });
    }
  }

  const input = createInput(scene, camera, tank, TANK_SPEED, fire);

  // Mess-Overlay (Phase 1 Debugging): macht Cursor-Bodenpunkt, Ziel und Schussrichtung sichtbar.
  const aimDebug = createAimDebug(scene, camera, tank, () => input.getAimTarget());

  // §21.5-Sichtbarkeitszähler periodisch loggen (aktiv == sichtbar)
  let frame = 0;

  // GENAU EIN Loop. Reihenfolge: Steuerung -> Pool-Logik -> Boden-Recenter -> Mesh-Sync.
  startLoop(engine, scene, clock, (simDt) => {
    input.update(simDt);
    pool.update(simDt);
    ground.update();
    projectileView.sync();
    aimDebug.update();

    frame++;
    if (frame % 60 === 0) {
      const active = pool.activeCount();
      const visible = projectileView.visibleCount();
      log.debug('pool state', { active, visible, match: active === visible });
    }
  });
  log.info('loop running');

  // RNG bleibt für spätere deterministische Effekte gebunden (Slice 1: nur Beleg).
  void rng;

  window.addEventListener('resize', () => engine.resize());
}

// Logging scharf schalten.
logConfig.enabled = true;
logConfig.minLevel = 'debug';

mountStartScreen(boot);
