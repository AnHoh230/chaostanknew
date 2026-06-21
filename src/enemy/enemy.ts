import type { Scene } from '@babylonjs/core';
import { createTankView, type TankView } from '../tank/tankFactory';
import type { TankComposition } from '../tank/sockets';
import type { Combatant } from '../combat/combat';
import type { ShopItem } from '../shop/catalog';
import { rollEnemyEquipment } from './equipment';
import { enemyCombatStats } from './enemyStats';
import { createBuffStack, type BuffStack } from '../combat/buffs';
import type { EnemyBehavior } from './enemyBehavior';

/** Ein lebender Gegner: schlanker Combatant — Optik + Trefferdaten + Ausrüstung + Verhalten. */
export interface Enemy {
  id: string;
  view: TankView;
  combatant: Combatant;
  equipment: ShopItem[]; // tatsächlich angelegte Teile — NUR diese kann er droppen
  damage: number; // Schaden pro Schuss — AUS DER AUSRÜSTUNG abgeleitet (nicht aus dem Level)
  fireCd: number; // Sekunden bis zum nächsten Schuss
  displayName: string; // generischer "Panzer N"-Name
  level: number; // eigenes Level (steuert Stats über die Ausrüstung)
  buffs: BuffStack; // passiver Empfänger der Spieler-Debuffs (Zielmarkierung/Rauch)
  typeId: string; // Gegner-Typ (bestimmt das Verhalten)
  behavior: EnemyBehavior; // Bewegungs-/Angriffsmuster
  phase: number; // 0..1 fester per-Gegner-Versatz (Orbit-Richtung / Schwarm-Streuung)
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

/** Combatant-Stats eines Gegners NEU aus seiner Ausrüstung berechnen. HP wird voll aufgefüllt. */
export function applyEnemyStats(e: Enemy): void {
  const st = enemyCombatStats(e.equipment, e.level);
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
): Enemy {
  const view = createTankView(scene, spec.comp);
  view.root.position.set(spec.spawn.x, 0, spec.spawn.z);
  // Volles Basis-Set beim Erscheinen (ein Teil je Slot, ~15 % selten) → abwechslungsreiche Drops.
  const equipment = rollEnemyEquipment(spec.level, rng);
  const st = enemyCombatStats(equipment, spec.level);
  const combatant: Combatant = {
    id: spec.id,
    team: 'enemy', // alle Gegner sind eine Fraktion → bekämpfen sich nicht gegenseitig
    x: spec.spawn.x,
    z: spec.spawn.z,
    radius,
    hp: st.maxHp,
    maxHp: st.maxHp,
    armor: st.armor,
    dodge: st.dodge,
    alive: true,
    lootValue: st.lootValue,
  };
  return {
    id: spec.id,
    view,
    combatant,
    equipment,
    damage: st.damage,
    fireCd: 0,
    displayName: spec.displayName,
    level: spec.level,
    buffs: createBuffStack(),
    typeId: spec.typeId,
    behavior: spec.behavior,
    phase: rng(),
  };
}
