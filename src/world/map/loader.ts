/**
 * Loader: instanziiert KartenDaten in die Babylon-Szene (Platzhalter-Meshes aus dem Asset-Kit).
 * Phase 3 rendert nur; Gameplay-Hooks (Breakable-HP, Hazard, Nest, Collectible, Secret) kommen
 * in den Folgephasen dazu. Der Endlos-Boden (world/ground.ts) bleibt unberührt.
 */
import { TransformNode, Vector3 } from '@babylonjs/core';
import type { Scene, Mesh } from '@babylonjs/core';
import type { KartenDaten, MapEntity } from './mapTypes';
import { getAsset } from './assetKit';
import { baueAssetMesh } from './mapMesh';

export interface GeladeneEntity {
  entity: MapEntity;
  mesh: Mesh;
}

export interface MapHandle {
  root: TransformNode;
  entities: GeladeneEntity[];
  update(): void;
  dispose(): void;
}

export function ladeKarte(scene: Scene, daten: KartenDaten): MapHandle {
  const root = new TransformNode('mapRoot', scene);
  const geladen: GeladeneEntity[] = [];

  for (const e of daten.entities) {
    const def = getAsset(e.asset);
    const mesh = baueAssetMesh(scene, def, 'map_' + e.id);
    mesh.parent = root;
    mesh.position = new Vector3(e.pos.x, (def.mesh.size.y / 2) * e.scale, e.pos.z);
    mesh.rotation.y = e.rotY;
    mesh.scaling.setAll(e.scale);
    mesh.metadata = { entityId: e.id, kind: e.kind };
    geladen.push({ entity: e, mesh });
  }

  return {
    root,
    entities: geladen,
    update(): void {
      /* Phase 3: statische Welt. Gameplay-Updates folgen in Phase 4+. */
    },
    dispose(): void {
      root.dispose(false, true);
    },
  };
}
