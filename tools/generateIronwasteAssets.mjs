import fs from 'node:fs';
import path from 'node:path';
import { PNG, blit, drawText, fillRect, readPng, writePng } from './pngDrawing.mjs';

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

const mud = texture((x, y) => {
  const broad = seamlessValueNoise(x, y, 4, 113);
  const puddles = seamlessValueNoise(x, y, 8, 127);
  const tracks = Math.abs(Math.sin(TAU * x / (SIZE - 1) * 2 + periodicNoise(x, y, 131))) < 0.08;
  let rgb = mix([58, 54, 43], [104, 86, 58], broad * 0.58 + puddles * 0.16);
  rgb = mix(rgb, [37, 43, 40], Math.max(0, 0.42 - puddles) * 1.35);
  if (tracks) rgb = mix(rgb, [45, 40, 33], 0.38);
  return [...rgb, 255];
});

const ruins = texture((x, y) => {
  const broad = seamlessValueNoise(x, y, 5, 137);
  const dust = seamlessValueNoise(x, y, 13, 139);
  const u = TAU * x / (SIZE - 1), v = TAU * y / (SIZE - 1);
  const blockJoint = Math.min(Math.abs(Math.sin(u * 2)), Math.abs(Math.sin(v * 2))) < 0.035;
  const crack = Math.abs(Math.sin(u * 5 - v * 7 + broad * 2)) < 0.028;
  let rgb = mix([82, 80, 74], [130, 122, 105], broad * 0.55 + dust * 0.18);
  if (blockJoint) rgb = mix(rgb, [54, 55, 53], 0.55);
  if (crack) rgb = mix(rgb, [43, 44, 42], 0.48);
  return [...rgb, 255];
});

