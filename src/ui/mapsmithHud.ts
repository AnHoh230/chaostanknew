import type { GenerierteWelt } from '../world/map/worldTypes';
import {
  DEBUG_LAYERS,
  projectWorldDebug,
  type DebugLayer,
  type DebugPrimitives,
} from '../world/map/worldDebugProjection';

export interface HybridMapsmithInfo {
  generatorId: 'hybrid';
  seed: number;
  layer: DebugLayer;
  world: GenerierteWelt;
}

interface LegacyMapsmithInfo {
  rezeptId: string;
  seed: number;
  valid: boolean;
  warnungen: string[];
  entities: number;
}

export interface MapsmithHud {
  setSichtbar(v: boolean): void;
  setLayer(layer: DebugLayer): void;
  update(info: HybridMapsmithInfo | LegacyMapsmithInfo): void;
}

function colorFor(category: string, alpha = 0.72): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < category.length; index++) hash = Math.imul(hash ^ category.charCodeAt(index), 0x01000193);
  const hue = (hash >>> 0) % 360;
  return `hsla(${hue},72%,58%,${alpha})`;
}

function drawDebug(canvas: HTMLCanvasElement, world: GenerierteWelt, debug: DebugPrimitives): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111820';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const sx = canvas.width / (world.extents.halfX * 2);
  const sz = canvas.height / (world.extents.halfZ * 2);
  const project = (x: number, z: number): [number, number] => [
    (x + world.extents.halfX) * sx,
    canvas.height - (z + world.extents.halfZ) * sz,
  ];

  for (const cell of debug.cells) {
    const col = cell.cell % cell.grid.cols, row = Math.floor(cell.cell / cell.grid.cols);
    const x = -cell.grid.extents.halfX + col * cell.grid.cellSize;
    const z = -cell.grid.extents.halfZ + row * cell.grid.cellSize;
    const [px, py] = project(x, z + cell.grid.cellSize);
    ctx.fillStyle = colorFor(cell.category, cell.value === undefined ? 0.65 : Math.max(0.08, cell.value));
    ctx.fillRect(px, py, Math.ceil(cell.grid.cellSize * sx), Math.ceil(cell.grid.cellSize * sz));
  }
  for (const line of debug.lines) {
    if (line.points.length < 2) continue;
    ctx.beginPath();
    line.points.forEach((point, index) => {
      const [x, y] = project(point.x, point.z);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = colorFor(line.category, 0.9);
    ctx.lineWidth = Math.max(1, line.width * Math.min(sx, sz));
    ctx.stroke();
  }
  for (const point of debug.points) {
    const [x, y] = project(point.pos.x, point.pos.z);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, point.radius * Math.min(sx, sz)), 0, Math.PI * 2);
    ctx.fillStyle = colorFor(point.category, 0.8);
    ctx.fill();
  }
  ctx.fillStyle = '#ffe0a8';
  ctx.font = '10px system-ui,sans-serif';
  debug.labels.slice(0, 18).forEach((label, index) => ctx.fillText(label.text, 5, 13 + index * 12));
}

export function createMapsmithHud(onLayerChange?: (layer: DebugLayer) => void): MapsmithHud {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;left:12px;bottom:12px;z-index:70;width:380px;' +
    'background:#0d141cf2;border:1px solid #e8b53a;border-radius:8px;padding:10px 12px;' +
    'font:600 12px system-ui,sans-serif;color:#ffe0a8;display:none;';
  const summary = document.createElement('div');
  const select = document.createElement('select');
  select.style.cssText = 'width:100%;margin:6px 0;background:#17222d;color:#ffe0a8;border:1px solid #52606d;padding:4px;';
  DEBUG_LAYERS.forEach((layer) => {
    const option = document.createElement('option');
    option.value = layer;
    option.textContent = layer;
    select.appendChild(option);
  });
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 288;
  canvas.style.cssText = 'display:block;width:360px;height:288px;border:1px solid #33414d;background:#111820;';
  const help = document.createElement('div');
  help.style.cssText = 'color:#8a9aa8;margin-top:6px';
  help.textContent = '[G] reroll · [C] Seed kopieren · [M] schließen';
  el.append(summary, select, canvas, help);
  document.body.appendChild(el);
  let latestWorld: GenerierteWelt | undefined;

  select.addEventListener('change', () => {
    const layer = select.value as DebugLayer;
    if (latestWorld) drawDebug(canvas, latestWorld, projectWorldDebug(latestWorld, layer));
    onLayerChange?.(layer);
  });

  return {
    setSichtbar(v: boolean): void { el.style.display = v ? 'block' : 'none'; },
    setLayer(layer: DebugLayer): void {
      select.value = layer;
      if (latestWorld) drawDebug(canvas, latestWorld, projectWorldDebug(latestWorld, layer));
    },
    update(info): void {
      if ('world' in info) {
        latestWorld = info.world;
        select.value = info.layer;
        const failures = info.world.debug.validation.hardFailures.length;
        summary.textContent = `🛠 MAPSMITH · ${info.generatorId} · Seed ${info.seed} · ${info.world.features.length} Features · ${failures === 0 ? 'valide' : `${failures} Fehler`}`;
        drawDebug(canvas, info.world, projectWorldDebug(info.world, info.layer));
      } else {
        summary.textContent = `🛠 MAPSMITH · ${info.rezeptId} · Seed ${info.seed} · ${info.entities} Entities · ${info.valid ? 'valide' : info.warnungen.join(', ')}`;
      }
    },
  };
}
