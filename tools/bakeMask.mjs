/**
 * Kanten-Masken fuer die Modul-Boeden: organisch ausgefranste Alpha-Masken (Graustufe), damit die
 * Distrikt-Bodenplatten NICHT als harte Rechtecke erscheinen. Mitte voll (weiss), Rand unregelmaessig
 * auslaufend (schwarz) -> als opacityTexture verblasst die Platte zu einem weichen Material-Fleck.
 *
 * Kontur = mittlerer Radius, ueber den Winkel mit mehreren Harmonischen + Noise moduliert -> kein
 * Kreis, kein Rechteck, sondern ein unregelmaessiger Blob. Mehrere Varianten gegen Wiederholung.
 *
 * Output: public/tiles/mask_<k>.png. Rein/deterministisch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TILES = path.resolve(__dirname, '..', 'public', 'tiles');
const SIZE = 512;
const VARIANTEN = 6;

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bakeMask(seed) {
  const out = new PNG({ width: SIZE, height: SIZE });
  const rand = rng(seed);
  const cx = SIZE / 2, cy = SIZE / 2;
  // zufaellige Harmonische fuer die Randkontur (verschiedene Frequenzen -> unregelmaessig)
  const H = [];
  for (let k = 0; k < 7; k++) {
    H.push({ amp: 0.025 + rand() * 0.06, ph: rand() * Math.PI * 2, freq: 2 + Math.floor(rand() * 7) });
  }
  const baseR = SIZE * 0.45; // fuellt das Modul gut, nur die Raender franzen aus
  const edge = SIZE * 0.11; // weiche Kantenbreite
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - cx, dy = y - cy;
      const ang = Math.atan2(dy, dx);
      const r = Math.hypot(dx, dy);
      let rr = baseR;
      for (const h of H) rr += baseR * h.amp * Math.sin(h.freq * ang + h.ph);
      let v;
      if (r <= rr - edge) v = 1;
      else if (r >= rr) v = 0;
      else { const t = (rr - r) / edge; v = t * t * (3 - 2 * t); }
      const g = Math.round(v * 255);
      const dp = (y * SIZE + x) * 4;
      out.data[dp] = g; out.data[dp + 1] = g; out.data[dp + 2] = g; out.data[dp + 3] = 255;
    }
  }
  return out;
}

for (let k = 0; k < VARIANTEN; k++) {
  fs.writeFileSync(path.join(TILES, `mask_${k}.png`), PNG.sync.write(bakeMask(101 + k * 7)));
  console.log(`mask_${k}.png`);
}
