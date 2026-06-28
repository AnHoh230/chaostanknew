/**
 * Boden-Textur-Bake: verschmilzt diskrete Sheet-Kacheln zu EINER nahtlosen, organischen
 * Boden-Textur — gegen das „hintereinander gepackte Vierecke"-Raster, das beim harten Kacheln
 * nicht-nahtloser Tiles entsteht.
 *
 * Technik (Texture-Bombing): jedes Quadrat-Tile wird nur über eine RADIALE Maske geklatscht
 * (Mitte voll, Rand 0) -> die Quadratform faellt weg, nur der runde Kern bleibt. Viele Kleckse
 * (versch. Tiles/Groessen/Drehungen) ueberlappen, TOROIDAL (Wrap) -> die Textur kachelt nahtlos.
 *
 * Output: public/tiles/<name>.png (groesse SIZE). Rein/deterministisch (fixer Seed je Job).
 * Ergebnis selbst als Bild pruefbar, bevor es ins Spiel geht.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TILES = path.resolve(__dirname, '..', 'public', 'tiles');

const SIZE = 1024;
const SPLATS = 650;

// Output-Name -> Pool der Quell-Tiles (semantisch). boden_basis = Hauptboden (Oedland-Mix);
// boden_t_* = theme-spezifische Distrikt-Boeden (auch nahtlos gebacken -> keine Vierecke).
const JOBS = {
  boden_basis: ['boden_dreck', 'boden_kies', 'boden_asphalt', 'boden_rissig', 'boden_erde', 'boden_schutt', 'boden_grus', 'boden_teer'],
  boden_t_beton: ['boden_beton', 'boden_grus', 'boden_rissig'],
  boden_t_asphalt: ['boden_asphalt', 'boden_teer', 'boden_rissig'],
  boden_t_dreck: ['boden_dreck', 'boden_erde', 'boden_schutt'],
  boden_t_rissig: ['boden_rissig', 'boden_asphalt', 'boden_schutt'],
  boden_t_moos: ['boden_moos', 'boden_beton', 'boden_grus'],
  boden_t_kies: ['boden_kies', 'boden_grus', 'boden_dreck'],
};

function ladeTile(name) {
  return PNG.sync.read(fs.readFileSync(path.join(TILES, name + '.png')));
}

// mulberry32 — deterministischer RNG
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function splat(out, t, cx, cy, R, rot, flip) {
  const r = Math.ceil(R);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const dist = Math.hypot(dx, dy);
      if (dist > R) continue;
      const m = 1 - dist / R;
      const a0 = m * m * (3 - 2 * m); // smoothstep -> weicher Rand
      // Tile-UV aus dem Kreis (0..1), mit 90er-Rotation + optionaler Spiegelung
      let u = (dx / R + 1) / 2;
      let v = (dy / R + 1) / 2;
      let uu = u, vv = v;
      if (rot === 1) { uu = v; vv = 1 - u; }
      else if (rot === 2) { uu = 1 - u; vv = 1 - v; }
      else if (rot === 3) { uu = 1 - v; vv = u; }
      if (flip) uu = 1 - uu;
      const sx = Math.min(t.width - 1, Math.max(0, Math.floor(uu * t.width)));
      const sy = Math.min(t.height - 1, Math.max(0, Math.floor(vv * t.height)));
      const sp = (sy * t.width + sx) * 4;
      const aa = a0 * (t.data[sp + 3] / 255);
      if (aa <= 0.003) continue;
      const tx = (((Math.round(cx) + dx) % SIZE) + SIZE) % SIZE;
      const ty = (((Math.round(cy) + dy) % SIZE) + SIZE) % SIZE;
      const dp = (ty * SIZE + tx) * 4;
      out.data[dp] = out.data[dp] * (1 - aa) + t.data[sp] * aa;
      out.data[dp + 1] = out.data[dp + 1] * (1 - aa) + t.data[sp + 1] * aa;
      out.data[dp + 2] = out.data[dp + 2] * (1 - aa) + t.data[sp + 2] * aa;
      out.data[dp + 3] = 255;
    }
  }
}

function bake(pool, seed) {
  const tiles = pool.map(ladeTile);
  const out = new PNG({ width: SIZE, height: SIZE });
  // Grund = mittlere Farbe des Pools (uniform -> immer nahtlos), wird von Splats fast voll ueberdeckt
  let rr = 0, gg = 0, bb = 0, cnt = 0;
  for (const t of tiles) {
    for (let i = 0; i < t.width * t.height; i++) {
      if (t.data[i * 4 + 3] < 8) continue;
      rr += t.data[i * 4]; gg += t.data[i * 4 + 1]; bb += t.data[i * 4 + 2]; cnt++;
    }
  }
  rr = Math.round(rr / cnt); gg = Math.round(gg / cnt); bb = Math.round(bb / cnt);
  for (let i = 0; i < SIZE * SIZE; i++) {
    out.data[i * 4] = rr; out.data[i * 4 + 1] = gg; out.data[i * 4 + 2] = bb; out.data[i * 4 + 3] = 255;
  }
  const rand = rng(seed);
  for (let s = 0; s < SPLATS; s++) {
    const t = tiles[Math.floor(rand() * tiles.length)];
    const R = (SIZE / 14) * (1 + rand() * 1.1); // ~73..154 px Radius (feiner -> gleichmaessiger)
    splat(out, t, rand() * SIZE, rand() * SIZE, R, Math.floor(rand() * 4), rand() < 0.5);
  }
  return out;
}

let seed = 1337;
for (const [name, pool] of Object.entries(JOBS)) {
  const png = bake(pool, seed++);
  const dst = path.join(TILES, name + '.png');
  fs.writeFileSync(dst, PNG.sync.write(png));
  console.log(name, '<- splat(', pool.length, 'Tiles,', SPLATS, 'Kleckse,', SIZE + 'px )');
}
