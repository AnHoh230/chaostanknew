import { describe, it, expect } from 'vitest';
import { createProjectilePool } from './projectilePool';
import { createCombatSystem, type Combatant } from './combat';

function enemyAt(x: number, z: number, hp = 100): Combatant {
  return { id: 'e1', team: 'enemy', x, z, radius: 1.5, hp, maxHp: hp, alive: true };
}

describe('createCombatSystem', () => {
  it('ein Projektil im Gegner-Radius zieht Schaden ab und wird verbraucht', () => {
    const pool = createProjectilePool(8);
    const enemy = enemyAt(0, 0);
    const combat = createCombatSystem(pool, () => [enemy], { damage: 20, projectileRadius: 0.3 });

    pool.acquire({ x: 0.5, y: 0.5, z: 0, dx: 1, dz: 0, speed: 30, life: 3 });
    combat.update();

    expect(enemy.hp).toBe(80);
    expect(pool.activeCount()).toBe(0); // Projektil verbraucht
  });

  it('verfehlt: kein Schaden, Projektil bleibt aktiv', () => {
    const pool = createProjectilePool(8);
    const enemy = enemyAt(50, 50);
    const combat = createCombatSystem(pool, () => [enemy], { damage: 20, projectileRadius: 0.3 });

    pool.acquire({ x: 0, y: 0.5, z: 0, dx: 1, dz: 0, speed: 30, life: 3 });
    combat.update();

    expect(enemy.hp).toBe(100);
    expect(pool.activeCount()).toBe(1);
  });

  it('tödlicher Treffer: alive=false, hp auf 0 geklemmt, onDeath genau einmal', () => {
    const pool = createProjectilePool(8);
    const enemy = enemyAt(0, 0, 15);
    let deaths = 0;
    const combat = createCombatSystem(pool, () => [enemy], {
      damage: 20,
      projectileRadius: 0.3,
      onDeath: () => deaths++,
    });

    pool.acquire({ x: 0, y: 0.5, z: 0, dx: 1, dz: 0, speed: 30, life: 3 });
    combat.update();

    expect(enemy.hp).toBe(0);
    expect(enemy.alive).toBe(false);
    expect(deaths).toBe(1);

    // Weiterer Schuss auf den Toten: kein Treffer mehr, Projektil bleibt aktiv.
    pool.acquire({ x: 0, y: 0.5, z: 0, dx: 1, dz: 0, speed: 30, life: 3 });
    combat.update();
    expect(deaths).toBe(1);
    expect(pool.activeCount()).toBe(1);
  });

  it('eigenes Team wird nicht getroffen (Spieler-Projektil verschont Spieler)', () => {
    const pool = createProjectilePool(8);
    const player: Combatant = {
      id: 'player', team: 'player', x: 0, z: 0, radius: 1.5, hp: 100, maxHp: 100, alive: true,
    };
    const combat = createCombatSystem(pool, () => [player], { damage: 20, projectileRadius: 0.3 });

    pool.acquire({ x: 0, y: 0.5, z: 0, dx: 1, dz: 0, speed: 30, life: 3 }); // default team 'player'
    combat.update();

    expect(player.hp).toBe(100);
    expect(pool.activeCount()).toBe(1);
  });

  it('unverwundbarer Spieler (Schutzzone) nimmt keinen Schaden, Projektil fliegt weiter', () => {
    const pool = createProjectilePool(8);
    const player: Combatant = {
      id: 'player', team: 'player', x: 0, z: 0, radius: 1.5, hp: 100, maxHp: 100, alive: true,
      invulnerable: true,
    };
    const combat = createCombatSystem(pool, () => [player], { damage: 50, projectileRadius: 0.3 });

    pool.acquire({ x: 0, y: 0.5, z: 0, dx: 1, dz: 0, speed: 30, life: 3, team: 'enemy' });
    combat.update();

    expect(player.hp).toBe(100); // kein Schaden auf dem Shop-Feld
    expect(pool.activeCount()).toBe(1); // Projektil nicht absorbiert
  });

  it('dodge=1: Treffer wird ausgewichen, kein Schaden, Projektil verbraucht', () => {
    const pool = createProjectilePool(8);
    const player: Combatant = {
      id: 'player', team: 'player', x: 0, z: 0, radius: 1.5, hp: 100, maxHp: 100, alive: true,
      dodge: 1,
    };
    const combat = createCombatSystem(pool, () => [player], {
      damage: 30, projectileRadius: 0.3, rng: () => 0,
    });
    pool.acquire({ x: 0, y: 0.5, z: 0, dx: 1, dz: 0, speed: 30, life: 3, team: 'enemy' });
    combat.update();
    expect(player.hp).toBe(100); // ausgewichen
    expect(pool.activeCount()).toBe(0); // Projektil trotzdem verbraucht
  });

  it('dodge=0: normaler Treffer (kein Ausweichen)', () => {
    const pool = createProjectilePool(8);
    const enemy = enemyAt(0, 0, 100);
    enemy.dodge = 0;
    const combat = createCombatSystem(pool, () => [enemy], {
      damage: 20, projectileRadius: 0.3, rng: () => 0,
    });
    pool.acquire({ x: 0, y: 0.5, z: 0, dx: 1, dz: 0, speed: 30, life: 3 });
    combat.update();
    expect(enemy.hp).toBe(80);
  });

  it('incomingMul (Zielmarkierung) erhöht den eingehenden Schaden', () => {
    const pool = createProjectilePool(8);
    const enemy = enemyAt(0, 0, 100);
    enemy.incomingMul = 1.5; // markiert → +50 %
    const combat = createCombatSystem(pool, () => [enemy], { damage: 20, projectileRadius: 0.3 });
    pool.acquire({ x: 0, y: 0.5, z: 0, dx: 1, dz: 0, speed: 30, life: 3, damage: 20 });
    combat.update();
    expect(enemy.hp).toBe(70); // 20 × 1.5 = 30
  });

  it('Gegner-Projektil (team enemy) trifft den Spieler', () => {
    const pool = createProjectilePool(8);
    const player: Combatant = {
      id: 'player', team: 'player', x: 0, z: 0, radius: 1.5, hp: 100, maxHp: 100, alive: true,
    };
    const combat = createCombatSystem(pool, () => [player], { damage: 10, projectileRadius: 0.3 });

    pool.acquire({ x: 0, y: 0.5, z: 0, dx: 1, dz: 0, speed: 30, life: 3, team: 'enemy' });
    combat.update();

    expect(player.hp).toBe(90);
    expect(pool.activeCount()).toBe(0);
  });
});
