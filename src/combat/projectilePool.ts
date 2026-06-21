export type ProjectileState = 'inactive' | 'inflight' | 'consumed';

export interface Projectile {
  id: string;
  state: ProjectileState;
  team: string; // wer gefeuert hat ('player' | 'enemy' | ...)
  damage: number; // Schaden dieses Schusses (0 = Pool-Default des Kampfsystems)
  auto: boolean; // true = aus einer Sekundärwaffe (Auto-Turret), nicht manuell gefeuert
  x: number;
  y: number;
  z: number;
  dx: number;
  dz: number;
  speed: number;
  life: number;
}

export interface SpawnArgs {
  x: number;
  y: number;
  z: number;
  dx: number;
  dz: number;
  speed: number;
  life: number;
  team?: string; // Default 'player' (Slice 1a war nur Spieler)
  damage?: number; // Default 0 (Kampfsystem nutzt dann seinen Pool-Default)
  auto?: boolean; // Default false; true für Auto-Turret-Schüsse
}

export interface ProjectilePool {
  acquire(s: SpawnArgs): Projectile | null;
  update(simDt: number): void;
  activeCount(): number;
  forEachActive(fn: (p: Projectile) => void): void;
  /** Projektil sofort verbrauchen (z. B. bei Treffer) — wird nicht mehr aktiv. */
  deactivate(p: Projectile): void;
}

export function createProjectilePool(capacity: number): ProjectilePool {
  const items: Projectile[] = [];
  for (let i = 0; i < capacity; i++) {
    items.push({
      id: 'proj_' + i,
      state: 'inactive',
      team: 'player',
      damage: 0,
      auto: false,
      x: 0,
      y: 0,
      z: 0,
      dx: 0,
      dz: 0,
      speed: 0,
      life: 0,
    });
  }

  function acquire(s: SpawnArgs): Projectile | null {
    for (let i = 0; i < items.length; i++) {
      const p = items[i]!;
      if (p.state === 'inactive') {
        p.x = s.x;
        p.y = s.y;
        p.z = s.z;
        p.dx = s.dx;
        p.dz = s.dz;
        p.speed = s.speed;
        p.life = s.life;
        p.team = s.team ?? 'player';
        p.damage = s.damage ?? 0;
        p.auto = s.auto ?? false;
        p.state = 'inflight';
        return p;
      }
    }
    return null;
  }

  function update(simDt: number): void {
    for (let i = 0; i < items.length; i++) {
      const p = items[i]!;
      if (p.state !== 'inflight') continue;
      p.x += p.dx * p.speed * simDt;
      p.z += p.dz * p.speed * simDt;
      p.life -= simDt;
      if (p.life <= 0) {
        p.state = 'consumed';
        p.state = 'inactive';
      }
    }
  }

  function activeCount(): number {
    let n = 0;
    for (let i = 0; i < items.length; i++) {
      if (items[i]!.state === 'inflight') n++;
    }
    return n;
  }

  function forEachActive(fn: (p: Projectile) => void): void {
    for (let i = 0; i < items.length; i++) {
      const p = items[i]!;
      if (p.state === 'inflight') fn(p);
    }
  }

  function deactivate(p: Projectile): void {
    p.state = 'inactive';
    p.life = 0;
  }

  return { acquire, update, activeCount, forEachActive, deactivate };
}