const crater = texture((x, y) => {
  const broad = seamlessValueNoise(x, y, 4, 149);
  const ashNoise = seamlessValueNoise(x, y, 11, 151);
  const u = TAU * x / (SIZE - 1), v = TAU * y / (SIZE - 1);
  const impactRing = Math.abs(Math.sin(u * 3 + Math.cos(v * 2) + ashNoise)) < 0.045;
  let rgb = mix([45, 39, 36], [83, 69, 57], broad * 0.5 + ashNoise * 0.2);
  rgb = mix(rgb, [31, 32, 31], Math.max(0, ashNoise - 0.56) * 0.75);
  if (impactRing) rgb = mix(rgb, [112, 86, 59], 0.34);
  return [...rgb, 255];
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

const surfaces = {
  crater: { texture: crater, color: [57, 49, 43] },
  industrial: { texture: industrial, color: [72, 79, 81] },
  mud: { texture: mud, color: [75, 65, 49] },
  ruins: { texture: ruins, color: [103, 98, 87] },
  scrap: { texture: scrap, color: [104, 63, 39] },
  wasteland: { texture: wasteland, color: [98, 85, 66] },
};
const transitionTextures = new Map();
const surfaceEntries = Object.entries(surfaces);
for (let leftIndex = 0; leftIndex < surfaceEntries.length; leftIndex++) {
  for (let rightIndex = leftIndex + 1; rightIndex < surfaceEntries.length; rightIndex++) {
    const [leftId, left] = surfaceEntries[leftIndex];
    const [rightId, right] = surfaceEntries[rightIndex];
    transitionTextures.set(
      `transition_${leftId}_${rightId}.png`,
      transitionTexture(left.color, right.color, 71 + leftIndex * 17 + rightIndex * 23),
    );
  }
}
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

const files = new Map([
  ...surfaceEntries.map(([biomeId, surface]) => [`ground_${biomeId}.png`, surface.texture]),
  ...transitionTextures.entries(),
  ['road_surface.png', road],
  ['road_edge.png', roadEdge],
]);

for (const [name, png] of files) writePng(path.join(outputDir, name), png);

function blitScaledContain(target, source, x, y, width, height) {
  const scale = Math.min(width / source.width, height / source.height);
  const targetWidth = Math.max(1, Math.round(source.width * scale));
  const targetHeight = Math.max(1, Math.round(source.height * scale));
  const offsetX = x + Math.floor((width - targetWidth) / 2);
  const offsetY = y + Math.floor((height - targetHeight) / 2);
  for (let targetY = 0; targetY < targetHeight; targetY++) {
    const sourceY = Math.min(source.height - 1, Math.floor(targetY / scale));
    for (let targetX = 0; targetX < targetWidth; targetX++) {
      const sourceX = Math.min(source.width - 1, Math.floor(targetX / scale));
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const targetIndex = ((offsetY + targetY) * target.width + offsetX + targetX) * 4;
      const sourceAlpha = source.data[sourceIndex + 3] / 255;
      const inverseAlpha = 1 - sourceAlpha;
      target.data[targetIndex] = clamp(source.data[sourceIndex] * sourceAlpha + target.data[targetIndex] * inverseAlpha);
      target.data[targetIndex + 1] = clamp(source.data[sourceIndex + 1] * sourceAlpha + target.data[targetIndex + 1] * inverseAlpha);
      target.data[targetIndex + 2] = clamp(source.data[sourceIndex + 2] * sourceAlpha + target.data[targetIndex + 2] * inverseAlpha);
      target.data[targetIndex + 3] = 255;
    }
  }
}

const sheet = new PNG({ width: 2048, height: 1840 });
fillRect(sheet, 0, 0, sheet.width, sheet.height, [24, 28, 29, 255]);

drawText(sheet, 'TILEABLE BIOME GROUNDS', 16, 10, [226, 226, 212, 255], 2);
for (let index = 0; index < surfaceEntries.length; index++) {
  const [biomeId, surface] = surfaceEntries[index];
  const x = 8 + index * 338;
  drawText(sheet, biomeId.toUpperCase(), x + 6, 42, [184, 198, 193, 255], 1);
  blit(sheet, surface.texture, x, 60);
}

drawText(sheet, 'PARAMETRIC ROADS AND EXACT BIOME TRANSITIONS', 16, 340, [226, 226, 212, 255], 2);
const parametricFiles = [
  ['road_surface.png', road],
  ['road_edge.png', roadEdge],
  ...transitionTextures.entries(),
];
for (let index = 0; index < parametricFiles.length; index++) {
  const [name, png] = parametricFiles[index];
  const col = index % 9;
  const row = Math.floor(index / 9);
  const x = 8 + col * 226;
  const y = 374 + row * 184;
  blitScaledContain(sheet, png, x + 28, y, 160, 150);
  drawText(sheet, name.replace('.png', ''), x + 4, y + 154, [158, 174, 170, 255], 1);
}

const spriteNames = [
  'sprite_industrial_breakable_edge.png',
  'sprite_industrial_cover_cluster.png',
  'sprite_industrial_linear_barrier.png',
  'sprite_scrap_landmark.png',
  'sprite_scrap_pile.png',
  'sprite_scrap_wreck_cluster.png',
  'sprite_site_entrance.png',
  'sprite_site_industrial_yard.png',
  'sprite_site_scrap_yard.png',
  'sprite_wasteland_cover.png',
  'sprite_wasteland_debris.png',
  'sprite_wasteland_landmark.png',
];
drawText(sheet, 'REAL TRANSPARENT OBJECT ASSET FAMILIES', 16, 754, [226, 226, 212, 255], 2);
for (let index = 0; index < spriteNames.length; index++) {
  const name = spriteNames[index];
  const col = index % 4;
  const row = Math.floor(index / 4);
  const x = 8 + col * 510;
  const y = 790 + row * 342;
  fillRect(sheet, x, y, 494, 326, [18, 23, 25, 255]);
  const png = readPng(path.join(outputDir, name));
  blitScaledContain(sheet, png, x + 8, y + 6, 478, 286);
  drawText(sheet, name.replace('sprite_', '').replace('.png', ''), x + 8, y + 302, [184, 198, 193, 255], 1);
}

writePng(path.join(qaDir, 'ironwaste-v1-contact-sheet.png'), sheet);
process.stdout.write(`ironwaste-assets:${files.size}:256x256\n`);
