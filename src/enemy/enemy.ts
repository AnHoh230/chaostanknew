import type { Scene } from '@babylonjs/core';
import { createTankView, type TankView } from '../tank/tankFactory';
import type { TankComposition } from '../tank/sockets';
import { createEnemyBrain, type EnemyBrain } from '../ai/enemyBrain';
import type { TraitProfile, AiAction } from '../ai/aiTypes';
import type { Combatant } from '../combat/combat';
import type { Named } from '../named/promotion';

/** Ein lebender Gegner: Optik + Trefferdaten + Gehirn + Level/Credits + Promotion. */
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
  level: number; // eigenes Level (unabhängig von Spieler-MK)
  credits: number; // verdient durch eigene Kills → Aufrüstung
  shopCd: number; // Sekunden bis zum nächsten Aufrüst-Versuch
}

export interface EnemySpec {
  id: string;
  motiveId: string;
  traits: TraitProfile;
  comp: TankComposition;
  spawn: { x: number; z: number };
  level: number;
}

/** Gegner-Stats aus seinem Level (eigene Skala, NICHT an die Spieler-MK gekoppelt). */
export function enemyLevelStats(level: number): { hp: number; damage: number; lootValue: number } {
  return {
    hp: Math.round(60 + level * 40),
    damage: Math.round(4 + level * 2),
    lootValue: +(0.3 + level * 0.18).toFixed(2),
  };
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
  const st = enemyLevelStats(spec.level);
  const combatant: Combatant = {
    id: spec.id,
    team: spec.id, // jeder Gegner = eigene Fraktion → kann andere treffen
    x: spec.spawn.x,
    z: spec.spawn.z,
    radius,
    hp: st.hp,
    maxHp: st.hp,
    alive: true,
    lootValue: st.lootValue,
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
    level: spec.level,
    credits: 0,
    shopCd: 4 + rng() * 4,
  };
}
