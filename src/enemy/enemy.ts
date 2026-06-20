import type { Scene } from '@babylonjs/core';
import { createTankView, type TankView } from '../tank/tankFactory';
import type { TankComposition } from '../tank/sockets';
import { createEnemyBrain, type EnemyBrain } from '../ai/enemyBrain';
import type { TraitProfile, AiAction } from '../ai/aiTypes';
import type { Combatant } from '../combat/combat';
import type { Named } from '../named/promotion';
import { mostExpensiveItemPrice, type ShopItem } from '../shop/catalog';
import { enemyMk } from './equipment';
import { enemyCombatStats } from './enemyStats';
import { planPurchases } from './enemyEconomy';
import { createProgression, type Progression } from '../progression/progression';
import { createBelt, type Belt } from '../player/belt';
import { createBuffStack, type BuffStack } from '../combat/buffs';
import type { BoosterDef } from '../shop/boosters';

/** Phase im Shop-Trip eines Gegners. */
export type EnemyShopState = 'kaempfen' | 'streifen' | 'shop_anfahrt' | 'shop_dwell';

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
  displayName: string; // "Panzer N" — bei Promotion der Named-Name
  prevTargetVisible: boolean;
  prog: Progression; // eigenes Level/XP/MK — gleiche Progression wie der Spieler
  credits: number; // verdient durch eigene Kills → Aufrüstung
  respawnTimer: number; // >0 = tot, kehrt als benannter Rivale zurück (Nemesis)
  equipment: ShopItem[]; // tatsächlich angelegte Teile — NUR diese kann er droppen
  bag: ShopItem[]; // eingesammelter Loot (Schatzjäger) — wird beim Shoppen verkauft
  shopGoal: { x: number; z: number } | null; // Ziel-Shop-Feld, wenn er gerade shoppen fährt
  shopState: EnemyShopState; // Phase im Shop-Trip
  dwellTimer: number; // Sekunden Rest am Shop-Feld (Einkauf simuliert)
  beltCd: number; // Sperre bis zur nächsten Booster-Zündung
  overShots: number; // Überdruck-Munition: Rest-Schüsse mit Bonus
  overMul: number; // Überdruck-Munition: Schadens-Multiplikator
  autoTurretCd: number; // Cooldown der Sekundärwaffe (Auto-Turret), falls ausgerüstet
  spawnInvulnCd: number; // 5s Unverwundbarkeit nach dem Erscheinen (Spawn/Respawn)
  belt: Belt<BoosterDef>; // gekaufte Consumables (Gürtel-Ladungen)
  buffs: BuffStack; // aktive Booster-Buffs
  damage: number; // Schaden pro Schuss — AUS DER AUSRÜSTUNG abgeleitet (nicht aus dem Level)
  scoutDir: number; // Scout-Heading (rad), wenn kein Ziel in Sicht
  scoutCd: number; // Sekunden bis zum nächsten Scout-Richtungswechsel
  mode: string; // aktueller Engagement-Modus (für Overlay/Debug)
}

export interface EnemySpec {
  id: string;
  motiveId: string;
  traits: TraitProfile;
  comp: TankComposition;
  spawn: { x: number; z: number };
  level: number;
  displayName: string;
}

/** Combatant-Stats eines Gegners NEU aus seiner Ausrüstung berechnen (Erzeugung,
 *  Shop-Aufrüstung, Respawn, Debug). HP wird dabei voll aufgefüllt. */
export function applyEnemyStats(e: Enemy): void {
  const st = enemyCombatStats(e.equipment, e.prog.level);
  e.combatant.maxHp = st.maxHp;
  e.combatant.hp = st.maxHp;
  e.combatant.armor = st.armor;
  e.combatant.dodge = st.dodge;
  e.combatant.lootValue = st.lootValue;
  e.damage = st.damage;
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
  const mk = enemyMk(spec.level);
  // Sofortiger Erstkauf beim Erscheinen (kein Shop-Feld nötig) — symmetrisch zum Spieler.
  const buy = planPurchases({ credits: mostExpensiveItemPrice(mk), equipment: [], mk, bag: [], beltFree: 3 });
  const equipment = buy.equipment;
  const prog = createProgression(spec.level);
  const st = enemyCombatStats(equipment, spec.level);
  const combatant: Combatant = {
    id: spec.id,
    team: spec.id, // jeder Gegner = eigene Fraktion → kann andere treffen
    x: spec.spawn.x,
    z: spec.spawn.z,
    radius,
    hp: st.maxHp,
    maxHp: st.maxHp,
    armor: st.armor,
    dodge: st.dodge,
    alive: true,
    lootValue: st.lootValue,
    invulnerable: true, // 5s Spawn-Gnadenzeit (siehe spawnInvulnCd)
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
    displayName: spec.displayName,
    prevTargetVisible: false,
    prog,
    credits: buy.credits, // Rest nach dem Sofort-Erstkauf
    respawnTimer: 0,
    equipment,
    bag: [],
    shopGoal: null,
    shopState: 'kaempfen', // sofort kampfbereit; weitere Käufe per Shop-Fahrt
    dwellTimer: 0,
    beltCd: 0,
    overShots: 0,
    overMul: 1,
    autoTurretCd: 0,
    spawnInvulnCd: 5,
    belt: createBelt<BoosterDef>(3),
    buffs: createBuffStack(),
    damage: st.damage,
    scoutDir: rng() * Math.PI * 2,
    scoutCd: 0,
    mode: 'scout',
  };
}
