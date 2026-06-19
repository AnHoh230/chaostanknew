import type { ProjectilePool, Projectile } from './projectilePool';
import { circleOverlap } from './hitMath';

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
  onHit?: (h: HitInfo) => void;
  onDeath?: (target: Combatant) => void;
}

export interface CombatSystem {
  update(): void;
}

/**
 * Treffer-Auflösung pro Frame: jedes aktive Projektil gegen jeden lebenden
 * Combatant testen, dessen Team NICHT 'player' ist (im Slice feuert nur der
 * Spieler). Treffer = Schaden + Projektil verbraucht; HP<=0 = Tod (einmalig).
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
        if (!t.alive || t.team === 'player') continue;
        if (circleOverlap(p.x, p.z, opts.projectileRadius, t.x, t.z, t.radius)) {
          t.hp -= opts.damage;
          const lethal = t.hp <= 0;
          if (lethal) {
            t.hp = 0;
            t.alive = false;
          }
          pool.deactivate(p);
          opts.onHit?.({ projectile: p, target: t, damage: opts.damage, lethal });
          if (lethal) opts.onDeath?.(t);
          return; // dieses Projektil ist verbraucht
        }
      }
    });
  }

  return { update };
}
