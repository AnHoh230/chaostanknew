/**
 * Sichtbare Arena-Grenze: ein Ring aus gestapeltem Schrott (Container/Stahl/Rost) genau am
 * Feldrand ±(halfX, halfZ). Er macht die Welt EHRLICH zur Karte — wo die Übersichtskarte (M)
 * die Feld-Grenze zeichnet, steht in der Welt eine Wand. Zusammen mit dem Szene-Nebel sieht
 * man nicht länger in eine unendliche leere Ebene; der Schrottplatz hat einen Rand.
 *
 * Performance: alle Segmente werden zu wenigen Meshes gemergt (je Material eins), eingefroren
 * und nicht pickbar. Deterministisch (keine Zufallswerte) — gleiche Extents ⇒ gleiche Wand.
 *
 * Lücke: Am Geheim-Rampen-Punkt bleibt eine Öffnung frei (die Bonus-Insel liegt ABSICHTLICH
 * jenseits der Wand und wird per Sprung erreicht) — `gap` markiert deren Stelle.
 */
import { MeshBuilder, StandardMaterial, Color3, Mesh } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';

export interface ArenaBoundary {
  dispose(): void;
}

interface BoundaryOpt {
  segment?: number; // Abstand benachbarter Wand-Segmente
  depth?: number; // Wand-Dicke (Welt-Einheiten)
  gapRadius?: number; // Radius der Öffnung um `gap`
}

export function createArenaBoundary(
  scene: Scene,
  halfX: number,
  halfZ: number,
  gap?: { x: number; z: number },
  opt: BoundaryOpt = {},
): ArenaBoundary {
  const SEG = opt.segment ?? 17;
  const DEP = opt.depth ?? 4;
  const GAP = opt.gapRadius ?? 34;

  const steel = new StandardMaterial('arena_steel', scene);
  steel.diffuseColor = new Color3(0.3, 0.33, 0.38); // kühl + matt = „fest, blockiert" (Farb-Grammatik)
  steel.specularColor = new Color3(0.05, 0.05, 0.06);
  const rust = new StandardMaterial('arena_rust', scene);
  rust.diffuseColor = new Color3(0.4, 0.26, 0.16);
  rust.specularColor = new Color3(0.04, 0.04, 0.05);

  const steelParts: Mesh[] = [];
  const rustParts: Mesh[] = [];
  let seq = 0;

  // Höhe deterministisch variiert -> zerklüftete Schrott-Silhouette statt glatter Mauer.
  const segHoehe = (i: number): number => 4.5 + ((i * 37) % 11) * 0.5;

  const platziere = (cx: number, cz: number, along: 'x' | 'z', i: number): void => {
    if (gap && Math.hypot(cx - gap.x, cz - gap.z) < GAP) return; // Öffnung zur Bonus-Insel freilassen
    const h = segHoehe(i);
    const w = along === 'x' ? SEG + 1.5 : DEP; // entlang X laufende Kante: breit in X, dünn in Z
    const d = along === 'x' ? DEP : SEG + 1.5;
    const box = MeshBuilder.CreateBox('arena_seg_' + seq++, { width: w, height: h, depth: d }, scene);
    box.position.set(cx, h / 2 - 0.3, cz); // Basis leicht im Boden versenkt (keine sichtbare Naht)
    box.isPickable = false;
    (i % 3 === 0 ? rustParts : steelParts).push(box);
  };

  // Wand-Mittellinie knapp AUSSERHALB ±half -> Innenfläche liegt ~auf der Karten-Grenze.
  const ox = halfX + DEP / 2;
  const oz = halfZ + DEP / 2;
  let i = 0;
  for (let x = -halfX; x <= halfX + 0.5; x += SEG) {
    platziere(x, oz, 'x', i++);
    platziere(x, -oz, 'x', i++);
  }
  for (let z = -halfZ; z <= halfZ + 0.5; z += SEG) {
    platziere(ox, z, 'z', i++);
    platziere(-ox, z, 'z', i++);
  }

  const mergeGroup = (parts: Mesh[], material: StandardMaterial, name: string): Mesh | null => {
    if (parts.length === 0) return null;
    const m = parts.length === 1 ? parts[0] : Mesh.MergeMeshes(parts, true, true, undefined, false, false);
    if (!m) return null;
    m.name = name;
    m.material = material;
    m.isPickable = false;
    m.freezeWorldMatrix(); // statisch -> Welt-Matrix einmalig
    return m;
  };
  const meshSteel = mergeGroup(steelParts, steel, 'arena_wall_steel');
  const meshRust = mergeGroup(rustParts, rust, 'arena_wall_rust');

  return {
    dispose(): void {
      meshSteel?.dispose();
      meshRust?.dispose();
      steel.dispose();
      rust.dispose();
    },
  };
}
