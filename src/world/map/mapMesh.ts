/**
 * Mesh-Fabrik: baut pro Asset ein ERKENNBARES Prop aus mehreren Teilen und merged sie zu
 * EINEM Mesh (ein Draw-Batch je Prop) — performant statt Hunderte Einzel-Meshes mit teurem
 * Kanten-Rendering. Materialien werden über einen Cache geteilt (wenig Shader-Wechsel).
 *
 * Farb-GRAMMATIK für Lesbarkeit (Spieler erkennt Funktion an der Farbe):
 *   - Breakables  = warm + leuchtender Emissive-Akzent  ("kann ich beschießen")
 *   - Hindernisse = kühl, matt, dunkel                  ("fest, blockiert")
 *   - Hazards     = rot / giftgrün leuchtend            ("Gefahr")
 *   - Funde       = hell + grüner Boden-Halo            ("einsammeln")
 *   - Wahrzeichen = Stahl + rotes Blinklicht            ("Orientierung")
 *
 * Lokale Konvention: Inhalt vertikal um y=0 zentriert (Spanne ~[-size.y/2, +size.y/2]),
 * damit der Loader es per y=(size.y/2)*scale auf den Boden stellt. Deterministisch.
 */
import { MeshBuilder, StandardMaterial, Color3, Mesh, Texture } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import type { AssetDef } from './assetKit';

type RGB = [number, number, number];
type Form = 'box' | 'cyl' | 'cone' | 'sphere';
interface AddOpt {
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  emissive?: RGB;
  tess?: number;
  segments?: number;
}
interface Ctx {
  base: RGB;
  add(name: string, form: Form, size: [number, number, number], pos: [number, number, number], color: RGB, opt?: AddOpt): void;
}

export type MatCache = Map<string, StandardMaterial>;

function shade(c: RGB, f: number): RGB {
  return [c[0] * f, c[1] * f, c[2] * f];
}

function mat(scene: Scene, cache: MatCache, c: RGB, em?: RGB): StandardMaterial {
  const key = c.map((n) => n.toFixed(3)).join(',') + '|' + (em ? em.map((n) => n.toFixed(3)).join(',') : '');
  let m = cache.get(key);
  if (!m) {
    m = new StandardMaterial('mm' + cache.size, scene);
    m.diffuseColor = new Color3(c[0], c[1], c[2]);
    m.specularColor = new Color3(0.05, 0.05, 0.06);
    if (em) m.emissiveColor = new Color3(em[0], em[1], em[2]);
    cache.set(key, m);
  }
  return m;
}

function prim(scene: Scene, name: string, form: Form, size: [number, number, number], opt?: AddOpt): Mesh {
  switch (form) {
    case 'box':
      return MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene);
    case 'cyl':
      return MeshBuilder.CreateCylinder(name, { diameter: size[0], height: size[1], tessellation: opt?.tess ?? 14 }, scene);
    case 'cone':
      return MeshBuilder.CreateCylinder(name, { diameterTop: 0, diameterBottom: size[0], height: size[1], tessellation: opt?.tess ?? 14 }, scene);
    default:
      return MeshBuilder.CreateSphere(name, { diameter: size[0], segments: opt?.segments ?? 10 }, scene);
  }
}

