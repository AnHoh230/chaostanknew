/**
 * Mesh-Fabrik: baut pro Asset ein ERKENNBARES, zusammengesetztes Prop (mehrere Teile,
 * Kanten-Outline, emissive Akzente) statt einer nackten Grundform. Liefert ein leeres
 * Wurzel-Mesh, dessen Kinder das Objekt formen — der Loader setzt Position/Skalierung/
 * Rotation auf der Wurzel, setEnabled(false) blendet das ganze Prop aus.
 *
 * Lokale Konvention: Inhalt ist vertikal um y=0 zentriert (Spanne ~[-size.y/2, +size.y/2]),
 * damit die Loader-Formel y=(size.y/2)*scale das Prop auf den Boden stellt. Bei flachen
 * Hazards bauen wir von y≈0 nach oben (sie stehen ohnehin am Boden).
 *
 * Deterministisch (kein Zufall) — gleicher Seed => exakt gleiche Karte/Optik.
 */
import { MeshBuilder, StandardMaterial, Color3, Color4, Mesh } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import type { AssetDef } from './assetKit';

type RGB = [number, number, number];
interface TeilOpt {
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  emissive?: RGB;
  edges?: boolean;
  edgesWidth?: number;
  tess?: number;
  segments?: number;
}

function shade(c: RGB, f: number): RGB {
  return [c[0] * f, c[1] * f, c[2] * f];
}

function mkMat(scene: Scene, name: string, c: RGB, opt?: TeilOpt): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(c[0], c[1], c[2]);
  m.specularColor = new Color3(0.06, 0.06, 0.07);
  if (opt?.emissive) m.emissiveColor = new Color3(opt.emissive[0], opt.emissive[1], opt.emissive[2]);
  return m;
}

/** Erzeugt ein Teil-Mesh, hängt es an die Wurzel, setzt Material/Position/Rotation/Kanten. */
function teil(
  scene: Scene,
  root: Mesh,
  name: string,
  form: 'box' | 'cyl' | 'cone' | 'sphere',
  size: [number, number, number],
  pos: [number, number, number],
  color: RGB,
  opt?: TeilOpt,
): Mesh {
  let m: Mesh;
  switch (form) {
    case 'box':
      m = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene);
      break;
    case 'cyl':
      m = MeshBuilder.CreateCylinder(name, { diameter: size[0], height: size[1], tessellation: opt?.tess ?? 14 }, scene);
      break;
    case 'cone':
      m = MeshBuilder.CreateCylinder(name, { diameterTop: 0, diameterBottom: size[0], height: size[1], tessellation: opt?.tess ?? 14 }, scene);
      break;
    default:
      m = MeshBuilder.CreateSphere(name, { diameter: size[0], segments: opt?.segments ?? 10 }, scene);
  }
  m.material = mkMat(scene, name + '_m', color, opt);
  m.parent = root;
  m.position.set(pos[0], pos[1], pos[2]);
  if (opt?.rotX) m.rotation.x = opt.rotX;
  if (opt?.rotY) m.rotation.y = opt.rotY;
  if (opt?.rotZ) m.rotation.z = opt.rotZ;
  if (opt?.edges) {
    m.enableEdgesRendering();
    m.edgesWidth = opt.edgesWidth ?? 2;
    m.edgesColor = new Color4(0.03, 0.03, 0.05, 0.7);
  }
  return m;
}

