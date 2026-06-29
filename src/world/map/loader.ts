/**
 * Loader: instanziiert KartenDaten in die Babylon-Szene (Platzhalter-Meshes aus dem Asset-Kit)
 * und hält pro Entity den Gameplay-Runtime-Zustand (Breakable-HP, Hazard-Kontakt-Takt,
 * Interaktionsradius). Die eigentlichen Gameplay-Checks laufen in main.ts über entities[].
 * Der Endlos-Boden (world/ground.ts) bleibt unberührt.
 *
 * PERF — statische Props (obstacle/decor/landmark) werden NACH (Chunk, Material) gebatcht: die
 * Einzelteile aller statischen Props einer Chunk-Zelle, die dasselbe Material teilen, werden zu
 * EINEM single-material Mesh gemergt = 1 Draw-Call je Material/Chunk. Vorher: 1 Mesh JE Prop, und
 * jedes Prop-Mesh hielt 1 Submesh JE Teil -> ~1000 Draw-Calls ab Frame 1 (der "verzögerte" Start),
 * unabhängig von der Gegnerzahl. Nach Material zu mergen koalesziert gleichfarbige Teile -> 1 Draw
 * je Material. Interaktive Props (breakable/collectible/hazard/nest/Rampe/Insel) bleiben EINZELN —
 * sie werden zerstört/eingesammelt/animiert. Verifiziert: zur Laufzeit fasst NUR breakable +
 * collectible ihr Mesh an (setEnabled/rotation), statische nie -> ihr .mesh ist ein Platzhalter.
 *
 * TECH-DEBT (bewusst gestaffelt, für den Map-Ausbau): Es gibt NOCH KEINE Bubble (Distanz-
 * Aktivierung). Alle Chunk-Batches sind immer enabled -> ohne Bubble dupliziert das Chunk-Raster
 * Materialien über Zellen (mehr Draws als ein Global-Merge). Reicht für die aktuelle Kartengröße;
 * für eine VIEL größere Karte muss die Bubble rein: pro Frame (gedrosselt beim Chunk-Wechsel des
 * Spielers) nur Batches im AKTIV_RADIUS (>= Nebel-/Sichtweite, sonst Pop-in) setEnabled(true), Rest
 * setEnabled(false). Die (Chunk,Material)-Struktur hier ist genau dafür die Grundlage; die
 * Batches tragen ihren Chunk im Namen ('batch_<col,row>|<mat>'). Siehe [[grosse-map-bubble-culling]].
 */
import { TransformNode, Vector3, Mesh } from '@babylonjs/core';
import type { Scene, StandardMaterial } from '@babylonjs/core';
import type { KartenDaten, MapEntity } from './mapTypes';
import { getAsset, type AssetDef } from './assetKit';
import { baueAssetMesh, baueAssetTeile } from './mapMesh';
import { createBreakable } from './mapEntities';

// Kinds, die zur Laufzeit nie einzeln angefasst werden -> nach Material batchbar.
const STATISCHE_KINDS: ReadonlySet<string> = new Set(['obstacle', 'decor', 'landmark']);
// Chunk-Kantenlänge (Welt-Einheiten). Tunable: größer = weniger Draw-Calls jetzt (weniger
// Material-Duplikate übers Raster), gröbere künftige Bubble-Granularität; kleiner = umgekehrt.
const CHUNK = 120;

export interface GeladeneEntity {
  entity: MapEntity;
  mesh: Mesh; // statische Props: geteilter Platzhalter (Geometrie liegt in den Material-Batches)
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

  // Geteiltes, leeres + deaktiviertes Platzhalter-Mesh: das .mesh-Feld statischer Props zeigt
  // hierauf (ihre Geometrie liegt in den Material-Batches, .mesh wird für statische Props nie
  // einzeln benutzt — verifiziert). Leer + disabled => kein Draw-Call.
  const platzhalter = new Mesh('statisch_platzhalter', scene);
  platzhalter.isPickable = false;
  platzhalter.setEnabled(false);
  platzhalter.parent = root;

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

  // Interaktives Prop: eigenes (multi-material) Mesh — wird zerstört/eingesammelt/animiert.
  function platziereEinzeln(e: MapEntity): void {
    const def = getAsset(e.asset);
    const mesh = baueAssetMesh(scene, def, 'map_' + e.id, matCache);
    mesh.position = new Vector3(e.pos.x, (def.mesh.size.y / 2) * e.scale, e.pos.z);
    mesh.rotation.y = e.rotY;
    mesh.scaling.setAll(e.scale);
    mesh.parent = root;
    mesh.metadata = { entityId: e.id, kind: e.kind };
    if (e.kind !== 'collectible') mesh.freezeWorldMatrix(); // Funde schweben -> nicht einfrieren
    geladen.push(entityDaten(e, def, mesh));
  }

  const chunkKey = (x: number, z: number): string => Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK);

  // — Statische Props: Einzelteile nach (Chunk, Material) sammeln. Der Entity-Transform wird per
  //   Holder-Node angewandt; MergeMeshes backt die Welt-Matrix der Teile ein. —
  interface Gruppe { material: StandardMaterial; teile: Mesh[] }
  const gruppen = new Map<string, Gruppe>();
  const holder: TransformNode[] = [];
  for (const e of daten.entities) {
    if (!STATISCHE_KINDS.has(e.kind)) {
      platziereEinzeln(e);
      continue;
    }
    const def = getAsset(e.asset);
    const h = new TransformNode('h_' + e.id, scene);
    h.position.set(e.pos.x, (def.mesh.size.y / 2) * e.scale, e.pos.z);
    h.rotation.y = e.rotY;
    h.scaling.setAll(e.scale);
    holder.push(h);
    const ck = chunkKey(e.pos.x, e.pos.z);
    for (const teil of baueAssetTeile(scene, def, matCache)) {
      teil.parent = h;
      const material = teil.material as StandardMaterial;
      const key = ck + '|' + material.uniqueId;
      const g = gruppen.get(key);
      if (g) g.teile.push(teil);
      else gruppen.set(key, { material, teile: [teil] });
    }
    geladen.push(entityDaten(e, def, platzhalter));
  }

  // Je (Chunk, Material) zu EINEM single-material Mesh mergen = 1 Draw-Call.
  for (const [key, g] of gruppen) {
    const merged = Mesh.MergeMeshes(g.teile, true, true, undefined, false, false);
    if (merged) {
      merged.material = g.material;
      merged.name = 'batch_' + key;
      merged.parent = root;
      merged.isPickable = false;
      merged.freezeWorldMatrix();
    } else {
      // Fallback: Teile einzeln behalten (setParent backt den Welt-Transform ein -> Position bleibt).
      for (const teil of g.teile) {
        teil.setParent(root);
        teil.isPickable = false;
        teil.freezeWorldMatrix();
      }
    }
  }
  for (const h of holder) h.dispose(); // Holder sind nach dem Merge leer

  return {
    root,
    entities: geladen,
    spawnCollectible(x, z, effekt): void {
      platziereEinzeln({ id: 'loot_' + lootN++, kind: 'collectible', asset: 'fund_huhn', pos: { x, z }, rotY: 0, scale: 1, params: { effekt } });
    },
    update(): void {
      /* Gameplay läuft in main.ts über entities[]; Hook bleibt für künftige Animationen (Bubble). */
    },
    dispose(): void {
      root.dispose(false, true);
    },
  };
}
