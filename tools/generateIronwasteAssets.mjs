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

function latticeValue(x, y, seed) {
  let hash = Math.imul(x + seed * 1013, 374761393) ^ Math.imul(y - seed * 733, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 0xffffffff;
}

function seamlessValueNoise(x, y, cells, seed) {
  const gx = x / (SIZE - 1) * cells;
  const gy = y / (SIZE - 1) * cells;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0;
  const wrap = (value) => ((value % cells) + cells) % cells;
  const smooth = (value) => value * value * (3 - 2 * value);
  const sx = smooth(fx), sy = smooth(fy);
  const a = latticeValue(wrap(x0), wrap(y0), seed);
  const b = latticeValue(wrap(x0 + 1), wrap(y0), seed);
  const c = latticeValue(wrap(x0), wrap(y0 + 1), seed);
  const d = latticeValue(wrap(x0 + 1), wrap(y0 + 1), seed);
  const top = a + (b - a) * sx;
  const bottom = c + (d - c) * sx;
  return top + (bottom - top) * sy;
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

const wasteland = texture((x, y) => {
  const broad = seamlessValueNoise(x, y, 4, 61);
  const patches = seamlessValueNoise(x, y, 9, 67);
  const grain = seamlessValueNoise(x, y, 19, 71);
  const stone = Math.max(0, grain - 0.8) * 3.4;
  const crack = Math.abs(patches - 0.48) < 0.018 && broad < 0.58;
  let rgb = mix([70, 66, 58], [116, 98, 73], broad * 0.62 + patches * 0.24);
  rgb = mix(rgb, [83, 72, 57], Math.max(0, patches - 0.55) * 0.8);
  rgb = mix(rgb, [164, 152, 126], Math.min(0.58, stone));
  if (crack) rgb = mix(rgb, [42, 40, 36], 0.55);
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

function transitionTexture(left, right, seed) {
  return texture((x, y) => {
    const t = x / (SIZE - 1);
    const ragged = periodicNoise(x, y, seed) * 0.13;
    const blend = Math.max(0, Math.min(1, t + ragged));
    const alpha = Math.sin(Math.PI * t) ** 0.7 * 235;
    return [...mix(left, right, blend), alpha];
  });
}

const industrialWastelandTransition = transitionTexture([72, 79, 81], [98, 85, 66], 73);
const scrapWastelandTransition = transitionTexture([104, 63, 39], [98, 85, 66], 79);

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

function transparentEdge(x, y, width = 24) {
  return Math.max(0, Math.min(1, Math.min(x, y, SIZE - 1 - x, SIZE - 1 - y) / width));
}

const wastelandLandmark = texture((x, y) => {
  const nx = (x - (SIZE - 1) / 2) / ((SIZE - 1) / 2);
  const ny = (y - (SIZE - 1) / 2) / ((SIZE - 1) / 2);
  const radius = Math.hypot(nx * 0.92, ny);
  const noise = periodicNoise(x, y, 83) * 0.08;
  const outer = Math.max(0, Math.min(1, (0.95 - radius + noise) * 8));
  const ring = Math.abs(radius - 0.58 - noise * 0.4) < 0.11;
  const rgb = ring ? [107, 99, 84] : mix([70, 62, 50], [125, 106, 78], (periodicNoise(x, y, 89) + 1) * 0.35);
  return [...rgb, outer * transparentEdge(x, y) * 205];
});

const wastelandDebris = texture((x, y) => {
  const nx = (x - (SIZE - 1) / 2) / ((SIZE - 1) / 2);
  const ny = (y - (SIZE - 1) / 2) / ((SIZE - 1) / 2);
  const radiusFade = Math.max(0, 1 - Math.hypot(nx, ny) / 0.96);
  const value = periodicNoise(x, y, 97);
  const shard = Math.max(0, Math.abs(value) - 0.38) * 2.3;
  const rusted = periodicNoise(x, y, 101) > 0.08;
  const rgb = rusted ? [145, 70, 39] : [104, 105, 97];
  return [...rgb, Math.min(220, shard * radiusFade * transparentEdge(x, y) * 255)];
});

const wastelandCover = texture((x, y) => {
  const u = (x - (SIZE - 1) / 2) / ((SIZE - 1) / 2);
  const v = (y - (SIZE - 1) / 2) / ((SIZE - 1) / 2);
  const bags = [-0.66, -0.34, 0, 0.34, 0.66].reduce((best, center) => (
    Math.min(best, ((u - center) / 0.21) ** 2 + ((v + 0.06 * Math.cos(center * 7)) / 0.18) ** 2)
  ), Infinity);
  const plate = Math.abs(u + v * 0.34) < 0.12 && Math.abs(v - 0.22) < 0.22;
  const edge = transparentEdge(x, y);
  if (bags < 1) return [143, 125, 91, (1 - bags * 0.28) * edge * 225];
  if (plate) return [133, 67, 39, edge * 200];
  const pebble = periodicNoise(x, y, 107) > 0.72 && Math.hypot(u, v) < 0.92;
  return [126, 119, 99, pebble ? edge * 150 : 0];
});

const files = new Map([
  ['ground_industrial.png', industrial],
  ['ground_scrap.png', scrap],
  ['ground_wasteland.png', wasteland],
  ['transition_industrial_scrap.png', transition],
  ['transition_industrial_wasteland.png', industrialWastelandTransition],
  ['transition_scrap_wasteland.png', scrapWastelandTransition],
  ['road_surface.png', road],
  ['road_edge.png', roadEdge],
  ['decal_industrial_cracks.png', industrialCracks],
  ['decal_scrap_fragments.png', scrapFragments],
  ['decal_shared_grime.png', sharedGrime],
  ['decal_wasteland_landmark.png', wastelandLandmark],
  ['decal_wasteland_debris.png', wastelandDebris],
  ['decal_wasteland_cover.png', wastelandCover],
]);

for (const [name, png] of files) writePng(path.join(outputDir, name), png);

function tileInto(target, source, x, y, columns, rows) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) blit(target, source, x + col * source.width, y + row * source.height);
  }
}

const sheet = new PNG({ width: 1536, height: 1100 });
fillRect(sheet, 0, 0, sheet.width, sheet.height, [24, 28, 29, 255]);

const groundPanels = [
  { label: 'INDUSTRIAL TILE 2X2', texture: industrial },
  { label: 'SCRAP TILE 2X2', texture: scrap },
  { label: 'WASTELAND TILE 2X2', texture: wasteland },
];
for (let index = 0; index < groundPanels.length; index++) {
  const panel = groundPanels[index];
  const x = index * 512;
  drawText(sheet, panel.label, x + 14, 8, [226, 226, 212, 255], 2);
  tileInto(sheet, panel.texture, x, 32, 2, 2);
}

const transitionPanels = [
  { label: 'INDUSTRIAL TO SCRAP', left: industrial, right: scrap, blend: transition },
  { label: 'INDUSTRIAL TO WASTELAND', left: industrial, right: wasteland, blend: industrialWastelandTransition },
  { label: 'SCRAP TO WASTELAND', left: scrap, right: wasteland, blend: scrapWastelandTransition },
];
for (let index = 0; index < transitionPanels.length; index++) {
  const panel = transitionPanels[index];
  const x = index * 512;
  drawText(sheet, panel.label, x + 14, 556, [226, 226, 212, 255], 2);
  blit(sheet, panel.left, x, 584);
  blit(sheet, panel.right, x + 256, 584);
  blit(sheet, panel.blend, x + 128, 584);
  blit(sheet, panel.left, x, 840);
  blit(sheet, panel.right, x + 256, 840);
}

blit(sheet, road, 128, 840);
blit(sheet, roadEdge, 128, 840);
blit(sheet, industrialCracks, 0, 840);
blit(sheet, scrapFragments, 256, 840);
blit(sheet, industrialCracks, 512, 840);
blit(sheet, wastelandLandmark, 768, 840);
blit(sheet, scrapFragments, 1024, 840);
blit(sheet, wastelandDebris, 1280, 840);
blit(sheet, wastelandCover, 1280, 840);

writePng(path.join(qaDir, 'ironwaste-v1-contact-sheet.png'), sheet);
process.stdout.write(`ironwaste-assets:${files.size}:256x256\n`);
