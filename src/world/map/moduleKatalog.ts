/**
 * Modul-Katalog: die hand-gemalten Bausteine, die der Stadt-Generator verteilt. Crude (Optik
 * folgt später), aber strukturell unterschiedlich — Depot/Industrie sind dicht, Mud/Crater/Ruinen
 * offen. Glyphen siehe muster.ts. Reine Daten; getestet wird, dass jedes Raster rechteckig ist.
 */
import type { ModulDef } from './muster';

const depot: ModulDef = {
  id: 'depot_m', rolle: 'major', theme: 'depot',
  rows: [
    '#..B....B..#',
    '#.o......o.#',
    '=....!.....=',
    '#....nn....#',
    '#.B......B.#',
    '#.o..XX..o.#',
    '#....**....#',
    '############',
  ],
  kosten: 8, wand: 'pattern',
  anschluesse: [{ seite: 'W', art: 'roadGate' }, { seite: 'O', art: 'roadGate' }],
  drehbar: true, spiegelbar: true, nestSlotsMax: 1, pickupSlotsMax: 1, hazardSlotsMax: 1,
};

const industrie: ModulDef = {
  id: 'industrie_m', rolle: 'major', theme: 'industrieHof',
  rows: [
    ',............,',
    '.BB..BB..BB...',
    '.BB..BB..BB...',
    '......!.......',
    '..X.......*...',
    '.BB..BB..BB...',
    '.BB..BB..BB...',
    ',....n......,.',
  ],
  kosten: 7, wand: 'none',
  anschluesse: [{ seite: 'N', art: 'road' }, { seite: 'S', art: 'road' }],
  drehbar: true, spiegelbar: true, nestSlotsMax: 1, pickupSlotsMax: 1, hazardSlotsMax: 1,
};

const mud: ModulDef = {
  id: 'mud_l', rolle: 'major', theme: 'schlammOede',
  rows: [
    ',............,',
    '...o....,.....',
    '.,.....o......',
    '......X.......',
    '..o.......,...',
    '.....!........',
    '...,....o.....',
    '......n.......',
    '.o........X...',
    ',.....*.....,.',
  ],
  kosten: 8, wand: 'none',
  anschluesse: [{ seite: 'W', art: 'dirtRoad' }, { seite: 'S', art: 'dirtRoad' }, { seite: 'O', art: 'dirtRoad' }],
  drehbar: true, spiegelbar: true, nestSlotsMax: 1, pickupSlotsMax: 1, hazardSlotsMax: 2,
};

const crater: ModulDef = {
  id: 'crater_l', rolle: 'major', theme: 'kraterFeld',
  rows: [
    ',............,',
    '..X.....X....,',
    '....o......X..',
    '.X....!!!.....',
    '......!!!.....',
    '..X...!!!..X..',
    '.....o....n...',
    '..X......o..X.',
    '....n....*....',
    ',....X......,.',
  ],
  kosten: 8, wand: 'none',
  anschluesse: [{ seite: 'S', art: 'road' }, { seite: 'W', art: 'dirtRoad' }],
  drehbar: true, spiegelbar: true, nestSlotsMax: 2, pickupSlotsMax: 1, hazardSlotsMax: 4,
};

const ruinen: ModulDef = {
  id: 'ruinen_l', rolle: 'major', theme: 'ruinenLos',
  rows: [
    ',............,',
    '..#...o....#..',
    '..#........#..',
    '....,..!......',
    '.o....##......',
    '......##...o..',
    '..n.......X...',
    '....o....,.t..',
    '.#.....o....#.',
    '....*....t...,',
  ],
  kosten: 8, wand: 'none',
  anschluesse: [{ seite: 'N', art: 'road' }, { seite: 'W', art: 'dirtRoad' }],
  drehbar: true, spiegelbar: true, nestSlotsMax: 1, pickupSlotsMax: 1, hazardSlotsMax: 2,
};

const checkpoint: ModulDef = {
  id: 'checkpoint_m', rolle: 'connector', theme: 'checkpoint',
  rows: [
    '...####...',
    '.==....==.',
    '...#!!#...',
    '...#..#...',
    '...#**#...',
    '.==.nn.==.',
    '...####...',
  ],
  kosten: 6, wand: 'pattern',
  anschluesse: [{ seite: 'N', art: 'roadGate' }, { seite: 'S', art: 'roadGate' }, { seite: 'O', art: 'roadGate' }, { seite: 'W', art: 'roadGate' }],
  drehbar: false, spiegelbar: false, nestSlotsMax: 1, pickupSlotsMax: 1, hazardSlotsMax: 0,
};

const fillerScrap: ModulDef = {
  id: 'filler_scrap_xs', rolle: 'filler', theme: 'any',
  rows: ['.o...', '..o,.', '.,...', '...o.', '..,..'],
  kosten: 1, wand: 'none', anschluesse: [], drehbar: true, spiegelbar: true,
};

const fillerBarrels: ModulDef = {
  id: 'filler_barrels_xs', rolle: 'filler', theme: 'any',
  rows: ['....', '.oo.', '.o,.', '....'],
  kosten: 1, wand: 'none', anschluesse: [], drehbar: true, spiegelbar: true,
};

/** Einkaufsliste in Prioritäts-Reihenfolge: Checkpoint = Hub (Index 0), dann Majors, dann Filler. */
export const MODUL_KATALOG: ModulDef[] = [
  checkpoint, depot, industrie, mud, crater, ruinen,
  fillerScrap, fillerBarrels, fillerScrap, fillerBarrels,
];
