import { Vector3, PointerEventTypes, Matrix } from '@babylonjs/core';
import type { Scene, Camera } from '@babylonjs/core';
import type { Tank } from '../tank/tank';
import { createLogger } from '../core/log';
import { yawTo, rayGroundY0 } from './aimMath';
import { stepChassis, chassisForward, type ChassisConfig, type ChassisState } from './chassis';
import { stepTurret } from '../combat/turret';

/** Chassis-Konfig aus dem aktuellen Tempo (Räder speisen maxForward). */
function chassisCfgFor(speed: number): ChassisConfig {
  return {
    maxForward: speed,
    maxReverse: speed * 0.45,
    accel: speed * 2.4,
    reverseAccel: speed * 1.5,
    brake: speed * 4,
    friction: speed * 1.6,
    deadzone: 0.4,
    turnStanding: 2.6,
    turnSlow: 1.9,
    turnFast: 0.9,
    reverseTurnMod: 0.6,
    brakeTurnMod: 0.45,
    slowSpeed: speed * 0.35,
    fastSpeed: speed * 0.7,
  };
}

export function createInput(
  scene: Scene,
  camera: Camera,
  tank: Tank,
  speed: number | (() => number),
  onFire: () => void,
  turretSlew: number | (() => number) = Infinity,
): { update(simDt: number): void; getAimTarget(): Vector3 | null } {
  const speedOf = (): number => (typeof speed === 'function' ? speed() : speed);
  const slewOf = (): number => (typeof turretSlew === 'function' ? turretSlew() : turretSlew);
  const log = createLogger('input');

  const keys: Record<string, boolean> = Object.create(null);
  let aimTarget: Vector3 | null = null;
  const chassis: ChassisState = { heading: tank.view.root.rotation.y, velocity: 0 };

  const onKeyDown = (ev: KeyboardEvent): void => {
    const k = ev.key.toLowerCase();
    keys[k] = true;
    if (k === 'm') {
      log.info('map toggle');
    }
  };
  const onKeyUp = (ev: KeyboardEvent): void => {
    keys[ev.key.toLowerCase()] = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type === PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 0) {
      onFire();
    }
  });

  function update(simDt: number): void {
    const root = tank.view.root;

    // WASD steuert die WANNE (schweres Fahrzeug): W/S = vor/zurück entlang Heading,
    // A/D = Wanne drehen. Trägheit + kein Sofort-Richtungswechsel (siehe chassis.ts).
    let throttle = 0;
    if (keys['w']) throttle += 1;
    if (keys['s']) throttle -= 1; // W+S = 0 (bremsen über Reibung)
    let steer = 0;
    if (keys['d']) steer += 1;
    if (keys['a']) steer -= 1; // A+D = 0
    const next = stepChassis(chassis, { throttle, steer }, chassisCfgFor(speedOf()), simDt);
    chassis.heading = next.heading;
    chassis.velocity = next.velocity;
    root.rotation.y = chassis.heading; // Wanne zeigt in Fahrtrichtung
    if (chassis.velocity !== 0) {
      const fwd = chassisForward(chassis.heading);
      root.position.x += fwd.x * chassis.velocity * simDt;
      root.position.z += fwd.z * chassis.velocity * simDt;
    }

    // Zielen: JEDEN Frame den AKTUELLEN Cursor frisch auf die Bodenebene (y=0)
    // projizieren — NICHT einen gespeicherten Welt-Punkt wiederverwenden. Sonst
    // läuft das Ziel weg, sobald die Kamera mitfährt (bewiesener Bug: AIM ERROR -> 120°).
    const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), camera);
    const g = rayGroundY0(
      ray.origin.x,
      ray.origin.y,
      ray.origin.z,
      ray.direction.x,
      ray.direction.y,
      ray.direction.z,
    );
    if (g) {
      aimTarget = new Vector3(g.x, 0, g.z);
      const turret = tank.view.turretNode;
      turret.computeWorldMatrix(true);
      const tp = turret.getAbsolutePosition();
      // Turm zeigt unabhängig vom Chassis auf den Cursor: im WELT-Yaw mit begrenztem
      // Dreh-Tempo zum Ziel slewen (Default Infinity = sofort), dann Heading rausrechnen.
      const targetWorld = yawTo(tp.x, tp.z, g.x, g.z);
      const currentWorld = root.rotation.y + turret.rotation.y;
      const newWorld = stepTurret(currentWorld, targetWorld, slewOf(), simDt);
      turret.rotation.y = newWorld - root.rotation.y;
    }
  }

  function getAimTarget(): Vector3 | null {
    return aimTarget;
  }

  return { update, getAimTarget };
}
