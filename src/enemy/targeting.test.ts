import { describe, it, expect } from 'vitest';
import { pickTarget, type TargetInfo } from './targeting';

const t = (id: string, x: number, z: number, lootValue: number, team = 'player'): TargetInfo => ({
  id, team, x, z, lootValue, alive: true,
});

describe('pickTarget (Beutewert-Jagd)', () => {
  it('wählt den lohnendsten (höchster lootValue) in Sicht', () => {
    const r = pickTarget(0, 0, 'enemy', 60, [t('a', 5, 0, 0.3), t('b', 6, 0, 0.9), t('c', 4, 0, 0.5)]);
    expect(r?.id).toBe('b');
  });

  it('ignoriert das eigene Team', () => {
    const r = pickTarget(0, 0, 'enemy', 60, [t('mate', 3, 0, 0.9, 'enemy'), t('prey', 8, 0, 0.4, 'player')]);
    expect(r?.id).toBe('prey');
  });

  it('ignoriert Ziele außerhalb der Sichtweite', () => {
    expect(pickTarget(0, 0, 'enemy', 10, [t('far', 50, 0, 0.9)])).toBeNull();
  });

  it('ignoriert Tote', () => {
    const dead = { ...t('x', 3, 0, 0.9), alive: false };
    const r = pickTarget(0, 0, 'enemy', 60, [dead, t('y', 9, 0, 0.4)]);
    expect(r?.id).toBe('y');
  });

  it('bei gleichem Beutewert gewinnt der nähere', () => {
    const r = pickTarget(0, 0, 'enemy', 60, [t('weit', 20, 0, 0.5), t('nah', 4, 0, 0.5)]);
    expect(r?.id).toBe('nah');
  });
});
