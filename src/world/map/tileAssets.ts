/**
 * Zentrale Tile-Zuordnung fuer die Straßen-Topologie. URLs sind RELATIV (kein fuehrender Slash!): fallen unter Vite
 * base './' und GitHub-Pages-Unterpfaden (/<repo>/) korrekt auf — absolute "/tiles/..." zeigen auf
 * die Domain-Root und 404en dort. Tile tauschen = hier umbiegen (oder tools/curate.mjs).
 */
import type { RoadKind } from './roadTopology';

export const ROAD_TILE: Record<RoadKind, string> = {
  gerade: 'tiles/road_gerade.png',
  kurve: 'tiles/road_kurve.png',
  t: 'tiles/road_t.png',
  kreuz: 'tiles/road_kreuz.png',
  ende: 'tiles/road_ende.png',
};