// — Pro-Asset-Bauanleitungen. Jede bekommt (scene, root, basisFarbe). —
const BAUART: Record<string, (s: Scene, r: Mesh, c: RGB) => void> = {
  // BREAKABLES
  fass: (s, r, c) => {
    teil(s, r, 'fass_b', 'cyl', [1.2, 1.6, 0], [0, 0, 0], c, { edges: true });
    teil(s, r, 'fass_r1', 'cyl', [1.3, 0.14, 0], [0, 0.5, 0], shade(c, 0.55));
    teil(s, r, 'fass_r2', 'cyl', [1.3, 0.14, 0], [0, -0.5, 0], shade(c, 0.55));
    teil(s, r, 'fass_d', 'cyl', [1.1, 0.08, 0], [0, 0.8, 0], shade(c, 0.7));
  },
  kiste: (s, r, c) => {
    teil(s, r, 'kiste_b', 'box', [1.6, 1.6, 1.6], [0, 0, 0], c, { edges: true, edgesWidth: 3 });
    teil(s, r, 'kiste_band', 'box', [1.64, 0.2, 1.64], [0, 0, 0], shade(c, 0.6));
    teil(s, r, 'kiste_band2', 'box', [1.64, 1.64, 0.2], [0, 0, 0], shade(c, 0.6), { rotY: 0 });
  },
  schrotthaufen: (s, r, c) => {
    teil(s, r, 'sh_1', 'box', [1.4, 0.9, 1.0], [-0.3, -0.35, 0.2], shade(c, 1.0), { rotY: 0.5, edges: true });
    teil(s, r, 'sh_2', 'box', [0.9, 0.8, 1.2], [0.5, -0.1, -0.3], shade(c, 0.8), { rotY: -0.7, edges: true });
    teil(s, r, 'sh_3', 'cyl', [0.7, 1.3, 0], [0.1, 0.2, 0.4], shade(c, 1.2), { rotZ: 1.1, edges: true });
    teil(s, r, 'sh_4', 'box', [0.7, 0.6, 0.7], [-0.4, 0.4, -0.2], shade(c, 0.9), { rotY: 0.3, rotX: 0.4 });
  },
  neonschild: (s, r, c) => {
    teil(s, r, 'neon_post', 'box', [0.18, 2.6, 0.18], [0, 0, 0], [0.18, 0.18, 0.2]);
    teil(s, r, 'neon_panel', 'box', [2.2, 1.1, 0.16], [0, 0.7, 0], c, { emissive: shade(c, 0.9), edges: true });
    teil(s, r, 'neon_frame', 'box', [2.32, 1.22, 0.1], [0, 0.7, 0.04], [0.1, 0.1, 0.12]);
  },
  // OBSTACLES
  wrack_auto: (s, r, c) => {
    teil(s, r, 'car_body', 'box', [5, 1.0, 2.4], [0, -0.3, 0], c, { edges: true });
    teil(s, r, 'car_cab', 'box', [2.6, 0.9, 2.2], [-0.2, 0.55, 0], shade(c, 0.8), { edges: true });
    for (const [i, x] of [-1.6, 1.6].entries()) {
      teil(s, r, 'car_wf' + i, 'cyl', [1.0, 0.5, 0], [x, -0.7, 1.2], [0.08, 0.08, 0.09], { rotX: Math.PI / 2 });
      teil(s, r, 'car_wb' + i, 'cyl', [1.0, 0.5, 0], [x, -0.7, -1.2], [0.08, 0.08, 0.09], { rotX: Math.PI / 2 });
    }
  },
  container: (s, r, c) => {
    teil(s, r, 'cont_b', 'box', [6, 3, 2.8], [0, 0, 0], c, { edges: true, edgesWidth: 3 });
    teil(s, r, 'cont_door', 'box', [0.08, 2.7, 2.6], [3.0, 0, 0], shade(c, 0.65));
    for (let i = 0; i < 5; i++) teil(s, r, 'cont_rib' + i, 'box', [0.12, 2.9, 2.82], [-2.2 + i * 1.1, 0, 0], shade(c, 0.8));
  },
  rohrstapel: (s, r, c) => {
    const yb = -0.4, yt = 0.5;
    for (const [i, x] of [-1, 0, 1].entries()) teil(s, r, 'pipe_b' + i, 'cyl', [1.0, 2.8, 0], [x, yb, 0], shade(c, 1 - i * 0.05), { rotX: Math.PI / 2, edges: true });
    for (const [i, x] of [-0.5, 0.5].entries()) teil(s, r, 'pipe_t' + i, 'cyl', [1.0, 2.8, 0], [x, yt, 0], shade(c, 0.9), { rotX: Math.PI / 2, edges: true });
  },
  betonblock: (s, r, c) => {
    teil(s, r, 'beton_b', 'box', [3.5, 2.4, 3.5], [0, 0, 0], c, { edges: true });
    teil(s, r, 'beton_chip', 'box', [1.2, 0.8, 1.2], [1.1, 1.2, 1.1], shade(c, 0.85), { rotY: 0.6 });
    for (const [i, dx] of [-0.6, 0, 0.6].entries()) teil(s, r, 'beton_rebar' + i, 'cyl', [0.08, 1.0, 0], [dx, 1.5, 0.3 * i], [0.3, 0.22, 0.15]);
  },
  // HAZARDS (bauen vom Boden nach oben — flach in den Daten, hier sichtbar/bedrohlich)
  presse: (s, r) => {
    const stahl: RGB = [0.3, 0.32, 0.36];
    teil(s, r, 'pr_base', 'box', [5, 0.4, 5], [0, 0, 0], [0.22, 0.22, 0.25], { edges: true });
    teil(s, r, 'pr_warn1', 'box', [5.05, 0.12, 0.7], [0, 0.16, 2.0], [0.9, 0.75, 0.1], { emissive: [0.5, 0.4, 0.0] });
    teil(s, r, 'pr_warn2', 'box', [5.05, 0.12, 0.7], [0, 0.16, -2.0], [0.9, 0.75, 0.1], { emissive: [0.5, 0.4, 0.0] });
    teil(s, r, 'pr_p1', 'box', [0.5, 4.4, 0.5], [-2.1, 2.2, -2.1], stahl, { edges: true });
    teil(s, r, 'pr_p2', 'box', [0.5, 4.4, 0.5], [2.1, 2.2, -2.1], stahl, { edges: true });
    teil(s, r, 'pr_beam', 'box', [5, 0.7, 1.4], [0, 4.4, -2.1], stahl, { edges: true });
    teil(s, r, 'pr_hammer', 'box', [3.4, 1.2, 3.4], [0, 3.0, 0.2], [0.55, 0.16, 0.14], { emissive: [0.28, 0.04, 0.03], edges: true });
  },
  stachelgrube: (s, r) => {
    teil(s, r, 'sg_pit', 'cyl', [4, 0.3, 0], [0, 0, 0], [0.1, 0.08, 0.08], { edges: true });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      teil(s, r, 'sg_spike' + i, 'cone', [0.5, 1.3, 0], [Math.cos(a) * 1.3, 0.65, Math.sin(a) * 1.3], [0.45, 0.12, 0.1], { emissive: [0.2, 0.03, 0.02] });
    }
    teil(s, r, 'sg_spc', 'cone', [0.55, 1.5, 0], [0, 0.75, 0], [0.5, 0.14, 0.12], { emissive: [0.22, 0.03, 0.02] });
  },
  giftpfuetze: (s, r) => {
    teil(s, r, 'gp_1', 'cyl', [4, 0.16, 0], [0, 0, 0], [0.18, 0.4, 0.12], { emissive: [0.08, 0.3, 0.05] });
    teil(s, r, 'gp_2', 'cyl', [2.6, 0.2, 0], [0.6, 0.04, -0.4], [0.3, 0.62, 0.18], { emissive: [0.14, 0.42, 0.06] });
    teil(s, r, 'gp_3', 'cyl', [1.5, 0.24, 0], [-0.7, 0.07, 0.5], [0.4, 0.72, 0.22], { emissive: [0.18, 0.5, 0.08] });
  },
  // SETPIECES
  funkturm: (s, r) => {
    const stahl: RGB = [0.42, 0.46, 0.52];
    // 4 vertikale Beine (Pylon-Silhouette) + Querstreben auf 3 Ebenen.
    for (const [i, sx] of [-1, 1].entries())
      for (const [j, sz] of [-1, 1].entries())
        teil(s, r, `ft_leg${i}${j}`, 'box', [0.28, 16, 0.28], [sx * 1.3, 0, sz * 1.3], stahl, { edges: true });
    for (const [k, y] of [-5.5, 0, 5.5].entries()) {
      teil(s, r, 'ft_bx' + k, 'box', [2.9, 0.16, 0.16], [0, y, 1.3], shade(stahl, 0.85));
      teil(s, r, 'ft_bx2' + k, 'box', [2.9, 0.16, 0.16], [0, y, -1.3], shade(stahl, 0.85));
      teil(s, r, 'ft_bz' + k, 'box', [0.16, 0.16, 2.9], [1.3, y, 0], shade(stahl, 0.85));
      teil(s, r, 'ft_bz2' + k, 'box', [0.16, 0.16, 2.9], [-1.3, y, 0], shade(stahl, 0.85));
    }
    teil(s, r, 'ft_mast', 'cyl', [0.22, 4, 0], [0, 9, 0], stahl);
    teil(s, r, 'ft_dish', 'cyl', [2.2, 0.2, 0], [0.9, 6.6, 0], [0.7, 0.72, 0.75], { rotZ: 1.0, edges: true });
    teil(s, r, 'ft_beacon', 'sphere', [0.55, 0, 0], [0, 11, 0], [1, 0.2, 0.15], { emissive: [0.8, 0.1, 0.05] });
  },
  sprungrampe: (s, r, c) => {
    const tilt = -0.34;
    teil(s, r, 'ramp_surf', 'box', [6, 0.5, 10.2], [0, 0, 0], c, { rotX: tilt, edges: true });
    teil(s, r, 'ramp_railL', 'box', [0.3, 0.7, 10.2], [-2.85, 0.4, 0], shade(c, 0.7), { rotX: tilt });
    teil(s, r, 'ramp_railR', 'box', [0.3, 0.7, 10.2], [2.85, 0.4, 0], shade(c, 0.7), { rotX: tilt });
    for (const [i, z] of [-2.5, 0, 2.5].entries())
      teil(s, r, 'ramp_chev' + i, 'box', [3.4, 0.08, 0.7], [0, 0.32 + z * 0.34 * 1, z], [0.95, 0.85, 0.1], { rotX: tilt, emissive: [0.55, 0.45, 0.0] });
  },
  bonusinsel: (s, r, c) => {
    teil(s, r, 'bi_deck', 'box', [22, 1, 16], [0, 0, 0], c, { edges: true });
    teil(s, r, 'bi_rimN', 'box', [22, 0.5, 0.6], [0, 0.5, 8], shade(c, 1.5));
    teil(s, r, 'bi_rimS', 'box', [22, 0.5, 0.6], [0, 0.5, -8], shade(c, 1.5));
    teil(s, r, 'bi_rimE', 'box', [0.6, 0.5, 16], [11, 0.5, 0], shade(c, 1.5));
    teil(s, r, 'bi_rimW', 'box', [0.6, 0.5, 16], [-11, 0.5, 0], shade(c, 1.5));
    teil(s, r, 'bi_totem', 'cyl', [0.9, 3, 0], [0, 2, 0], [0.5, 0.45, 0.4], { edges: true });
    teil(s, r, 'bi_orb', 'sphere', [1.1, 0, 0], [0, 4, 0], [1, 0.85, 0.4], { emissive: [0.7, 0.55, 0.2] });
  },
  // DECOR
  reifenstapel: (s, r) => {
    for (const [i, y] of [-0.33, 0, 0.33].entries()) teil(s, r, 'tire' + i, 'cyl', [1.4, 0.34, 0], [0, y, 0], [0.08, 0.08, 0.09], { edges: true });
  },
  verkehrskegel: (s, r, c) => {
    teil(s, r, 'cone_base', 'box', [0.7, 0.12, 0.7], [0, -0.45, 0], shade(c, 0.7));
    teil(s, r, 'cone_b', 'cone', [0.7, 1, 0], [0, 0.05, 0], c, { emissive: shade(c, 0.4) });
    teil(s, r, 'cone_str', 'cyl', [0.55, 0.14, 0], [0, 0.1, 0], [0.95, 0.95, 0.95], { emissive: [0.4, 0.4, 0.4] });
  },
  truemmer: (s, r, c) => {
    teil(s, r, 'tr_1', 'box', [0.9, 0.4, 0.7], [-0.2, -0.05, 0], c, { rotY: 0.4 });
    teil(s, r, 'tr_2', 'box', [0.6, 0.5, 0.5], [0.4, 0.05, 0.2], shade(c, 0.8), { rotY: -0.6 });
  },
  pfuetze: (s, r, c) => {
    teil(s, r, 'pf', 'cyl', [2, 0.06, 0], [0, 0, 0], c, { emissive: shade(c, 0.5) });
  },
  // PICKUPS (schweben/drehen via main-Loop)
  fund_huhn: (s, r, c) => {
    teil(s, r, 'fh_core', 'sphere', [0.7, 0, 0], [0, 0, 0], c, { emissive: shade(c, 0.5) });
    teil(s, r, 'fh_cv', 'box', [0.16, 0.5, 0.16], [0, 0, 0.42], [0.9, 0.2, 0.2], { emissive: [0.6, 0.05, 0.05] });
    teil(s, r, 'fh_ch', 'box', [0.5, 0.16, 0.16], [0, 0, 0.42], [0.9, 0.2, 0.2], { emissive: [0.6, 0.05, 0.05] });
    teil(s, r, 'fh_halo', 'cyl', [1.6, 0.04, 0], [0, -0.5, 0], [0.4, 0.9, 0.3], { emissive: [0.15, 0.45, 0.1] });
  },
  fund_schraube: (s, r, c) => {
    teil(s, r, 'fs_head', 'cyl', [0.62, 0.3, 0], [0, 0.12, 0], c, { emissive: shade(c, 0.5), tess: 6, edges: true });
    teil(s, r, 'fs_shaft', 'cyl', [0.24, 0.55, 0], [0, -0.25, 0], shade(c, 0.85), { tess: 8 });
    teil(s, r, 'fs_halo', 'cyl', [1.2, 0.04, 0], [0, -0.5, 0], [0.4, 0.9, 0.3], { emissive: [0.12, 0.4, 0.08] });
  },
  fund_kanister: (s, r, c) => {
    teil(s, r, 'fk_b', 'cyl', [0.7, 0.9, 0], [0, 0, 0], c, { emissive: shade(c, 0.45), edges: true });
    teil(s, r, 'fk_cap', 'cyl', [0.32, 0.22, 0], [0, 0.52, 0], [0.15, 0.15, 0.17]);
    teil(s, r, 'fk_band', 'cyl', [0.73, 0.16, 0], [0, 0.1, 0], shade(c, 0.6));
    teil(s, r, 'fk_halo', 'cyl', [1.3, 0.04, 0], [0, -0.5, 0], [0.4, 0.9, 0.3], { emissive: [0.12, 0.4, 0.08] });
  },
};

export function baueAssetMesh(scene: Scene, def: AssetDef, name: string): Mesh {
  const root = new Mesh(name, scene);
  const bau = BAUART[def.id];
  if (bau) {
    bau(scene, root, def.mesh.color);
    return root;
  }
  // Fallback: unbekanntes Asset -> einzelne Grundform aus der Definition (nie stiller Absturz).
  const s = def.mesh.size;
  const form: 'box' | 'cyl' | 'cone' | 'sphere' = def.mesh.form === 'cylinder' ? 'cyl' : def.mesh.form;
  teil(scene, root, name + '_x', form, [s.x, s.y, s.z], [0, 0, 0], def.mesh.color, { edges: true });
  return root;
}
