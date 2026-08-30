import fs from 'node:fs';
import { PNG } from 'pngjs';

const FONT = {
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'],
  '.': ['00000','00000','00000','00000','00000','01100','01100'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'],
  '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00010','00100','01000','11111'],
  '3': ['11110','00001','00001','01110','00001','00001','11110'],
  '4': ['00010','00110','01010','10010','11111','00010','00010'],
  '5': ['11111','10000','10000','11110','00001','00001','11110'],
  '6': ['01110','10000','10000','11110','10001','10001','01110'],
  '7': ['11111','00001','00010','00100','01000','01000','01000'],
  '8': ['01110','10001','10001','01110','10001','10001','01110'],
  '9': ['01110','10001','10001','01111','00001','00001','01110'],
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  C: ['01111','10000','10000','10000','10000','10000','01111'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  F: ['11111','10000','10000','11110','10000','10000','10000'],
  G: ['01111','10000','10000','10111','10001','10001','01111'],
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  I: ['01110','00100','00100','00100','00100','00100','01110'],
  J: ['00001','00001','00001','00001','10001','10001','01110'],
  K: ['10001','10010','10100','11000','10100','10010','10001'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  N: ['10001','11001','10101','10011','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
  V: ['10001','10001','10001','10001','10001','01010','00100'],
  W: ['10001','10001','10001','10101','10101','10101','01010'],
  X: ['10001','10001','01010','00100','01010','10001','10001'],
  Y: ['10001','10001','01010','00100','00100','00100','00100'],
  Z: ['11111','00001','00010','00100','01000','10000','11111'],
};

export function setPixel(png, x, y, rgba) {
  const px = Math.round(x), py = Math.round(y);
  if (px < 0 || py < 0 || px >= png.width || py >= png.height) return;
  const index = (py * png.width + px) * 4;
  png.data[index] = rgba[0];
  png.data[index + 1] = rgba[1];
  png.data[index + 2] = rgba[2];
  png.data[index + 3] = rgba[3] ?? 255;
}

export function fillRect(png, x, y, width, height, rgba) {
  for (let py = Math.max(0, Math.floor(y)); py < Math.min(png.height, Math.ceil(y + height)); py++) {
    for (let px = Math.max(0, Math.floor(x)); px < Math.min(png.width, Math.ceil(x + width)); px++) {
      setPixel(png, px, py, rgba);
    }
  }
}

export function blendPixel(png, x, y, rgba) {
  const px = Math.round(x), py = Math.round(y);
  if (px < 0 || py < 0 || px >= png.width || py >= png.height) return;
  const index = (py * png.width + px) * 4;
  const alpha = (rgba[3] ?? 255) / 255;
  const inverse = 1 - alpha;
  png.data[index] = Math.round(rgba[0] * alpha + png.data[index] * inverse);
  png.data[index + 1] = Math.round(rgba[1] * alpha + png.data[index + 1] * inverse);
  png.data[index + 2] = Math.round(rgba[2] * alpha + png.data[index + 2] * inverse);
  png.data[index + 3] = 255;
}

export function blit(target, source, offsetX, offsetY, scale = 1) {
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const index = (y * source.width + x) * 4;
      const rgba = [source.data[index], source.data[index + 1], source.data[index + 2], source.data[index + 3]];
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) blendPixel(target, offsetX + x * scale + sx, offsetY + y * scale + sy, rgba);
      }
    }
  }
}

export function drawLine(png, x0, y0, x1, y1, rgba, width = 1) {
  const distance = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
  const steps = Math.ceil(distance * 1.5);
  const radius = Math.max(0, Math.floor(width / 2));
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius + 0.5) blendPixel(png, x + dx, y + dy, rgba);
      }
    }
  }
}

export function drawText(png, text, x, y, rgba = [235, 235, 225, 255], scale = 2) {
  let cursor = x;
  for (const raw of text.toUpperCase()) {
    const glyph = FONT[raw] ?? FONT[' '];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] !== '1') continue;
        fillRect(png, cursor + col * scale, y + row * scale, scale, scale, rgba);
      }
    }
    cursor += 6 * scale;
  }
}

export function readPng(path) {
  return PNG.sync.read(fs.readFileSync(path));
}

export function writePng(path, png) {
  fs.writeFileSync(path, PNG.sync.write(png));
}

export { PNG };
