/**
 * Straßen-Render (topologie-gesteuert): für jede Straßenzelle wählt roadTopology anhand der 4
 * Nachbarn das passende Tile (gerade/Kurve/T/Kreuz/Ende) + Rotation aus dem Sheet-Kit. So sehen
 * die Wege „asset-generiert" aus — Geraden laufen durch, an Knicken Kurven, an Knoten T/Kreuz —
 * statt wie ein dunkler Mathe-Strich. Tiles je Art gemergt (ein Draw-Batch/Art), eingefroren.
 *
 * Zell→Welt passend zum Painter (moduleRoads): x = col*cs − halfX, z = row*cs − halfZ.
 *
 * Voraussetzung: Straßen sind 1 Zelle breit (sonst erkennt die Topologie jede Zelle als T) —
 * der Aufrufer setzt roadBreiteZellen = 1.
 *
 * ORIENTIERUNGS-KNÖPFE (falls im Spiel global verdreht/gespiegelt — per Auge zu fixen, da
 * WebGL-Selbstverifikation hier unzuverlässig ist):
 *   BASIS_ROT  0..3 = globale 90°-Drehung aller Tiles.
 *   FLIP_V     true = Textur-V spiegeln (falls Kurven/T spiegelverkehrt anschließen).
 */
import { MeshBuilder, StandardMaterial, Texture, Color3, Mesh } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import { maskeFuer, tileFuer, type RoadKind } from './roadTopology';
import { ROAD_TILE } from './tileAssets';

const BASIS_ROT = 0; // globale Korrektur-Drehung (0..3)
const FLIP_V = false; // Textur-V spiegeln
// Pro-Tile Dreh-Korrektur: wenn ein geliefertes Tile relativ zur BASIS-Annahme verdreht gezeichnet
// ist, hier ausgleichen (statt global, das wuerde gerade/T mitverdrehen). Per Pixel-Kantenanalyse
// verifiziert: road_kurve.png verbindet S+W {2,3}, die BASIS-Kurve nimmt aber N+O {0,1} an -> +2.
// (gerade verbindet N+S = BASIS [0,2], T verbindet O+S+W zu-nach-N = BASIS [1,2,3] -> beide ohne Korrektur.)
const KIND_ROT: Record<RoadKind, number> = { gerade: 0, kurve: 2, t: 0, kreuz: 0, ende: 0 };
const QUAD = 1.08; // Tile-Quad als Vielfaches der Zelle (leichte Überlappung kaschiert Nähte)
const Y = 0.06; // über Modul-Boden (0.03), unter Decals (0.15)

export interface RoadMeshHandle {
  dispose(): void;
}

export function createRoadMesh(
  scene: Scene,
  roadZellen: readonly string[],
  cellSize: number,
  halfX: number,
  halfZ: number,
): RoadMeshHandle {
  if (roadZellen.length === 0) return { dispose() {} };
  const set = new Set(roadZellen);

  const proArt: Record<RoadKind, Mesh[]> = { gerade: [], kurve: [], t: [], kreuz: [], ende: [] };
  for (const key of set) {
    const komma = key.indexOf(',');
    const col = Number(key.slice(0, komma));
    const row = Number(key.slice(komma + 1));
    const { kind, rot } = tileFuer(maskeFuer(set, col, row));
    const tile = MeshBuilder.CreateGround('rt', { width: cellSize * QUAD, height: cellSize * QUAD }, scene);
    tile.position.set(col * cellSize - halfX, Y, row * cellSize - halfZ);
    tile.rotation.y = ((rot + BASIS_ROT + KIND_ROT[kind]) % 4) * (Math.PI / 2);
    tile.isPickable = false;
    proArt[kind].push(tile);
  }

  const matCache = new Map<RoadKind, StandardMaterial>();
  const matFuer = (kind: RoadKind): StandardMaterial => {
    let m = matCache.get(kind);
    if (!m) {
      m = new StandardMaterial('road_' + kind, scene);
      const t = new Texture(ROAD_TILE[kind], scene);
      t.hasAlpha = true; // Schutt-Rand ist transparent -> Boden scheint durch (organisch)
      if (FLIP_V) t.vScale = -1;
      m.diffuseTexture = t;
      m.useAlphaFromDiffuseTexture = true;
      m.specularColor = new Color3(0, 0, 0);
      m.backFaceCulling = false;
      matCache.set(kind, m);
    }
    return m;
  };

  const merged: Mesh[] = [];
  for (const kind of Object.keys(proArt) as RoadKind[]) {
    const parts = proArt[kind];
    if (parts.length === 0) continue;
    const m = parts.length === 1 ? parts[0]! : Mesh.MergeMeshes(parts, true, true, undefined, false, false);
    if (!m) continue;
    m.name = 'roads_' + kind;
    m.material = matFuer(kind);
    m.isPickable = false;
    m.renderingGroupId = 0; // Gruppe 0 wie Panzer/Props -> Tiefentest verdeckt die Straße korrekt (NICHT Gruppe 1: deren Auto-Depth-Clear zeichnete über den Panzer)
    m.alphaIndex = 2; // Reihenfolge der transparenten Flach-Layer: Modul-Boden (1) < Straße (2) < Decal (3)
    m.freezeWorldMatrix();
    merged.push(m);
  }

  return {
    dispose(): void {
      for (const m of merged) m.dispose();
      for (const mt of matCache.values()) mt.dispose(false, true);
    },
  };
}
