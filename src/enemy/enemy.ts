import type { Scene } from '@babylonjs/core';
import { createTankView, type TankView } from '../tank/tankFactory';
import type { TankComposition } from '../tank/sockets';
import { createEnemyBrain, type EnemyBrain } from '../ai/enemyBrain';
import type { TraitProfile, AiAction } from '../ai/aiTypes';
import type { Combatant } from '../combat/combat';
import type { Named } from '../named/promotion';

/** Ein lebender Gegner: Optik + Trefferdaten + Gehirn + Promotion-Zustand. */
export interface Enemy {
  id: string;
  motiveId: string;
  view: TankView;
  combatant: Combatant;
  traits: TraitProfile;
  brain: EnemyBrain;
  home: { x: number; z: number };
  fireCd: number;
  action: AiAction | 'idle';
  named: Named | null;
  prevTargetVisible: boolean;
}

export interface EnemySpec {
  id: string;
  motiveId: string;
  traits: TraitProfile;
  comp: TankComposition;
  spawn: { x: number; z: number };
  hp: number;
  lootValue: number;
}

/** Erzeugt einen Gegner inkl. Mesh, Combatant und frischem Gehirn. */
export function createEnemyEntity(
  scene: Scene,
  spec: EnemySpec,
  radius: number,
  rng: () => number,
): Enemy {
  const view = createTankView(scene, spec.comp);
  view.root.position.set(spec.spawn.x, 0, spec.spawn.z);
  const combatant: Combatant = {
    id: spec.id,
    team: 'enemy',
    x: spec.spawn.x,
    z: spec.spawn.z,
    radius,
    hp: spec.hp,
    maxHp: spec.hp,
    alive: true,
    lootValue: spec.lootValue,
  };
  return {
    id: spec.id,
    motiveId: spec.motiveId,
    view,
    combatant,
    traits: { ...spec.traits },
    brain: createEnemyBrain({ ...spec.traits }, rng),
    home: { x: spec.spawn.x, z: spec.spawn.z },
    fireCd: 0,
    action: 'idle',
    named: null,
    prevTargetVisible: false,
  };
}
