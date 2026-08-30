import fs from 'node:fs';
import path from 'node:path';
import { PNG, blit, drawText, fillRect, writePng } from './pngDrawing.mjs';

const SIZE = 256;
const TAU = Math.PI * 2;
const root = process.cwd();
const outputDir = path.resolve(root, 'public/style-kits/ironwaste-v1/candidates');
const qaDir = path.resolve(root, 'docs/superpowers/assets');
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(qaDir, { recursive: true });

const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
const mix = (a, b, t) => a.map((value, index) => clamp(value + (b[index] - value) * t));

function periodicNoise(x, y, seed = 0) {
  const u = TAU * x / (SIZE - 1);
  const v = TAU * y / (SIZE - 1);
  return (
    Math.sin(u * 3 + seed * 0.73) * 0.31
    + Math.cos(v * 4 - seed * 0.41) * 0.25
    + Math.sin(u * 2 + v * 3 + seed * 1.17) * 0.24
    + Math.cos(u * 7 - v * 5 + seed * 0.19) * 0.2
  );
}

function texture(render) {
  const png = new PNG({ width: SIZE, height: SIZE });
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const rgba = render(x, y);
      const index = (y * SIZE + x) * 4;
      png.data[index] = clamp(rgba[0]);
      png.data[index + 1] = clamp(rgba[1]);
      png.data[index + 2] = clamp(rgba[2]);
      png.data[index + 3] = clamp(rgba[3] ?? 255);
    }
  }
  return png;
}

const industrial = texture((x, y) => {
  const u = TAU * x / (SIZE - 1), v = TAU * y / (SIZE - 1);
  const noise = periodicNoise(x, y, 1);
  const panelLine = Math.min(Math.abs(Math.sin(u * 2)), Math.abs(Math.sin(v * 2)));
  const crack = Math.abs(Math.sin(u * 5 + v * 7 + Math.sin(v * 3))) < 0.035;
  const base = mix([70, 77, 80], [100, 108, 110], (noise + 1) * 0.32);
  if (panelLine < 0.045) return [39, 45, 47, 255];
  if (crack) return [43, 47, 48, 255];
  const rust = Math.max(0, periodicNoise(x, y, 4) - 0.45) * 1.8;
  return [...mix(base, [142, 68, 36], rust), 255];
});

const scrap = texture((x, y) => {
  const noise = periodicNoise(x, y, 7);
  const patch = Math.max(0, periodicNoise(x, y, 10) - 0.18);
  const metal = Math.max(0, -periodicNoise(x, y, 13) - 0.62);
  let rgb = mix([58, 45, 35], [92, 69, 47], (noise + 1) * 0.38);
  rgb = mix(rgb, [154, 73, 35], Math.min(0.8, patch));
  rgb = mix(rgb, [105, 116, 117], Math.min(0.75, metal * 2.8));
  return [...rgb, 255];
});

const transition = texture((x, y) => {
  const t = x / (SIZE - 1);
  const ragged = periodicNoise(x, y, 22) * 0.13;
  const blend = Math.max(0, Math.min(1, t + ragged));
  const left = [72, 79, 81], right = [104, 63, 39];
  const alpha = Math.sin(Math.PI * t) ** 0.7 * 235;
  return [...mix(left, right, blend), alpha];
});

const road = texture((x, y) => {
  const u = x / (SIZE - 1);
  const v = TAU * y / (SIZE - 1);
  const noise = periodicNoise(x, y, 31);
  const edgeWear = Math.abs(u - 0.5) * 2;
  let rgb = mix([36, 39, 40], [58, 61, 61], (noise + 1) * 0.28 + edgeWear * 0.08);
  const centerMark = Math.abs(u - 0.5) < 0.012 && Math.sin(v * 4) > 0.1;
  const track = Math.abs(u - 0.28) < 0.018 || Math.abs(u - 0.72) < 0.018;
  if (track) rgb = mix(rgb, [18, 20, 21], 0.38);
  if (centerMark) rgb = mix(rgb, [178, 149, 65], 0.72);
  return [...rgb, 255];
});

const roadEdge = texture((x, y) => {
  const u = x / (SIZE - 1);
  const edge = Math.min(u, 1 - u);
  const alpha = edge < 0.18 ? (1 - edge / 0.18) * 220 : 0;
  const rust = periodicNoise(x, y, 37);
  return [clamp(75 + rust * 20), clamp(70 + rust * 15), clamp(58 + rust * 10), alpha];
});

const industrialCracks = texture((x, y) => {
  const u = TAU * x / (SIZE - 1), v = TAU * y / (SIZE - 1);
  const line = Math.abs(Math.sin(u * 3 + v * 5 + Math.sin(v * 2))) < 0.035;
  const secondary = Math.abs(Math.cos(u * 7 - v * 4)) < 0.022;
  return [38, 43, 45, line || secondary ? 190 : 0];
});

const scrapFragments = texture((x, y) => {
  const value = periodicNoise(x, y, 41);
  const shard = value > 0.62 || value < -0.72;
  const rust = value > 0.62;
  return rust ? [160, 76, 35, shard ? 210 : 0] : [111, 122, 124, shard ? 190 : 0];
});

const sharedGrime = texture((x, y) => {
  const value = periodicNoise(x, y, 53);
  const alpha = Math.max(0, Math.abs(value) - 0.28) * 190;
  return value > 0 ? [85, 57, 38, alpha] : [28, 32, 33, alpha];
});

const files = new Map([
  ['ground_industrial.png', industrial],
  ['ground_scrap.png', scrap],
  ['transition_industrial_scrap.png', transition],
  ['road_surface.png', road],
  ['road_edge.png', roadEdge],
  ['decal_industrial_cracks.png', industrialCracks],
  ['decal_scrap_fragments.png', scrapFragments],
  ['decal_shared_grime.png', sharedGrime],
]);

for (const [name, png] of files) writePng(path.join(outputDir, name), png);

function tileInto(target, source, x, y, columns, rows) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) blit(target, source, x + col * source.width, y + row * source.height);
  }
}

const sheet = new PNG({ width: 1024, height: 1024 });
fillRect(sheet, 0, 0, sheet.width, sheet.height, [24, 28, 29, 255]);

drawText(sheet, 'INDUSTRIAL TILE 2X2', 14, 8, [226, 226, 212, 255], 2);
drawText(sheet, 'SCRAP TILE 2X2', 530, 8, [226, 226, 212, 255], 2);
tileInto(sheet, industrial, 0, 32, 2, 2);
tileInto(sheet, scrap, 512, 32, 2, 2);

drawText(sheet, 'BIOME TRANSITION', 14, 556, [226, 226, 212, 255], 2);
for (let y = 584; y < 1016; y += SIZE) {
  blit(sheet, industrial, 0, y);
  blit(sheet, scrap, 256, y);
  blit(sheet, transition, 128, y);
}

drawText(sheet, 'ROAD AND DECALS', 530, 556, [226, 226, 212, 255], 2);
blit(sheet, industrial, 512, 584);
blit(sheet, scrap, 768, 584);
blit(sheet, road, 640, 584);
blit(sheet, road, 640, 840);
blit(sheet, roadEdge, 640, 584);
blit(sheet, industrialCracks, 512, 840);
blit(sheet, scrapFragments, 768, 840);
blit(sheet, sharedGrime, 768, 840);

writePng(path.join(qaDir, 'ironwaste-v1-contact-sheet.png'), sheet);
process.stdout.write(`ironwaste-assets:${files.size}:256x256\n`);
