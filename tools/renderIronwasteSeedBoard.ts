import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from '../src/world/map/worldGenerator';
import type { BiomeId, GenerierteWelt } from '../src/world/map/worldTypes';
import { PNG, drawLine, drawText, fillRect, writePng } from './pngDrawing.mjs';

const PANEL_WIDTH = 500;
const PANEL_HEIGHT = 420;
const TITLE_HEIGHT = 24;
const BOARD_WIDTH = PANEL_WIDTH * 2;
const BOARD_HEIGHT = PANEL_HEIGHT * 2;
const SEEDS = [17, 42, 1337, 9001];

const BIOME_COLORS: Record<BiomeId, [number, number, number, number]> = {
  wasteland: [68, 64, 56, 255],
  scrap: [91, 56, 36, 255],
  industrial: [76, 84, 87, 255],
  mud: [62, 51, 37, 255],
  ruins: [83, 83, 76, 255],
  crater: [48, 46, 45, 255],
};

function project(world: GenerierteWelt, x: number, z: number, panelX: number, panelY: number): [number, number] {
  const px = panelX + ((x + world.extents.halfX) / (world.extents.halfX * 2)) * PANEL_WIDTH;
  const py = panelY + TITLE_HEIGHT + ((z + world.extents.halfZ) / (world.extents.halfZ * 2)) * (PANEL_HEIGHT - TITLE_HEIGHT);
  return [px, py];
}

function renderWorld(board: PNG, world: GenerierteWelt, panelX: number, panelY: number): void {
  fillRect(board, panelX, panelY, PANEL_WIDTH, PANEL_HEIGHT, [25, 29, 30, 255]);
  const grid = world.regions.grid;
  const cellWidth = PANEL_WIDTH / grid.cols;
  const cellHeight = (PANEL_HEIGHT - TITLE_HEIGHT) / grid.rows;
  for (let cell = 0; cell < world.regions.biomeByCell.length; cell++) {
    const col = cell % grid.cols;
    const row = Math.floor(cell / grid.cols);
    fillRect(
      board,
      panelX + col * cellWidth,
      panelY + TITLE_HEIGHT + row * cellHeight,
      Math.ceil(cellWidth + 0.2),
      Math.ceil(cellHeight + 0.2),
      BIOME_COLORS[world.regions.biomeByCell[cell]!],
    );
  }

  for (const corridor of world.corridors) {
    for (let index = 1; index < corridor.centerline.length; index++) {
      const a = corridor.centerline[index - 1]!;
      const b = corridor.centerline[index]!;
      const [ax, ay] = project(world, a.x, a.z, panelX, panelY);
      const [bx, by] = project(world, b.x, b.z, panelX, panelY);
      const width = Math.max(3, Math.round(corridor.width * PANEL_WIDTH / (world.extents.halfX * 2)));
      drawLine(board, ax, ay, bx, by, [43, 47, 48, 255], width + 3);
      drawLine(board, ax, ay, bx, by, [91, 94, 91, 255], width);
    }
  }

  for (const feature of world.features) {
    const [x, y] = project(world, feature.position.x, feature.position.z, panelX, panelY);
    const width = Math.max(2, feature.footprint.halfX * 2 * PANEL_WIDTH / (world.extents.halfX * 2));
    const height = Math.max(2, feature.footprint.halfZ * 2 * (PANEL_HEIGHT - TITLE_HEIGHT) / (world.extents.halfZ * 2));
    const color: [number, number, number, number] = feature.biomeId === 'industrial'
      ? [46, 58, 61, 220]
      : feature.biomeId === 'scrap'
        ? [151, 71, 35, 220]
        : [35, 39, 40, 190];
    fillRect(board, x - width / 2, y - height / 2, width, height, color);
  }

  for (const site of world.sites) {
    const [x, y] = project(world, site.center.x, site.center.z, panelX, panelY);
    fillRect(board, x - 3, y - 3, 7, 7, [61, 156, 165, 255]);
  }

  const activeBiomes = [...new Set(world.regions.biomeByCell)].length;
  drawText(
    board,
    `SEED ${world.seed} BIOMES ${activeBiomes} SITES ${world.sites.length} FEATURES ${world.features.length}`,
    panelX + 8,
    panelY + 5,
    [232, 230, 213, 255],
    1,
  );
}

const board = new PNG({ width: BOARD_WIDTH, height: BOARD_HEIGHT });
fillRect(board, 0, 0, BOARD_WIDTH, BOARD_HEIGHT, [16, 19, 20, 255]);
for (let index = 0; index < SEEDS.length; index++) {
  const world = generiereWelt(DEFAULT_WORLD_OPTIONS, SEEDS[index]!);
  renderWorld(board, world, (index % 2) * PANEL_WIDTH, Math.floor(index / 2) * PANEL_HEIGHT);
}

const outputDir = path.resolve(process.cwd(), 'docs/superpowers/assets');
fs.mkdirSync(outputDir, { recursive: true });
writePng(path.join(outputDir, 'ironwaste-v1-seed-board.png'), board);
process.stdout.write(`ironwaste-seed-board:${SEEDS.join(',')}:${BOARD_WIDTH}x${BOARD_HEIGHT}\n`);
