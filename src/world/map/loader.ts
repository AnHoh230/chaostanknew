/**
 * Loader: instanziiert KartenDaten in die Babylon-Szene (Platzhalter-Meshes aus dem Asset-Kit)
 * und hält pro Entity den Gameplay-Runtime-Zustand (Breakable-HP, Hazard-Kontakt-Takt,
 * Interaktionsradius). Die eigentlichen Gameplay-Checks laufen in main.ts über entities[].
 * Der Endlos-Boden (world/ground.ts) bleibt unberührt.
 *
 * PERF — statische Props (obstacle/decor/landmark) werden PRO CHUNK zu EINEM Mesh gemergt
 * (Materialien über den matCache geteilt). Das senkt die Draw-Calls drastisch: vorher 1 Mesh je
 * Prop (× Submesh je Farbe) = mehrere Hundert ab Frame 1; jetzt ~1 Mesh je Chunk (× Material).
 * Interaktive Props (breakable/collectible/hazard/nest/Rampe/Insel) bleiben EINZELN — sie werden
 * zerstört/eingesammelt/animiert und brauchen ihr eigenes Mesh. Verifiziert: zur Laufzeit fasst
 * NUR breakable + collectible ihr Mesh an (setEnabled/rotation), statische nie -> mergebar.
 *
 * TECH-DEBT (bewusst gestaffelt, Map-Ausbau): Es gibt NOCH KEINE Bubble (Distanz-Aktivierung).
 * Alle Chunks sind immer enabled -> die gesamte statische Geometrie wird immer gerendert. Das
 * reicht für die aktuelle Kartengröße, skaliert aber NICHT auf eine viel größere Karte. Nächster
 * Schritt: pro Frame (gedrosselt beim Chunk-Wechsel des Spielers) nur Chunks im AKTIV_RADIUS
 * (>= Nebel-/Sichtweite, sonst Pop-in) setEnabled(true), den Rest setEnabled(false). Die
 * Chunk-Struktur hier ist genau dafür die Grundlage. Siehe [[grosse-map-bubble-culling]].
 */
import { TransformNode, Vector3, Mesh } from '@babylonjs/core';
import type { Scene, StandardMaterial } from '@babylonjs/core';
import type { KartenDaten, MapEntity } from './mapTypes';
import { getAsset, type AssetDef } from './assetKit';
import { baueAssetMesh } from './mapMesh';
import { createBreakable } from './mapEntities';

// Kinds, die zur Laufzeit nie einzeln angefasst werden -> pro Chunk mergebar.
const STATISCHE_KINDS: ReadonlySet<string> = new Set(['obstacle', 'decor', 'landmark']);
// Chunk-Kantenlänge (Welt-Einheiten). Tunable: größer = weniger Draw-Calls jetzt, gröbere
// (künftige) Bubble-Granularität; kleiner = feinere Bubble, mehr Draw-Calls.
const CHUNK = 120;

export interface GeladeneEntity {
  entity: MapEntity;
  mesh: Mesh; // statische Props teilen sich ihr Chunk-Mesh (nie einzeln manipuliert)
  aktiv: boolean; // false = zerstört/eingesammelt (Mesh versteckt)
  hp: number; // breakable
  kontaktCd: number; // hazard-Schaden-Takt
  radius: number; // Interaktionsradius (Treffer/Kontakt/Pickup), inkl. scale
  dmgKey: string; // hazard
  getaktet: boolean; // hazard
  effekt: string; // collectible
  solide: boolean; // massiv -> blockt Panzer-Bewegung (Wrack/Fass/Wahrzeichen)
  koerperRadius: number; // physischer Block-Radius (inkl. scale)
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
  const matCache = new Map<string, StandardMaterial>(); // gleichfarbige Teile teilen ein Material
  let lootN = 0;

