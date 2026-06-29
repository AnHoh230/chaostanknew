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

describe('ladeKarte — Material-Batching statischer Props', () => {
  it('batcht statische Props nach Material (1 Submesh/Draw je Batch), interaktive bleiben einzeln', () => {
    const scene = new Scene(new NullEngine());
    const entities = [
      ent('o1', 'obstacle', 'betonblock', 10, 10), // Chunk 0,0
      ent('o2', 'obstacle', 'container', 20, 20), // Chunk 0,0
      ent('d1', 'decor', 'truemmer', 30, 15), // Chunk 0,0
      ent('l1', 'landmark', 'funkturm', 250, 10), // Chunk 2,0
      ent('b1', 'breakable', 'fass', 15, 15), // interaktiv -> eigenes Mesh
      ent('c1', 'collectible', 'fund_huhn', 25, 25), // interaktiv -> eigenes Mesh
    ];
    const handle = ladeKarte(scene, karte(entities));
    const finde = (id: string) => handle.entities.find((g) => g.entity.id === id)!;
    const meshVon = (id: string) => finde(id).mesh;

    // Alle Gameplay-Entities bleiben erhalten (Daten unangetastet).
    expect(handle.entities).toHaveLength(6);

    // Statische Props teilen sich den leeren, deaktivierten Platzhalter (ihr Mesh wird nie genutzt).
    expect(meshVon('o1')).toBe(meshVon('o2'));
    expect(meshVon('o1')).toBe(meshVon('l1'));
    expect(meshVon('o1').isEnabled()).toBe(false);
    expect(meshVon('o1').getTotalVertices()).toBe(0);

    // Interaktive Props haben ihr eigenes, echtes Mesh (separat voneinander + vom Platzhalter).
    expect(meshVon('b1')).not.toBe(meshVon('o1'));
    expect(meshVon('c1')).not.toBe(meshVon('o1'));
    expect(meshVon('b1')).not.toBe(meshVon('c1'));
    expect(meshVon('b1').getTotalVertices()).toBeGreaterThan(0);

    // KERN: jeder statische Batch ist single-material = genau 1 Submesh = 1 Draw-Call.
    const batches = handle.root.getChildMeshes().filter((m) => m.name.startsWith('batch_'));
    expect(batches.length).toBeGreaterThan(0);
    for (const b of batches) {
      expect(b.subMeshes.length).toBe(1);
      expect(b.getTotalVertices()).toBeGreaterThan(0);
    }

    // Gameplay-Daten intakt: Breakable hat HP, Obstacle ist solide.
    expect(finde('b1').hp).toBeGreaterThan(0);
    expect(finde('o1').solide).toBe(true);

    handle.dispose();
  });
});