// — Pro-Asset-Bauanleitungen (ctx.add: Form/Größe/Position/Farbe[/emissive]). —
const BAUART: Record<string, (c: Ctx) => void> = {
  // BREAKABLES — warm + Emissive-Glühen = „beschießbar"
  fass: (c) => {
    const o: RGB = [0.92, 0.42, 0.12];
    c.add('b', 'cyl', [1.2, 1.6, 0], [0, 0, 0], o, { emissive: [0.32, 0.11, 0.02] });
    c.add('r1', 'cyl', [1.3, 0.14, 0], [0, 0.5, 0], [0.18, 0.1, 0.06]);
    c.add('r2', 'cyl', [1.3, 0.14, 0], [0, -0.5, 0], [0.18, 0.1, 0.06]);
    c.add('d', 'cyl', [1.1, 0.08, 0], [0, 0.8, 0], [0.5, 0.28, 0.12]);
  },
  kiste: (c) => {
    const w: RGB = [0.82, 0.58, 0.26];
    c.add('b', 'box', [1.6, 1.6, 1.6], [0, 0, 0], w, { emissive: [0.2, 0.13, 0.05] });
    c.add('band', 'box', [1.64, 0.22, 1.64], [0, 0, 0], [0.34, 0.23, 0.11]);
    c.add('band2', 'box', [1.64, 1.64, 0.22], [0, 0, 0], [0.34, 0.23, 0.11]);
  },
  schrotthaufen: (c) => {
    c.add('1', 'box', [1.4, 0.9, 1.0], [-0.3, -0.35, 0.2], [0.5, 0.5, 0.53], { rotY: 0.5 });
    c.add('2', 'box', [0.9, 0.8, 1.2], [0.5, -0.1, -0.3], [0.42, 0.41, 0.44], { rotY: -0.7 });
    c.add('3', 'cyl', [0.7, 1.3, 0], [0.1, 0.2, 0.4], [0.86, 0.46, 0.14], { rotZ: 1.1, emissive: [0.3, 0.14, 0.02] });
    c.add('4', 'box', [0.7, 0.6, 0.7], [-0.4, 0.4, -0.2], [0.46, 0.45, 0.48], { rotY: 0.3, rotX: 0.4 });
  },
  neonschild: (c) => {
    c.add('post', 'box', [0.18, 2.6, 0.18], [0, 0, 0], [0.16, 0.16, 0.18]);
    c.add('panel', 'box', [2.2, 1.1, 0.16], [0, 0.7, 0], [0.16, 0.85, 0.95], { emissive: [0.12, 0.66, 0.74] });
    c.add('frame', 'box', [2.32, 1.22, 0.1], [0, 0.7, 0.05], [0.08, 0.1, 0.12]);
  },
  // OBSTACLES — kühl, matt, dunkel = „fest, blockiert"
  wrack_auto: (c) => {
    const k: RGB = [0.33, 0.31, 0.37];
    c.add('body', 'box', [5, 1.0, 2.4], [0, -0.3, 0], k);
    c.add('cab', 'box', [2.6, 0.9, 2.2], [-0.2, 0.55, 0], shade(k, 0.78));
    for (const [i, x] of [-1.6, 1.6].entries()) {
      c.add('wf' + i, 'cyl', [1.0, 0.5, 0], [x, -0.7, 1.2], [0.07, 0.07, 0.08], { rotX: Math.PI / 2 });
      c.add('wb' + i, 'cyl', [1.0, 0.5, 0], [x, -0.7, -1.2], [0.07, 0.07, 0.08], { rotX: Math.PI / 2 });
    }
  },
  container: (c) => {
    const t: RGB = [0.22, 0.36, 0.45];
    c.add('b', 'box', [6, 3, 2.8], [0, 0, 0], t);
    c.add('door', 'box', [0.08, 2.7, 2.6], [3.0, 0, 0], shade(t, 0.6));
    for (let i = 0; i < 5; i++) c.add('rib' + i, 'box', [0.12, 2.9, 2.82], [-2.2 + i * 1.1, 0, 0], shade(t, 0.82));
  },
  rohrstapel: (c) => {
    const s: RGB = [0.4, 0.43, 0.48];
    for (const [i, x] of [-1, 0, 1].entries()) c.add('pb' + i, 'cyl', [1.0, 2.8, 0], [x, -0.4, 0], shade(s, 1 - i * 0.05), { rotX: Math.PI / 2 });
    for (const [i, x] of [-0.5, 0.5].entries()) c.add('pt' + i, 'cyl', [1.0, 2.8, 0], [x, 0.5, 0], shade(s, 0.9), { rotX: Math.PI / 2 });
  },
  betonblock: (c) => {
    const g: RGB = [0.47, 0.48, 0.52];
    c.add('b', 'box', [3.5, 2.4, 3.5], [0, 0, 0], g);
    c.add('chip', 'box', [1.2, 0.8, 1.2], [1.1, 1.2, 1.1], shade(g, 0.85), { rotY: 0.6 });
    for (const [i, dx] of [-0.6, 0, 0.6].entries()) c.add('rebar' + i, 'cyl', [0.08, 1.0, 0], [dx, 1.5, 0.3 * i], [0.3, 0.22, 0.15]);
  },
  // HAZARDS — vom Boden nach oben, rot/giftgrün leuchtend = „Gefahr"
  presse: (c) => {
    const stahl: RGB = [0.3, 0.32, 0.36];
    c.add('base', 'box', [5, 0.4, 5], [0, 0, 0], [0.2, 0.2, 0.23]);
    c.add('warn1', 'box', [5.05, 0.12, 0.7], [0, 0.16, 2.0], [0.9, 0.75, 0.1], { emissive: [0.5, 0.4, 0.0] });
    c.add('warn2', 'box', [5.05, 0.12, 0.7], [0, 0.16, -2.0], [0.9, 0.75, 0.1], { emissive: [0.5, 0.4, 0.0] });
    c.add('p1', 'box', [0.5, 4.4, 0.5], [-2.1, 2.2, -2.1], stahl);
    c.add('p2', 'box', [0.5, 4.4, 0.5], [2.1, 2.2, -2.1], stahl);
    c.add('beam', 'box', [5, 0.7, 1.4], [0, 4.4, -2.1], stahl);
    c.add('hammer', 'box', [3.4, 1.2, 3.4], [0, 3.0, 0.2], [0.6, 0.16, 0.14], { emissive: [0.32, 0.04, 0.03] });
  },
  stachelgrube: (c) => {
    c.add('pit', 'cyl', [4, 0.3, 0], [0, 0, 0], [0.1, 0.08, 0.08]);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      c.add('spike' + i, 'cone', [0.5, 1.3, 0], [Math.cos(a) * 1.3, 0.65, Math.sin(a) * 1.3], [0.5, 0.13, 0.1], { emissive: [0.26, 0.03, 0.02] });
    }
    c.add('spc', 'cone', [0.55, 1.5, 0], [0, 0.75, 0], [0.55, 0.15, 0.12], { emissive: [0.28, 0.03, 0.02] });
  },
  giftpfuetze: (c) => {
    c.add('1', 'cyl', [4, 0.16, 0], [0, 0, 0], [0.16, 0.42, 0.1], { emissive: [0.08, 0.34, 0.05] });
    c.add('2', 'cyl', [2.6, 0.2, 0], [0.6, 0.04, -0.4], [0.26, 0.64, 0.16], { emissive: [0.14, 0.46, 0.06] });
    c.add('3', 'cyl', [1.5, 0.24, 0], [-0.7, 0.07, 0.5], [0.36, 0.78, 0.22], { emissive: [0.2, 0.56, 0.09] });
  },
  // SETPIECES
  funkturm: (c) => {
    const stahl: RGB = [0.5, 0.54, 0.6];
    for (const [i, sx] of [-1, 1].entries())
      for (const [j, sz] of [-1, 1].entries())
        c.add(`leg${i}${j}`, 'box', [0.28, 16, 0.28], [sx * 1.3, 0, sz * 1.3], stahl);
    for (const [k, y] of [-5.5, 0, 5.5].entries()) {
      c.add('bx' + k, 'box', [2.9, 0.16, 0.16], [0, y, 1.3], shade(stahl, 0.85));
      c.add('bx2' + k, 'box', [2.9, 0.16, 0.16], [0, y, -1.3], shade(stahl, 0.85));
      c.add('bz' + k, 'box', [0.16, 0.16, 2.9], [1.3, y, 0], shade(stahl, 0.85));
      c.add('bz2' + k, 'box', [0.16, 0.16, 2.9], [-1.3, y, 0], shade(stahl, 0.85));
    }
    c.add('mast', 'cyl', [0.22, 4, 0], [0, 9, 0], stahl);
    c.add('dish', 'cyl', [2.2, 0.2, 0], [0.9, 6.6, 0], [0.72, 0.74, 0.78], { rotZ: 1.0 });
    c.add('beacon', 'sphere', [0.55, 0, 0], [0, 11, 0], [1, 0.2, 0.15], { emissive: [0.85, 0.12, 0.05] });
  },
  sprungrampe: (c) => {
    const tilt = -0.34;
    const y: RGB = [0.92, 0.78, 0.2];
    c.add('surf', 'box', [6, 0.5, 10.2], [0, 0, 0], y, { rotX: tilt });
    c.add('railL', 'box', [0.3, 0.7, 10.2], [-2.85, 0.4, 0], shade(y, 0.7), { rotX: tilt });
    c.add('railR', 'box', [0.3, 0.7, 10.2], [2.85, 0.4, 0], shade(y, 0.7), { rotX: tilt });
    for (const [i, z] of [-2.5, 0, 2.5].entries())
      c.add('chev' + i, 'box', [3.4, 0.08, 0.7], [0, 0.32 + z * 0.34, z], [0.1, 0.1, 0.12], { rotX: tilt, emissive: [0.0, 0.0, 0.0] });
  },
  bonusinsel: (c) => {
    const st: RGB = [0.28, 0.42, 0.48];
    c.add('deck', 'box', [22, 1, 16], [0, 0, 0], st);
    c.add('rimN', 'box', [22, 0.5, 0.6], [0, 0.5, 8], shade(st, 1.4));
    c.add('rimS', 'box', [22, 0.5, 0.6], [0, 0.5, -8], shade(st, 1.4));
    c.add('rimE', 'box', [0.6, 0.5, 16], [11, 0.5, 0], shade(st, 1.4));
    c.add('rimW', 'box', [0.6, 0.5, 16], [-11, 0.5, 0], shade(st, 1.4));
    c.add('totem', 'cyl', [0.9, 3, 0], [0, 2, 0], [0.5, 0.45, 0.4]);
    c.add('orb', 'sphere', [1.1, 0, 0], [0, 4, 0], [1, 0.85, 0.4], { emissive: [0.75, 0.58, 0.22] });
  },
  // DECOR — gedämpft
  reifenstapel: (c) => {
    for (const [i, y] of [-0.33, 0, 0.33].entries()) c.add('t' + i, 'cyl', [1.4, 0.34, 0], [0, y, 0], [0.08, 0.08, 0.09]);
  },
  verkehrskegel: (c) => {
    c.add('base', 'box', [0.7, 0.12, 0.7], [0, -0.45, 0], [0.5, 0.28, 0.08]);
    c.add('b', 'cone', [0.7, 1, 0], [0, 0.05, 0], [0.92, 0.42, 0.1], { emissive: [0.4, 0.16, 0.02] });
    c.add('str', 'cyl', [0.55, 0.14, 0], [0, 0.1, 0], [0.95, 0.95, 0.95], { emissive: [0.4, 0.4, 0.4] });
  },
  truemmer: (c) => {
    c.add('1', 'box', [0.9, 0.4, 0.7], [-0.2, -0.05, 0], [0.34, 0.32, 0.34], { rotY: 0.4 });
    c.add('2', 'box', [0.6, 0.5, 0.5], [0.4, 0.05, 0.2], [0.28, 0.27, 0.3], { rotY: -0.6 });
  },
  pfuetze: (c) => {
    c.add('p', 'cyl', [2, 0.06, 0], [0, 0, 0], [0.14, 0.18, 0.22], { emissive: [0.05, 0.08, 0.1] });
  },
  // PICKUPS — hell + grüner Halo (schweben/drehen via main-Loop)
  fund_huhn: (c) => {
    c.add('core', 'sphere', [0.7, 0, 0], [0, 0, 0], [0.95, 0.85, 0.5], { emissive: [0.5, 0.42, 0.2] });
    c.add('cv', 'box', [0.16, 0.5, 0.16], [0, 0, 0.42], [0.95, 0.2, 0.2], { emissive: [0.6, 0.05, 0.05] });
    c.add('ch', 'box', [0.5, 0.16, 0.16], [0, 0, 0.42], [0.95, 0.2, 0.2], { emissive: [0.6, 0.05, 0.05] });
    c.add('halo', 'cyl', [1.6, 0.04, 0], [0, -0.5, 0], [0.4, 0.95, 0.35], { emissive: [0.16, 0.5, 0.12] });
  },
  fund_schraube: (c) => {
    const gold: RGB = [0.92, 0.78, 0.2];
    c.add('head', 'cyl', [0.62, 0.3, 0], [0, 0.12, 0], gold, { emissive: [0.45, 0.36, 0.06], tess: 6 });
    c.add('shaft', 'cyl', [0.24, 0.55, 0], [0, -0.25, 0], shade(gold, 0.8), { tess: 8 });
    c.add('halo', 'cyl', [1.2, 0.04, 0], [0, -0.5, 0], [0.4, 0.95, 0.35], { emissive: [0.14, 0.46, 0.1] });
  },
  fund_kanister: (c) => {
    const cy: RGB = [0.2, 0.72, 0.86];
    c.add('b', 'cyl', [0.7, 0.9, 0], [0, 0, 0], cy, { emissive: [0.08, 0.4, 0.5] });
    c.add('cap', 'cyl', [0.32, 0.22, 0], [0, 0.52, 0], [0.14, 0.14, 0.16]);
    c.add('band', 'cyl', [0.73, 0.16, 0], [0, 0.1, 0], shade(cy, 0.6));
    c.add('halo', 'cyl', [1.3, 0.04, 0], [0, -0.5, 0], [0.4, 0.95, 0.35], { emissive: [0.14, 0.46, 0.1] });
  },
};

