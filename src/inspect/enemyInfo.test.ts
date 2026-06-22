import { describe, it, expect } from 'vitest';
import { buildEnemyInfo, type EnemyLike } from './enemyInfo';

const base: EnemyLike = {
  id: 'e1',
  displayName: 'Panzer 7',
  level: 6,
  damage: 33, // aus dem Level
  speed: 5,
  combatant: { hp: 200, maxHp: 240, armor: 131, lootValue: 1.4 },
};

describe('buildEnemyInfo', () => {
  it('Lese-Snapshot: MK aus Level, Stats ohne Ausrüstung', () => {
    const info = buildEnemyInfo(base);

    expect(info.name).toBe('Panzer 7');
    expect(info.level).toBe(6);
    expect(info.mk).toBe(3); // enemyMk(6) = ceil(6/2)
    expect(info.damage).toBe(33);
    expect(info.hp).toBe(200);
    expect(info.maxHp).toBe(240);
    expect(info.armor).toBe(131);
    expect(info.lootValue).toBe(1.4);
    expect(info.boosters).toEqual([]);
  });

  it('aktive Buffs werden als boosters gespiegelt', () => {
    const info = buildEnemyInfo({ ...base, activeBuffs: ['Markiert'] });
    expect(info.boosters).toEqual(['Markiert']);
  });
});
