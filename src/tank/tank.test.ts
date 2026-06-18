import { describe, it, expect } from 'vitest';
import { createTank } from './tank';
import type { TankView } from './tankFactory';

function makeStubView(): TankView {
  // Minimal-Stub: createTank berührt die View-Felder nicht, nur Referenz halten.
  return {
    root: {} as TankView['root'],
    turretNode: {} as TankView['turretNode'],
    setVariant: () => {},
  };
}

describe('createTank', () => {
  it('setzt id, view, hp=maxHp und maxHp korrekt', () => {
    const view = makeStubView();
    const tank = createTank('t1', view, 100);
    expect(tank.id).toBe('t1');
    expect(tank.view).toBe(view);
    expect(tank.maxHp).toBe(100);
    expect(tank.hp).toBe(100);
  });

  it('startet mit voller HP (hp === maxHp)', () => {
    const tank = createTank('t2', makeStubView(), 42);
    expect(tank.hp).toBe(tank.maxHp);
    expect(tank.hp).toBe(42);
  });

  it('verschiedene IDs bleiben unabhängig erhalten', () => {
    const a = createTank('alpha', makeStubView(), 10);
    const b = createTank('beta', makeStubView(), 20);
    expect(a.id).toBe('alpha');
    expect(b.id).toBe('beta');
    expect(a.maxHp).toBe(10);
    expect(b.maxHp).toBe(20);
  });
});