/**
 * Flaches Decal-Tile: liegende, texturierte Platte (echte Sheet-Textur mit Alpha) statt Primitiv.
 * Material wird über den Cache je Textur-URL geteilt (ein Material, viele Instanzen).
 */
function baueDecalMesh(scene: Scene, def: AssetDef, name: string, cache: MatCache): Mesh {
  const g = MeshBuilder.CreateGround(name, { width: def.mesh.size.x, height: def.mesh.size.z }, scene);
  const key = 'decal:' + def.textur;
  let m = cache.get(key);
  if (!m) {
    m = new StandardMaterial('decal' + cache.size, scene);
    const t = new Texture(def.textur!, scene);
    t.hasAlpha = true;
    m.diffuseTexture = t;
    m.useAlphaFromDiffuseTexture = true;
    m.specularColor = new Color3(0, 0, 0);
    m.backFaceCulling = false;
    cache.set(key, m);
  }
  g.material = m;
  g.isPickable = false;
  return g;
}

/**
 * Baut das (gemergte) Prop-Mesh. matCache wird vom Loader pro Kartenladung geteilt,
 * damit gleichfarbige Teile dasselbe Material nutzen (wenig Shader-Wechsel).
 */
export function baueAssetMesh(scene: Scene, def: AssetDef, name: string, matCache: MatCache = new Map()): Mesh {
  if (def.textur) return baueDecalMesh(scene, def, name, matCache);
  const parts: Mesh[] = [];
  const ctx: Ctx = {
    base: def.mesh.color,
    add(nm, form, size, pos, color, opt): void {
      const m = prim(scene, name + '_' + nm, form, size, opt);
      m.material = mat(scene, matCache, color, opt?.emissive);
      m.position.set(pos[0], pos[1], pos[2]);
      if (opt?.rotX) m.rotation.x = opt.rotX;
      if (opt?.rotY) m.rotation.y = opt.rotY;
      if (opt?.rotZ) m.rotation.z = opt.rotZ;
      m.isPickable = false;
      parts.push(m);
    },
  };

  const bau = BAUART[def.id];
  if (bau) bau(ctx);
  else {
    // Fallback: unbekanntes Asset -> einzelne Grundform (nie stiller Absturz).
    const s = def.mesh.size;
    const form: Form = def.mesh.form === 'cylinder' ? 'cyl' : (def.mesh.form as Form);
    ctx.add('x', form, [s.x, s.y, s.z], [0, 0, 0], def.mesh.color);
  }

  const merged = parts.length === 1 ? parts[0] : Mesh.MergeMeshes(parts, true, true, undefined, false, true);
  const root = merged ?? parts[0];
  root.name = name;
  root.isPickable = false;
  return root;
}
