/**
 * Tile-Extraktor fuer die AI-Sheets (docs/superpowers/assets/*.png).
 *
 * Methode: Hintergrund = weiss/transparent, vom Bildrand aus geflutet (8er-Nachbarschaft).
 * Interne helle Risse einer Kachel sind NICHT vom Rand erreichbar und bleiben damit Vordergrund
 * -> Kacheln zerfallen nicht an ihren Fugen. Der Vordergrund wird per Connected-Components
 * (4er-Nachbarschaft, vermeidet Diagonal-Bruecken) in einzelne Inseln zerlegt = Kacheln.
 *
 * Touchende Kacheln ohne Weiss-Fuge verschmelzen zu einem Blob (per Hand kuratieren).
 *
 * Output je Sheet: extracted/<name>/NNN.png (Rand-Weiss -> Alpha, Rest opak) + manifest.json
 * + _montage.png (Schnell-Ueberblick). Global: extracted/index.html (Galerie zum Kuratieren).
 *
 * Rerunnbar. CLI-Tunables:  node tools/extractTiles.mjs --white 248 --minpix 600
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'docs', 'superpowers', 'assets');
const OUT_DIR = path.join(SRC_DIR, 'extracted');

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const WHITE = arg('white', 244); // r,g,b >= WHITE => weiss
const ALPHA_BG = arg('alpha', 16); // a < ALPHA_BG => transparent
const MIN_PIX = arg('minpix', 500); // kleinere Blobs = Rauschen
const MIN_WH = arg('minwh', 10);
const CELL = 150;
const PAD = 10;
const COLS = 10;

function isBgColor(d, p) {
  const a = d[p * 4 + 3];
  if (a < ALPHA_BG) return true;
  return d[p * 4] >= WHITE && d[p * 4 + 1] >= WHITE && d[p * 4 + 2] >= WHITE;
}

// Mini-3x5-Font, um den Index in jede Montage-Zelle zu brennen (gelb auf schwarz).
const FONT = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['110', '010', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
};

function drawLabel(png, W, H, x, y, text) {
  const S = 2;
  const dw = 3;
  const dh = 5;
  const cw = dw * S + S;
  const bw = text.length * cw + 2;
  const bh = dh * S + 2;
  for (let yy = 0; yy < bh; yy++) {
    for (let xx = 0; xx < bw; xx++) {
      const px = x + xx;
      const py = y + yy;
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const dp = (py * W + px) * 4;
      png.data[dp] = png.data[dp + 1] = png.data[dp + 2] = 0;
      png.data[dp + 3] = 255;
    }
  }
  let cx = x + 1;
  for (const ch of text) {
    const g = FONT[ch];
    if (g) {
      for (let r = 0; r < dh; r++) {
        for (let c = 0; c < dw; c++) {
          if (g[r][c] !== '1') continue;
          for (let sy = 0; sy < S; sy++) {
            for (let sx = 0; sx < S; sx++) {
              const px = cx + c * S + sx;
              const py = y + 1 + r * S + sy;
              if (px < 0 || py < 0 || px >= W || py >= H) continue;
              const dp = (py * W + px) * 4;
              png.data[dp] = 255;
              png.data[dp + 1] = 235;
              png.data[dp + 2] = 60;
              png.data[dp + 3] = 255;
            }
          }
        }
      }
    }
    cx += cw;
  }
}

function extract(srcPath, name) {
  const png = PNG.sync.read(fs.readFileSync(srcPath));
  const { width: W, height: H, data } = png;
  const N = W * H;

  // 1) Rand-Hintergrund fluten (8er).
  const bg = new Uint8Array(N);
  const stack = [];
  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const p = y * W + x;
    if (bg[p] || !isBgColor(data, p)) return;
    bg[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < W; x++) {
    pushIf(x, 0);
    pushIf(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    pushIf(0, y);
    pushIf(W - 1, y);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % W;
    const y = (p / W) | 0;
    pushIf(x + 1, y);
    pushIf(x - 1, y);
    pushIf(x, y + 1);
    pushIf(x, y - 1);
    pushIf(x + 1, y + 1);
    pushIf(x - 1, y - 1);
    pushIf(x + 1, y - 1);
    pushIf(x - 1, y + 1);
  }

  // 2) Vordergrund-Inseln (4er-Components).
  const label = new Int32Array(N).fill(-1);
  const blobs = [];
  for (let s = 0; s < N; s++) {
    if (bg[s] || label[s] >= 0) continue;
    const id = blobs.length;
    let minx = W, miny = H, maxx = 0, maxy = 0, cnt = 0, sx = 0, sy = 0;
    label[s] = id;
    const st = [s];
    while (st.length) {
      const p = st.pop();
      const x = p % W;
      const y = (p / W) | 0;
      cnt++;
      sx += x;
      sy += y;
      if (x < minx) minx = x;
      if (x > maxx) maxx = x;
      if (y < miny) miny = y;
      if (y > maxy) maxy = y;
      const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const [nx, ny] of nb) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (bg[q] || label[q] >= 0) continue;
        label[q] = id;
        st.push(q);
      }
    }
    blobs.push({ minx, miny, maxx, maxy, cnt, cx: sx / cnt, cy: sy / cnt });
  }

  // 3) Filtern + Lesereihenfolge (Zeilen-Bucket nach y, dann x).
  const kept = blobs.filter(
    (b) => b.cnt >= MIN_PIX && b.maxx - b.minx + 1 >= MIN_WH && b.maxy - b.miny + 1 >= MIN_WH,
  );
  kept.sort((a, b) => Math.round(a.cy / 60) - Math.round(b.cy / 60) || a.cx - b.cx);

  // 4) Crops schreiben.
  const dir = path.join(OUT_DIR, name);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = [];
  kept.forEach((b, k) => {
    const w = b.maxx - b.minx + 1;
    const h = b.maxy - b.miny + 1;
    const crop = new PNG({ width: w, height: h });
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const sp = (b.miny + yy) * W + (b.minx + xx);
        const dp = (yy * w + xx) * 4;
        if (bg[sp]) {
          crop.data[dp] = crop.data[dp + 1] = crop.data[dp + 2] = 0;
          crop.data[dp + 3] = 0;
        } else {
          crop.data[dp] = data[sp * 4];
          crop.data[dp + 1] = data[sp * 4 + 1];
          crop.data[dp + 2] = data[sp * 4 + 2];
          crop.data[dp + 3] = 255;
        }
      }
    }
    const file = String(k).padStart(3, '0') + '.png';
    fs.writeFileSync(path.join(dir, file), PNG.sync.write(crop));
    manifest.push({ index: k, file, x: b.minx, y: b.miny, w, h, pixels: b.cnt });
  });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // 5) Montage (fixes Raster, nearest-neighbor) fuer schnellen Ueberblick.
  const rows = Math.max(1, Math.ceil(kept.length / COLS));
  const mW = COLS * CELL;
  const mH = rows * CELL;
  const mont = new PNG({ width: mW, height: mH });
  for (let i = 0; i < mW * mH; i++) {
    const x = i % mW;
    const y = (i / mW) | 0;
    const c = (((x / 20) | 0) + ((y / 20) | 0)) % 2 ? 40 : 55;
    mont.data[i * 4] = c;
    mont.data[i * 4 + 1] = c;
    mont.data[i * 4 + 2] = c;
    mont.data[i * 4 + 3] = 255;
  }
  kept.forEach((b, k) => {
    const w = b.maxx - b.minx + 1;
    const h = b.maxy - b.miny + 1;
    const scale = Math.min((CELL - PAD) / w, (CELL - PAD) / h, 1);
    const dw = Math.max(1, Math.round(w * scale));
    const dh = Math.max(1, Math.round(h * scale));
    const ox = (k % COLS) * CELL + (((CELL - dw) / 2) | 0);
    const oy = ((k / COLS) | 0) * CELL + (((CELL - dh) / 2) | 0);
    for (let yy = 0; yy < dh; yy++) {
      for (let xx = 0; xx < dw; xx++) {
        const sx = b.minx + Math.min(w - 1, Math.round(xx / scale));
        const sy = b.miny + Math.min(h - 1, Math.round(yy / scale));
        const sp = sy * W + sx;
        if (bg[sp]) continue;
        const dp = ((oy + yy) * mW + (ox + xx)) * 4;
        mont.data[dp] = data[sp * 4];
        mont.data[dp + 1] = data[sp * 4 + 1];
        mont.data[dp + 2] = data[sp * 4 + 2];
        mont.data[dp + 3] = 255;
      }
    }
    drawLabel(mont, mW, mH, (k % COLS) * CELL + 3, ((k / COLS) | 0) * CELL + 3, String(k));
  });
  fs.writeFileSync(path.join(dir, '_montage.png'), PNG.sync.write(mont));

  return { name, count: kept.length, manifest };
}

const sheets = fs.readdirSync(SRC_DIR).filter((f) => /\.png$/i.test(f));
fs.mkdirSync(OUT_DIR, { recursive: true });
const summary = sheets.map((f) => extract(path.join(SRC_DIR, f), path.basename(f, '.png')));

let html =
  '<!doctype html><meta charset=utf8><title>Tiles</title>' +
  '<style>body{background:#222;color:#ddd;font:13px sans-serif;padding:8px}' +
  'figure{display:inline-block;margin:4px;text-align:center}' +
  'img{background:#333;image-rendering:pixelated;max-width:120px;max-height:120px;border:1px solid #444}' +
  'figcaption{font-size:11px}h2{border-bottom:1px solid #555;margin-top:24px}</style>';
for (const s of summary) {
  html += `<h2>${s.name} &mdash; ${s.count} Tiles</h2>`;
  for (const m of s.manifest) {
    html += `<figure><img src="${s.name}/${m.file}"><figcaption>${m.index} &middot; ${m.w}&times;${m.h}</figcaption></figure>`;
  }
}
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);

console.log(summary.map((s) => `${s.name}: ${s.count} Tiles`).join('\n'));
console.log('Galerie: ' + path.join(OUT_DIR, 'index.html'));
