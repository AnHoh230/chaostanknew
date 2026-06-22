import type { Scene } from '@babylonjs/core';
import { createTankView, type TankView } from '../tank/tankFactory';
import type { TankComposition } from '../tank/sockets';
import type { Combatant } from '../combat/combat';
import { enemyCombatStats } from './enemyStats';
import { createBuffStack, type BuffStack } from '../combat/buffs';
import type { EnemyBehavior } from './enemyBehavior';

/** Ein lebender Gegner: schlanker Combatant — Optik + Trefferdaten + Verhalten. */
export interface Enemy {
  id: string;
  view: TankView;
  combatant: Combatant;
  damage: number; // Schaden pro Schuss — AUS DEM LEVEL abgeleitet
  fireCd: number; // Sekunden bis zum nächsten Schuss
  displayName: string; // generischer "Panzer N"-Name
  level: number; // eigenes Level (steuert alle Stats)
  buffs: BuffStack; // passiver Empfänger der Spieler-Debuffs (Zielmarkierung/Rauch)
  typeId: string; // Gegner-Typ (bestimmt das Verhalten)
  behavior: EnemyBehavior; // Bewegungs-/Angriffsmuster
  phase: number; // 0..1 fester per-Gegner-Versatz (Orbit-Richtung / Schwarm-Streuung)
  dot?: { left: number; tickCd: number }; // aktive DoT (Restdauer s + Zeit bis nächster Tick)
}

export interface EnemySpec {
  id: string;
  comp: TankComposition;
  spawn: { x: number; z: number };
  level: number;
  displayName: string;
  typeId: string;
  behavior: EnemyBehavior;
}

/** Combatant-Stats eines Gegners NEU aus seinem Level berechnen. HP wird voll aufgefüllt. */
export function applyEnemyStats(e: Enemy): void {
  const st = enemyCombatStats(e.level);
  e.combatant.maxHp = st.maxHp;
  e.combatant.hp = st.maxHp;
  e.combatant.armor = st.armor;
  e.combatant.dodge = st.dodge;
  e.combatant.lootValue = st.lootValue;
  e.damage = st.damage;
}

/** Erzeugt einen Gegner inkl. Mesh und Combatant (team fest 'enemy'). */
export function createEnemyEntity(
  scene: Scene,
  spec: EnemySpec,
  radius: number,
  rng: () => number,
  hpMul = 1, // Live-Balancing-Faktor auf die Gegner-HP (Schwarm-Tuning)
  dmgMul = 1, // Live-Balancing-Faktor auf den Gegner-Schaden
): Enemy {
  const view = createTankView(scene, spec.comp);
  view.root.position.set(spec.spawn.x, 0, spec.spawn.z);
  const st = enemyCombatStats(spec.level);
  const maxHp = Math.max(1, Math.round(st.maxHp * hpMul));
  const combatant: Combatant = {
    id: spec.id,
    team: 'enemy', // alle Gegner sind eine Fraktion → bekämpfen sich nicht gegenseitig
    x: spec.spawn.x,
    z: spec.spawn.z,
    radius,
    hp: maxHp,
    maxHp: maxHp,
    armor: st.armor,
    dodge: st.dodge,
    alive: true,
    lootValue: st.lootValue,
  };
  return {
    id: spec.id,
    view,
    combatant,
    damage: Math.max(1, Math.round(st.damage * dmgMul)),
    fireCd: 0,
    displayName: spec.displayName,
    level: spec.level,
    buffs: createBuffStack(),
    typeId: spec.typeId,
    behavior: spec.behavior,
    phase: rng(),
  };
}
