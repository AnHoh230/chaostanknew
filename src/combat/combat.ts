import type { ProjectilePool, Projectile } from './projectilePool';
import { circleOverlap } from './hitMath';
import { dodgeRoll } from './accuracy';

/** Ein treffbarer Akteur in der Welt (Spieler oder Gegner). */
export interface Combatant {
  id: string;
  team: string; // 'player' | 'enemy' | ...
  x: number;
  z: number;
  radius: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  /** Beutewert für die Jagd-KI (0..1+); fehlt = 0. Steigt später mit verbauten Teilen. */
  lootValue?: number;
  /** Rüstung: reduziert eingehenden Schaden über abnehmende Ausbeute; fehlt = 0. */
  armor?: number;
  /** Schutzzone (z. B. Shop-Feld): nimmt keinen Schaden, Projektile fliegen durch. */
  invulnerable?: boolean;
  /** Ausweich-Chance (0..1): Treffer wird mit dieser Wahrscheinlichkeit negiert. */
  dodge?: number;
}

const ARMOR_K = 300; // Rüstungs-Skala: Reduktion = armor/(armor+K)

/** Effektiver Schaden nach Rüstung (mind. 1). */
export function effectiveDamage(dmg: number, armor: number): number {
  if (armor <= 0) return dmg;
  return Math.max(1, Math.round(dmg * (1 - armor / (armor + ARMOR_K))));
}

export interface HitInfo {
  projectile: Projectile;
  target: Combatant;
  damage: number;
  lethal: boolean;
}

export interface CombatOptions {
  damage: number; // Schaden pro Treffer
  projectileRadius: number;
  rng?: () => number; // für Ausweich-Würfe (Default Math.random)
  onHit?: (h: HitInfo) => void;
  onDeath?: (target: Combatant, killerTeam: string) => void;
}

export interface CombatSystem {
  update(): void;
}

/**
 * Treffer-Auflösung pro Frame: jedes aktive Projektil gegen jeden lebenden
 * Combatant des GEGNERISCHEN Teams testen (kein Eigen-/Freundfeuer). Treffer =
 * Schaden + Projektil verbraucht; HP<=0 = Tod (einmalig).
 */
export function createCombatSystem(
  pool: ProjectilePool,
  getTargets: () => Combatant[],
  opts: CombatOptions,
): CombatSystem {
  function update(): void {
    const targets = getTargets();
    pool.forEachActive((p) => {
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i]!;
        if (!t.alive || t.team === p.team || t.invulnerable) continue;
        if (circleOverlap(p.x, p.z, opts.projectileRadius, t.x, t.z, t.radius)) {
          // Ausweichen: Treffer negiert, Projektil aber verbraucht.
          if (t.dodge && dodgeRoll(t.dodge, opts.rng ?? Math.random)) {
            pool.deactivate(p);
            return;
          }
          const raw = p.damage > 0 ? p.damage : opts.damage;
          const dmg = effectiveDamage(raw, t.armor ?? 0);
          t.hp -= dmg;
          const lethal = t.hp <= 0;
          if (lethal) {
            t.hp = 0;
            t.alive = false;
          }
          pool.deactivate(p);
          opts.onHit?.({ projectile: p, target: t, damage: dmg, lethal });
          if (lethal) opts.onDeath?.(t, p.team);
          return; // dieses Projektil ist verbraucht
        }
      }
    });
  }

  return { update };
}
