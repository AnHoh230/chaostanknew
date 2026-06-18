import { describe, it, expect } from 'vitest';
import { createProjectilePool } from './projectilePool';

describe('projectilePool.acquire', () => {
  it('liefert ein Projektil mit state "inflight" und allen gesetzten Feldern', () => {
    const pool = createProjectilePool(2);
    const p = pool.acquire({ x: 1, y: 2, z: 3, dx: 0, dz: 1, speed: 10, life: 5 });
    expect(p).not.toBeNull();
    expect(p!.state).toBe('inflight');
    expect(p!.x).toBe(1);
    expect(p!.y).toBe(2);
    expect(p!.z).toBe(3);
    expect(p!.dx).toBe(0);
    expect(p!.dz).toBe(1);
    expect(p!.speed).toBe(10);
    expect(p!.life).toBe(5);
    expect(p!.id).toBeTypeOf('string');
  });

  it('liefert null wenn der Pool voll ist', () => {
    const pool = createProjectilePool(1);
    pool.acquire({ x: 0, y: 0, z: 0, dx: 1, dz: 0, speed: 1, life: 1 });
    const second = pool.acquire({ x: 0, y: 0, z: 0, dx: 1, dz: 0, speed: 1, life: 1 });
    expect(second).toBeNull();
  });

  it('recyceltes Objekt trägt KEINE alten Werte (kein Leak)', () => {
    const pool = createProjectilePool(1);
    const first = pool.acquire({ x: 99, y: 99, z: 99, dx: -7, dz: -7, speed: 999, life: 0.0001 });
    expect(first).not.toBeNull();
    pool.update(1); // life<=0 -> consumed -> inactive
    expect(pool.activeCount()).toBe(0);
    const reused = pool.acquire({ x: 5, y: 6, z: 7, dx: 1, dz: 0, speed: 2, life: 3 });
    expect(reused).not.toBeNull();
    expect(reused!.x).toBe(5);
    expect(reused!.y).toBe(6);
    expect(reused!.z).toBe(7);
    expect(reused!.dx).toBe(1);
    expect(reused!.dz).toBe(0);
    expect(reused!.speed).toBe(2);
    expect(reused!.life).toBe(3);
    expect(reused!.state).toBe('inflight');
  });
});

describe('projectilePool.update', () => {
  it('bewegt inflight mit x+=dx*speed*simDt und z+=dz*speed*simDt', () => {
    const pool = createProjectilePool(1);
    const p = pool.acquire({ x: 0, y: 0, z: 0, dx: 1, dz: 0.5, speed: 4, life: 100 });
    pool.update(0.5);
    expect(p!.x).toBeCloseTo(0 + 1 * 4 * 0.5, 6); // 2
    expect(p!.z).toBeCloseTo(0 + 0.5 * 4 * 0.5, 6); // 1
    expect(p!.life).toBeCloseTo(99.5, 6);
    expect(p!.state).toBe('inflight');
  });

  it('setzt life<=0 -> consumed -> recycelt zu inactive (nicht mehr aktiv)', () => {
    const pool = createProjectilePool(1);
    pool.acquire({ x: 0, y: 0, z: 0, dx: 1, dz: 0, speed: 1, life: 1 });
    expect(pool.activeCount()).toBe(1);
    pool.update(1); // life 1 -> 0 -> consumed -> inactive
    expect(pool.activeCount()).toBe(0);
  });
});

describe('projectilePool Invariante', () => {
  it('activeCount() entspricht nach beliebiger Sequenz der Zahl der inflight-Objekte', () => {
    const pool = createProjectilePool(4);
    pool.acquire({ x: 0, y: 0, z: 0, dx: 1, dz: 0, speed: 1, life: 10 });
    pool.acquire({ x: 0, y: 0, z: 0, dx: 1, dz: 0, speed: 1, life: 2 });
    pool.acquire({ x: 0, y: 0, z: 0, dx: 1, dz: 0, speed: 1, life: 0.5 });
    pool.update(1); // ein Projektil (life 0.5) verfällt

    let counted = 0;
    pool.forEachActive((p) => {
      expect(p.state).toBe('inflight');
      counted++;
    });
    expect(counted).toBe(pool.activeCount());
    expect(pool.activeCount()).toBe(2);

    // wieder auffüllen und prüfen, dass recycelte Slots korrekt zählen
    pool.acquire({ x: 0, y: 0, z: 0, dx: 1, dz: 0, speed: 1, life: 5 });
    pool.acquire({ x: 0, y: 0, z: 0, dx: 1, dz: 0, speed: 1, life: 5 });
    let counted2 = 0;
    pool.forEachActive(() => {
      counted2++;
    });
    expect(counted2).toBe(pool.activeCount());
    expect(pool.activeCount()).toBe(4);

    // forEachActive iteriert NUR über inflight (kein consumed/inactive)
    pool.update(100); // alles verfällt
    let counted3 = 0;
    pool.forEachActive(() => {
      counted3++;
    });
    expect(counted3).toBe(0);
    expect(pool.activeCount()).toBe(0);
  });
});
