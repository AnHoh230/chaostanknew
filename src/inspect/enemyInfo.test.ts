import { describe, it, expect } from 'vitest';
import { buildEnemyInfo, type EnemyLike } from './enemyInfo';

const base: EnemyLike = {
  id: 'e1',
  displayName: 'Panzer 7',
  level: 6,
  damage: 33, // aus der Ausrüstung
  speed: 5,
  combatant: { hp: 200, maxHp: 240, armor: 131, lootValue: 1.4 },
  equipment: [
    { slot: 'waffe', name: 'MK3 Stahlzahn', damage: 48, hp: 0, armor: 0, speed: 0 },
    { slot: 'ruestung', name: 'MK3 Frontplatte', damage: 0, hp: 0, armor: 77, speed: 0 },
  ],
};

describe('buildEnemyInfo', () => {
  it('Lese-Snapshot: MK aus Level, Stats + Ausrüstung', () => {
    const info = buildEnemyInfo(base);

    expect(info.name).toBe('Panzer 7');
    expect(info.level).toBe(6);
    expect(info.mk).toBe(3); // enemyMk(6) = ceil(6/2)
    expect(info.damage).toBe(33); // aus der Ausrüstung (e.damage)
    expect(info.hp).toBe(200);
    expect(info.maxHp).toBe(240);
    expect(info.armor).toBe(131);
    expect(info.equipment[0]).toEqual({ slot: 'waffe', name: 'MK3 Stahlzahn', stat: '48 Schaden' });
    expect(info.equipment[1]).toEqual({ slot: 'ruestung', name: 'MK3 Frontplatte', stat: '77 Rüstung' });
    expect(info.boosters).toEqual([]);
  });

  it('aktive Buffs werden als boosters gespiegelt', () => {
    const info = buildEnemyInfo({ ...base, activeBuffs: ['Markiert'] });
    expect(info.boosters).toEqual(['Markiert']);
  });
});
