import { describe, it, expect } from 'vitest';
import { buildEnemyInfo, type EnemyLike } from './enemyInfo';
import { enemyLevelStats } from '../enemy/enemy';

const base: EnemyLike = {
  id: 'e1',
  displayName: 'Garfild der Aasgeier',
  named: { archetyp: 'der Rasende' },
  motiveId: 'aasgeier',
  level: 6,
  speed: 5,
  combatant: { hp: 200, maxHp: 240, armor: 131, lootValue: 1.4 },
  equipment: [
    { slot: 'waffe', name: 'MK3 Stahlzahn', damage: 48, hp: 0, armor: 0, speed: 0 },
    { slot: 'ruestung', name: 'MK3 Frontplatte', damage: 0, hp: 0, armor: 77, speed: 0 },
  ],
  bag: [{ name: 'MK1 Wachturm' }],
};

describe('buildEnemyInfo', () => {
  it('benannter Gegner: Archetyp, Motiv-Label, MK aus Level, Ausrüstung + Historie', () => {
    const akte = { begegnungen: 3, siege: 2, niederlagen: 1, knappsterSieg: 0.14 };
    const info = buildEnemyInfo(base, akte);

    expect(info.isNamed).toBe(true);
    expect(info.archetyp).toBe('der Rasende');
    expect(info.motiv).toBe('Aasgeier');
    expect(info.level).toBe(6);
    expect(info.mk).toBe(3); // enemyMk(6) = ceil(6/2)
    expect(info.damage).toBe(enemyLevelStats(6).damage);
    expect(info.hp).toBe(200);
    expect(info.maxHp).toBe(240);
    expect(info.armor).toBe(131);
    expect(info.equipment[0]).toEqual({ slot: 'waffe', name: 'MK3 Stahlzahn', stat: '48 Schaden' });
    expect(info.equipment[1]).toEqual({ slot: 'ruestung', name: 'MK3 Frontplatte', stat: '77 Rüstung' });
    expect(info.bag).toEqual(['MK1 Wachturm']);
    expect(info.boosters).toEqual([]);
    expect(info.history).toEqual({
      hasHistory: true, begegnungen: 3, siege: 2, niederlagen: 1, knappsterSiegPct: 14,
    });
  });

  it('"Panzer N" ohne Akte: kein Archetyp, keine Historie', () => {
    const plain: EnemyLike = { ...base, id: 'e2', displayName: 'Panzer 7', named: null };
    const info = buildEnemyInfo(plain, null);

    expect(info.isNamed).toBe(false);
    expect(info.archetyp).toBeNull();
    expect(info.name).toBe('Panzer 7');
    expect(info.history.hasHistory).toBe(false);
    expect(info.equipment.length).toBe(2); // Ausrüstung trotzdem lesbar
  });

  it('Akte ohne Begegnungen zählt als keine Historie', () => {
    const info = buildEnemyInfo(base, { begegnungen: 0, siege: 0, niederlagen: 0, knappsterSieg: 1 });
    expect(info.history.hasHistory).toBe(false);
  });
});