  // Gameplay-Runtime-Daten einer Entity (Mesh wird separat zugewiesen — einzeln oder Chunk).
  function entityDaten(e: MapEntity, def: AssetDef, mesh: Mesh): GeladeneEntity {
    return {
      entity: e,
      mesh,
      aktiv: true,
      hp: e.kind === 'breakable' ? createBreakable(String(e.params?.hpKey ?? e.asset)).hp : 0,
      kontaktCd: 0,
      radius: def.footprint * e.scale + (e.kind === 'collectible' ? 1.8 : e.kind === 'hazard' ? 1.5 : 0.6),
      dmgKey: String(e.params?.dmgKey ?? e.asset),
      getaktet: def.defaultParams?.getaktet === true,
      effekt: String(e.params?.effekt ?? 'heal'),
      // Massiv = blockt Bewegung: Hindernisse, (intakte) Breakables, Wahrzeichen.
      // NICHT: Hazards (absichtlich befahrbar), Pickups, Rampe, Insel, Nest, Deko.
      solide: e.kind === 'obstacle' || e.kind === 'breakable' || e.kind === 'landmark',
      koerperRadius: def.footprint * e.scale,
    };
  }

  // Baut + positioniert ein Prop-Mesh im Welt-Raum (noch nicht geparentet/gemergt).
  function baueMesh(e: MapEntity, def: AssetDef): Mesh {
    const mesh = baueAssetMesh(scene, def, 'map_' + e.id, matCache);
    mesh.position = new Vector3(e.pos.x, (def.mesh.size.y / 2) * e.scale, e.pos.z);
    mesh.rotation.y = e.rotY;
    mesh.scaling.setAll(e.scale);
    return mesh;
  }

  // Interaktives Prop: eigenes Mesh (wird zerstört/eingesammelt/animiert).
  function platziereEinzeln(e: MapEntity): void {
    const def = getAsset(e.asset);
    const mesh = baueMesh(e, def);
    mesh.parent = root;
    mesh.metadata = { entityId: e.id, kind: e.kind };
    // Statische Einzel-Props einfrieren (CPU-Ersparnis). Funde schweben -> nicht einfrieren.
    if (e.kind !== 'collectible') mesh.freezeWorldMatrix();
    geladen.push(entityDaten(e, def, mesh));
  }

  // — Karte instanziieren: statische Props in Chunk-Buckets sammeln, Rest sofort einzeln —
  const chunkKey = (x: number, z: number): string => Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK);
  const buckets = new Map<string, { e: MapEntity; def: AssetDef; mesh: Mesh }[]>();
  for (const e of daten.entities) {
    if (STATISCHE_KINDS.has(e.kind)) {
      const def = getAsset(e.asset);
      const eintrag = { e, def, mesh: baueMesh(e, def) };
      const arr = buckets.get(chunkKey(e.pos.x, e.pos.z));
      if (arr) arr.push(eintrag);
      else buckets.set(chunkKey(e.pos.x, e.pos.z), [eintrag]);
    } else {
      platziereEinzeln(e);
    }
  }

  // Pro Chunk zu EINEM Mesh mergen (Welt-Transforms werden eingebacken). Jede statische Entity
  // referenziert ihr Chunk-Mesh — sie wird zur Laufzeit nie einzeln angefasst (s. Datei-Kopf).
  for (const [key, arr] of buckets) {
    const meshes = arr.map((a) => a.mesh);
    const chunk =
      meshes.length === 1 ? meshes[0]! : Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    if (!chunk) {
      // Merge fehlgeschlagen -> Fallback: Props einzeln behalten (kein Daten-/Sicht-Verlust).
      for (const { e, def, mesh } of arr) {
        mesh.parent = root;
        mesh.freezeWorldMatrix();
        geladen.push(entityDaten(e, def, mesh));
      }
      continue;
    }
    chunk.name = 'chunk_' + key;
    chunk.parent = root;
    chunk.isPickable = false;
    chunk.freezeWorldMatrix();
    for (const { e, def } of arr) geladen.push(entityDaten(e, def, chunk));
  }

  return {
    root,
    entities: geladen,
    spawnCollectible(x, z, effekt): void {
      platziereEinzeln({ id: 'loot_' + lootN++, kind: 'collectible', asset: 'fund_huhn', pos: { x, z }, rotY: 0, scale: 1, params: { effekt } });
    },
    update(): void {
      /* Gameplay läuft in main.ts über entities[]; Hook bleibt für künftige Animationen. */
    },
    dispose(): void {
      root.dispose(false, true);
    },
  };
}
