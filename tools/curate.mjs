/**
 * Kuratierung: kopiert den ausgewaehlten Starter-Tile-Satz aus den extrahierten Sheets
 * (docs/superpowers/assets/extracted/<sheet>/NNN.png) nach public/tiles/<name>.png mit
 * semantischen Namen. Vite serviert public/ -> Babylon laedt per '/tiles/<name>.png'.
 *
 * Tile-Wechsel = Index hier anpassen + neu laufen lassen (Galerie index.html zeigt die Indizes).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EX = path.join(ROOT, 'docs', 'superpowers', 'assets', 'extracted');
const OUT = path.join(ROOT, 'public', 'tiles');

// [Zielname, Sheet, Index]  — verifiziert ueber Montage + Manifest.
const PICKS = [
  // Boden (Sheet 8) — Theme-Palette, saubere ~100x100-Quadrate
  ['boden_beton', 8, 1],
  ['boden_asphalt', 8, 61],
  ['boden_moos', 8, 31],
  ['boden_rissig', 8, 50],
  ['boden_dreck', 8, 91],
  ['boden_kies', 8, 82],
  // Oedland-Pool fuer den Hauptboden (mehr erdige Varianten -> weniger Wiederholung im Bake)
  ['boden_erde', 8, 90],
  ['boden_schutt', 8, 96],
  ['boden_grus', 8, 84],
  ['boden_teer', 8, 64],
  // Strassen (Sheet 7) — Topologie-Kit (Orientierung einzeln verifiziert)
  ['road_gerade', 7, 3], // N-S
  ['road_kurve', 7, 12], // N+O
  ['road_t', 7, 21], // O+S+W (zu nach N)
  ['road_kreuz', 7, 31], // 4-Wege
  ['road_ende', 7, 40], // offen S
  // Decals (Sheet 9) — flache Alpha-Overlays
  ['decal_krater', 9, 4],
  ['decal_schutt', 9, 46],
];

fs.mkdirSync(OUT, { recursive: true });
let fehlt = 0;
for (const [name, sheet, index] of PICKS) {
  const src = path.join(EX, String(sheet), String(index).padStart(3, '0') + '.png');
  if (!fs.existsSync(src)) {
    console.error('FEHLT:', name, '<-', sheet + '/' + index, '(' + src + ')');
    fehlt++;
    continue;
  }
  fs.copyFileSync(src, path.join(OUT, name + '.png'));
  console.log(name.padEnd(16), '<-', sheet + '/' + index);
}
console.log(fehlt ? `\n${fehlt} fehlen!` : `\n${PICKS.length} Tiles -> ${OUT}`);
process.exitCode = fehlt ? 1 : 0;
