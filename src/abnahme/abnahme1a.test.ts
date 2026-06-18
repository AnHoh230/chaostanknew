import { describe, it, expect, vi } from 'vitest';
import { NullEngine, Scene } from '@babylonjs/core';
import { createTankView } from '../tank/tankFactory';
import { SOCKETS } from '../tank/sockets';
import type { SocketName, TankComposition } from '../tank/sockets';
import { createProjectilePool } from '../combat/projectilePool';
import { getBiome } from '../world/biomeRegistry';

function makeScene(): Scene {
  const engine = new NullEngine();
  return new Scene(engine);
}

const baseComp: TankComposition = {
  chassis: 'c_box',
  wheels: 'w_round',
  turret: 't_small',
  weapon: 'g_short',
};

const VARIANTS: Record<SocketName, [string, string]> = {
  chassis: ['c_box', 'c_wide'],
  wheels: ['w_round', 'w_tread'],
  turret: ['t_small', 't_big'],
  weapon: ['g_short', 'g_long'],
};

describe('§21.1 Modulare Teile — getrennte Mesh-Knoten auf benannten Sockets + Laufzeit-Tausch', () => {
  it('jeder Socket existiert als benannter Kind-TransformNode socket_<name>', () => {
    const scene = makeScene();
    const view = createTankView(scene, baseComp);
    for (const s of SOCKETS) {
      const node = view.root.getChildTransformNodes(false).find((n) => n.name === `socket_${s}`);
      expect(node, `socket_${s} muss als getrennter Knoten existieren`).toBeDefined();
    }
  });

  it('jeder Socket hat >=2 Varianten und setVariant tauscht das Mesh zur Laufzeit (altes weg, neues da)', () => {
    const scene = makeScene();
    const view = createTankView(scene, baseComp);
    for (const s of SOCKETS) {
      const [, v2] = VARIANTS[s];
      const before = scene.meshes.map((m) => m.uniqueId);
      view.setVariant(s, v2);
      const after = scene.meshes.map((m) => m.uniqueId);
      // Mesh-Set muss sich geaendert haben (Tausch = altes dispose + neues add)
      expect(after, `Variantentausch auf ${s} muss Szenen-Meshes veraendern`).not.toEqual(before);
    }
  });
});

describe('§21.5 Pool-Vertrag — acquire setzt alle Felder, aktiv==sichtbar', () => {
  it('acquire setzt ALLE Felder neu (kein Leak), state=inflight', () => {
    const pool = createProjectilePool(4);
    const p = pool.acquire({ x: 1, y: 2, z: 3, dx: 1, dz: 0, speed: 10, life: 2 });
    expect(p).not.toBeNull();
    expect(p!.state).toBe('inflight');
    expect({ x: p!.x, y: p!.y, z: p!.z, dx: p!.dx, dz: p!.dz, speed: p!.speed, life: p!.life }).toEqual({
      x: 1,
      y: 2,
      z: 3,
      dx: 1,
      dz: 0,
      speed: 10,
      life: 2,
    });
  });

  it('activeCount entspricht der Anzahl per forEachActive iterierter inflight-Projektile (aktiv==sichtbar-Quelle)', () => {
    const pool = createProjectilePool(8);
    pool.acquire({ x: 0, y: 0, z: 0, dx: 1, dz: 0, speed: 5, life: 1 });
    pool.acquire({ x: 0, y: 0, z: 0, dx: 0, dz: 1, speed: 5, life: 1 });
    let counted = 0;
    pool.forEachActive(() => counted++);
    expect(counted).toBe(pool.activeCount());
    expect(pool.activeCount()).toBe(2);
  });

  it('nach Ablauf der Lebenszeit wird recycelt: activeCount sinkt, kein Phantom', () => {
    const pool = createProjectilePool(4);
    pool.acquire({ x: 0, y: 0, z: 0, dx: 1, dz: 0, speed: 5, life: 0.5 });
    expect(pool.activeCount()).toBe(1);
    pool.update(1); // life 0.5 -> consumed -> inactive
    expect(pool.activeCount()).toBe(0);
    let counted = 0;
    pool.forEachActive(() => counted++);
    expect(counted).toBe(0);
  });
});

describe('§21.6 Keine stillen Fallbacks — unbekanntes Biom wirft', () => {
  it('getBiome mit unbekannter id wirft erwarteten Error', () => {
    expect(() => getBiome('does_not_exist')).toThrowError('Unknown biome: does_not_exist');
  });
});

describe('§21.8 Logging liefert gestuftes Signal (Gate + Routing)', () => {
  it('scharfes Logging (enabled, minLevel debug) routet auf console und gibt Signal', async () => {
    vi.resetModules();
    const { createLogger, logConfig } = await import('../core/log');
    logConfig.enabled = true;
    logConfig.minLevel = 'debug';
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    createLogger('abnahme').debug('signal');
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('minLevel=warn unterdrueckt debug-Signal (gestuft, kein Spam)', async () => {
    vi.resetModules();
    const { createLogger, logConfig } = await import('../core/log');
    logConfig.enabled = true;
    logConfig.minLevel = 'warn';
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    createLogger('abnahme').debug('should be muted');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
