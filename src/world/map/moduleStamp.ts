/**
 * Modul-Stempel (Generator-Hirn, Schritt 2): macht aus einem platzierten Modul konkrete
 * MapEntities. Liest das (transformierte) Raster Zelle für Zelle, löst jeden Prop-Glyph über
 * das THEMA in ein echtes Asset auf und setzt ihn an die Welt-Zellmitte. `n`/`*`/Hazard laufen
 * durch das Cap-Gate (Slots, nicht garantiert). Rein, deterministisch (geteilte rng), getestet.
 */
import type { MapEntity, EntityKind } from './mapTypes';
import { parseMuster, transform, glyphArt, zelleBei, type ZellArt } from './muster';
import type { Platzierung } from './modulePlacement';
import type { Rng } from '../../core/rng';
import type { SlotGate } from './moduleCaps';

type AufloesungMap = Partial<Record<ZellArt, string[]>>;

// Glyph-Art -> echte Asset-Ids des Kits (crude, themenneutral; Themen-Tönung später).
const DEFAULT_ASSETS: AufloesungMap = {
  wand: ['betonblock'],
  cargo: ['container', 'rohrstapel'],
  breakable: ['fass', 'kiste', 'schrotthaufen'],
  hazard: ['presse', 'giftpfuetze', 'stachelgrube'],
  fokus: ['funkturm'],
  nest: ['container'],
  pickup: ['fund_huhn', 'fund_schraube', 'fund_kanister'],
  deko: ['truemmer', 'reifenstapel', 'verkehrskegel', 'pfuetze'],
  baum: ['truemmer'],
};

const THEMA_ASSETS: Record<string, AufloesungMap> = {
  default: DEFAULT_ASSETS,
};

const KIND: Partial<Record<ZellArt, EntityKind>> = {
  wand: 'obstacle', cargo: 'obstacle', breakable: 'breakable',
  hazard: 'hazard', fokus: 'landmark', nest: 'dormantNest',
  pickup: 'collectible', deko: 'decor', baum: 'decor',
};

export function stempleModul(p: Platzierung, cs: number, idx: number, rng: Rng, gate: SlotGate): MapEntity[] {
  const g = transform(parseMuster(p.def.rows), p.rot, p.mirror);
  const topLeftX = p.cx - (g.w * cs) / 2;
  const topLeftZ = p.cz - (g.h * cs) / 2;
  const auf = THEMA_ASSETS[p.def.theme] ?? DEFAULT_ASSETS;
  const ents: MapEntity[] = [];
  let seq = 0;

  for (let row = 0; row < g.h; row++) {
    for (let col = 0; col < g.w; col++) {
      const art = glyphArt(zelleBei(g, col, row));
      const kind = KIND[art];
      if (!kind) continue; // Boden/Tor/Strasse/leer -> kein Prop
      if (art === 'nest' && !gate.nest()) continue;
      if (art === 'pickup' && !gate.pickup()) continue;
      if (art === 'hazard' && !gate.hazard()) continue;
      const liste = auf[art] ?? DEFAULT_ASSETS[art];
      if (!liste || liste.length === 0) continue;
      const asset = liste[rng.int(liste.length)]!;
      const e: MapEntity = {
        id: `m${idx}_${seq++}`,
        kind,
        asset,
        pos: { x: topLeftX + (col + 0.5) * cs, z: topLeftZ + (row + 0.5) * cs },
        rotY: rng.range(-Math.PI, Math.PI),
        scale: rng.range(0.85, 1.2),
      };
      if (kind === 'hazard') e.params = { dmgKey: asset };
      else if (kind === 'breakable') e.params = { hpKey: asset };
      else if (kind === 'collectible') e.params = { effekt: 'heal' };
      else if (kind === 'dormantNest') e.params = { gegner: 3 };
      ents.push(e);
    }
  }
  return ents;
}
