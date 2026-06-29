import { describe, it, expect } from 'vitest';
import { NullEngine, Scene } from '@babylonjs/core';
import { ladeKarte } from './loader';
import type { KartenDaten, MapEntity, EntityKind } from './mapTypes';

function ent(id: string, kind: EntityKind, asset: string, x: number, z: number): MapEntity {
  return { id, kind, asset, pos: { x, z }, rotY: 0, scale: 1 };
}

function karte(entities: MapEntity[]): KartenDaten {
  return {
    rezeptId: 'test', seed: 1, biomeId: 'steppe',
    extents: { halfX: 400, halfZ: 320 }, spawn: { x: 0, z: 0 },
    zones: [], paths: [], entities, valid: true, warnungen: [],
  };
}

describe('ladeKarte — Chunked Static Batching', () => {
  it('merged statische Props desselben Chunks zu EINEM Mesh, interaktive bleiben einzeln', () => {
    const scene = new Scene(new NullEngine());
    const entities = [
      ent('o1', 'obstacle', 'betonblock', 10, 10), // Chunk 0,0
      ent('o2', 'obstacle', 'container', 20, 20), // Chunk 0,0
      ent('d1', 'decor', 'truemmer', 30, 15), // Chunk 0,0
      ent('l1', 'landmark', 'funkturm', 250, 10), // Chunk 2,0 (allein)
      ent('b1', 'breakable', 'fass', 15, 15), // interaktiv -> eigenes Mesh
      ent('c1', 'collectible', 'fund_huhn', 25, 25), // interaktiv -> eigenes Mesh
    ];
    const handle = ladeKarte(scene, karte(entities));

    // Alle Gameplay-Entities bleiben erhalten (Daten unangetastet).
    expect(handle.entities).toHaveLength(6);

    const meshVon = (id: string): unknown => handle.entities.find((g) => g.entity.id === id)!.mesh;

    // 3 statische Props in Chunk 0,0 teilen sich EIN gemergtes Mesh.
    expect(meshVon('o1')).toBe(meshVon('o2'));
    expect(meshVon('o1')).toBe(meshVon('d1'));

    // Anderer Chunk -> anderes Mesh.
    expect(meshVon('l1')).not.toBe(meshVon('o1'));

    // Interaktive Props haben ihr eigenes, separates Mesh.
    expect(meshVon('b1')).not.toBe(meshVon('o1'));
    expect(meshVon('c1')).not.toBe(meshVon('o1'));
    expect(meshVon('b1')).not.toBe(meshVon('c1'));

    // Der Gewinn: weniger Meshes als Entities (6 Props -> 4 Meshes: ChunkA, ChunkB, fass, huhn).
    expect(handle.root.getChildMeshes()).toHaveLength(4);

    // Gameplay-Daten intakt: Breakable hat HP, Obstacle ist solide.
    expect(handle.entities.find((g) => g.entity.id === 'b1')!.hp).toBeGreaterThan(0);
    expect(handle.entities.find((g) => g.entity.id === 'o1')!.solide).toBe(true);

    handle.dispose();
  });
});
