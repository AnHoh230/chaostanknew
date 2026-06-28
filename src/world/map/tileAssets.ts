/**
 * Zentrale Tile-Zuordnung (eine Quelle der Wahrheit): Modul-Theme -> Bodentextur und
 * Straßen-Topologie-Art -> Textur. URLs zeigen auf public/tiles/ (von Vite serviert, von Babylon
 * per URL geladen). Tile tauschen = hier umbiegen (oder tools/curate.mjs neu kuratieren).
 */
import type { RoadKind } from './roadTopology';

// Nahtlos gebackene Theme-Böden (tools/bakeGround.mjs) — kein Vierecke-Raster mehr.
const BODEN_THEME_TILE: Record<string, string> = {
  checkpoint: '/tiles/boden_t_beton.png',
  depot: '/tiles/boden_t_beton.png',
  industrieHof: '/tiles/boden_t_asphalt.png',
  schlammOede: '/tiles/boden_t_dreck.png',
  kraterFeld: '/tiles/boden_t_rissig.png',
  ruinenLos: '/tiles/boden_t_moos.png',
  any: '/tiles/boden_t_kies.png',
};
const BODEN_DEFAULT = '/tiles/boden_basis.png';

export function bodenFuerTheme(theme: string): string {
  return BODEN_THEME_TILE[theme] ?? BODEN_DEFAULT;
}

export const ROAD_TILE: Record<RoadKind, string> = {
  gerade: '/tiles/road_gerade.png',
  kurve: '/tiles/road_kurve.png',
  t: '/tiles/road_t.png',
  kreuz: '/tiles/road_kreuz.png',
  ende: '/tiles/road_ende.png',
};
