/**
 * Naht-Test: setzt ein Tile NxN gekachelt zusammen, damit man sieht, ob es nahtlos kachelt
 * (sichtbare Kante an den Tile-Grenzen = Naht-Problem). Output in den gitignorten extracted/-
 * Ordner (kommt nicht ins Spiel/Repo). Aufruf:  node tools/tilecheck.mjs boden_basis 2
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const name = process.argv[2] || 'boden_basis';
const N = Number(process.argv[3] || 2);

const src = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public', 'tiles', name + '.png')));
const W = src.width, H = src.height;
const out = new PNG({ width: W * N, height: H * N });
for (let ty = 0; ty < N; ty++) {
  for (let tx = 0; tx < N; tx++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const sp = (y * W + x) * 4;
        const dp = ((ty * H + y) * W * N + (tx * W + x)) * 4;
        out.data[dp] = src.data[sp];
        out.data[dp + 1] = src.data[sp + 1];
        out.data[dp + 2] = src.data[sp + 2];
        out.data[dp + 3] = 255;
      }
    }
  }
}
const dst = path.join(ROOT, 'docs', 'superpowers', 'assets', 'extracted', `_check_${name}.png`);
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.writeFileSync(dst, PNG.sync.write(out));
console.log('Naht-Test', N + 'x' + N, '->', dst);
