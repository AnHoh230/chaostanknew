/**
 * Loader: instanziiert KartenDaten in die Babylon-Szene (Platzhalter-Meshes aus dem Asset-Kit)
 * und hält pro Entity den Gameplay-Runtime-Zustand (Breakable-HP, Hazard-Kontakt-Takt,
 * Interaktionsradius). Die eigentlichen Gameplay-Checks laufen in main.ts über entities[].
 * Der Endlos-Boden (world/ground.ts) bleibt unberührt.
 */
import { TransformNode, Vector3 } from '@babylonjs/core';
import type { Scene, Mesh } from '@babylonjs/core';
import type { KartenDaten, MapEntity } from './mapTypes';
import { getAsset } from './assetKit';
import { baueAssetMesh } from './mapMesh';
import { createBreakable } from './mapEntities';

export interface GeladeneEntity {
  entity: MapEntity;
  mesh: Mesh;
  aktiv: boolean; // false = zerstört/eingesammelt (Mesh versteckt)
  hp: number; // breakable
  kontaktCd: number; // hazard-Schaden-Takt
  radius: number; // Interaktionsradius (Treffer/Kontakt/Pickup), inkl. scale
  dmgKey: string; // hazard
  getaktet: boolean; // hazard
  effekt: string; // collectible
}

export interface MapHandle {
  root: TransformNode;
  entities: GeladeneEntity[];
  spawnCollectible(x: number, z: number, effekt: string): void;
  update(): void;
  dispose(): void;
}

export function ladeKarte(scene: Scene, daten: KartenDaten): MapHandle {
  const root = new TransformNode('mapRoot', scene);
  const geladen: GeladeneEntity[] = [];
  let lootN = 0;

  function platziere(e: MapEntity): void {
    const def = getAsset(e.asset);
    const mesh = baueAssetMesh(scene, def, 'map_' + e.id);
    mesh.parent = root;
    mesh.position = new Vector3(e.pos.x, (def.mesh.size.y / 2) * e.scale, e.pos.z);
    mesh.rotation.y = e.rotY;
    mesh.scaling.setAll(e.scale);
    mesh.metadata = { entityId: e.id, kind: e.kind };
    geladen.push({
      entity: e,
      mesh,
      aktiv: true,
      hp: e.kind === 'breakable' ? createBreakable(String(e.params?.hpKey ?? e.asset)).hp : 0,
      kontaktCd: 0,
      radius: def.footprint * e.scale + (e.kind === 'collectible' ? 1.8 : e.kind === 'hazard' ? 1.5 : 0.6),
      dmgKey: String(e.params?.dmgKey ?? e.asset),
      getaktet: def.defaultParams?.getaktet === true,
      effekt: String(e.params?.effekt ?? 'heal'),
    });
  }

  for (const e of daten.entities) platziere(e);

  return {
    root,
    entities: geladen,
    spawnCollectible(x, z, effekt): void {
      platziere({ id: 'loot_' + lootN++, kind: 'collectible', asset: 'fund_huhn', pos: { x, z }, rotY: 0, scale: 1, params: { effekt } });
    },
    update(): void {
      /* Gameplay läuft in main.ts über entities[]; Hook bleibt für künftige Animationen. */
    },
    dispose(): void {
      root.dispose(false, true);
    },
  };
}
