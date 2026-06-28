/**
 * Deterministischer Karten-Generator (Spec Sektion 3.1): Zonen → Set-Pieces → Pfade →
 * Blue-Noise-Scatter → Validierung. Gleicher Seed + gleiches Rezept ⇒ identische KartenDaten.
 * Rein (nur core/rng), kein Engine-Bezug.
 */
import { createRng, type Rng } from '../../core/rng';
import type { KartenDaten, MapEntity, MapPath, Vec2, Zone, ZoneTheme, EntityKind } from './mapTypes';
import type { Rezept } from './recipe';
import { MAP_TUNING } from './mapTuning';
import { assetsByThemeCategory, getAsset, type AssetCategory, type AssetDef } from './assetKit';
import { validiere } from './validator';

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
function intIn(rng: Rng, [min, max]: [number, number]): number {
  return min + rng.int(max - min + 1);
}
function distPunktSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const len2 = vx * vx + vz * vz || 1;
  let t = ((p.x - a.x) * vx + (p.z - a.z) * vz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * vx), p.z - (a.z + t * vz));
}
function inZone(z: Zone, rng: Rng): Vec2 {
  const r = Math.sqrt(rng.next());
  const ang = rng.next() * Math.PI * 2;
  return { x: z.center.x + Math.cos(ang) * z.radiusX * r, z: z.center.z + Math.sin(ang) * z.radiusZ * r };
}
function wahl<T>(arr: T[], rng: Rng): T | undefined {
  return arr.length ? arr[rng.int(arr.length)] : undefined;
}
function kantenNormale(k: number): Vec2 {
  return k === 0 ? { x: 1, z: 0 } : k === 1 ? { x: -1, z: 0 } : k === 2 ? { x: 0, z: 1 } : { x: 0, z: -1 };
}
function kantenPunkt(ex: { halfX: number; halfZ: number }, k: number, rng: Rng): Vec2 {
  const ax = ex.halfX * 0.92;
  const az = ex.halfZ * 0.92;
  if (k === 0) return { x: ax, z: rng.range(-az * 0.5, az * 0.5) };
  if (k === 1) return { x: -ax, z: rng.range(-az * 0.5, az * 0.5) };
  if (k === 2) return { x: rng.range(-ax * 0.5, ax * 0.5), z: az };
  return { x: rng.range(-ax * 0.5, ax * 0.5), z: -az };
}
function gewichteteWahl(zonen: { theme: ZoneTheme; gewicht: number }[], rng: Rng): ZoneTheme {
  const sum = zonen.reduce((s, z) => s + z.gewicht, 0);
  let r = rng.next() * sum;
  for (const z of zonen) {
    r -= z.gewicht;
    if (r <= 0) return z.theme;
  }
  return zonen[zonen.length - 1].theme;
}
function waehleThemen(rezept: Rezept, anzahl: number, rng: Rng): ZoneTheme[] {
  const pool = rezept.zonen.map((z) => z.theme);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  const res: ZoneTheme[] = [];
  for (const t of pool) if (res.length < anzahl) res.push(t);
  while (res.length < anzahl) res.push(gewichteteWahl(rezept.zonen, rng));
  return res;
}
function platziereZonen(rezept: Rezept, rng: Rng): Zone[] {
  const anzahl = intIn(rng, rezept.zonenAnzahl);
  const themen = waehleThemen(rezept, anzahl, rng);
  const zones: Zone[] = [];
  const o: Vec2 = { x: 0, z: 0 };
  for (let i = 0; i < themen.length; i++) {
    const theme = themen[i];
    const [rmin, rmax] = MAP_TUNING.zoneRadius[theme] ?? [80, 100];
    let c: Vec2 = { x: 0, z: 0 };
    for (let t = 0; t < MAP_TUNING.maxPlatzierungsVersuche; t++) {
      c = {
        x: rng.range(-rezept.extents.halfX * 0.65, rezept.extents.halfX * 0.65),
        z: rng.range(-rezept.extents.halfZ * 0.65, rezept.extents.halfZ * 0.65),
      };
      if (dist(c, o) > 100 && zones.every((z) => dist(z.center, c) > 120)) break;
    }
    zones.push({ id: `zone_${i}_${theme}`, theme, center: c, radiusX: rng.range(rmin, rmax), radiusZ: rng.range(rmin, rmax) });
  }
  return zones;
}

export function generiere(rezept: Rezept, seed: number): KartenDaten {
  const rng = createRng(seed);
  let n = 0;
  const eid = (pfx: string): string => `${pfx}_${n++}`;
  const entities: MapEntity[] = [];
  const belegt: { pos: Vec2; footprint: number }[] = [];
  const extents = rezept.extents;
  const spawn: Vec2 = { x: 0, z: 0 };
  belegt.push({ pos: spawn, footprint: 12 }); // Spawn-Umkreis freihalten

  const rot = (): number => rng.range(-MAP_TUNING.rotJitter, MAP_TUNING.rotJitter);
  const sca = (): number => rng.range(MAP_TUNING.scaleJitter[0], MAP_TUNING.scaleJitter[1]);

  function pushEntity(kind: EntityKind, a: AssetDef, pos: Vec2, params?: MapEntity['params']): void {
    entities.push({ id: eid(kind), kind, asset: a.id, pos, rotY: rot(), scale: sca(), params });
    belegt.push({ pos, footprint: a.footprint });
  }
  function pushFest(kind: EntityKind, assetId: string, pos: Vec2, params?: MapEntity['params']): void {
    pushEntity(kind, getAsset(assetId), pos, params);
  }
  function kollidiert(p: Vec2, fp: number): boolean {
    return belegt.some((o) => dist(o.pos, p) < o.footprint + fp + rezept.minAbstand);
  }
  function aufPfad(p: Vec2, fp: number, paths: MapPath[]): boolean {
    return paths.some((pa) => distPunktSegment(p, pa.punkte[0], pa.punkte[pa.punkte.length - 1]) < pa.breite / 2 + fp + MAP_TUNING.pathClearance);
  }
  function findePlatz(z: Zone, footprint: number, paths: MapPath[]): Vec2 | null {
    for (let t = 0; t < MAP_TUNING.maxPlatzierungsVersuche; t++) {
      const p = inZone(z, rng);
      if (!kollidiert(p, footprint) && !aufPfad(p, footprint, paths)) return p;
    }
    return null;
  }
  function platzInAnnulus(c: Vec2, rmin: number, rmax: number, footprint: number): Vec2 | null {
    for (let t = 0; t < MAP_TUNING.maxPlatzierungsVersuche; t++) {
      const ang = rng.range(0, Math.PI * 2);
      const rad = rng.range(rmin, rmax);
      const p = { x: c.x + Math.cos(ang) * rad, z: c.z + Math.sin(ang) * rad };
      if (!kollidiert(p, footprint)) return p;
    }
    return null;
  }

  // 1. Zonen
  const zones = platziereZonen(rezept, rng);

  // 2. Set-Pieces: Landmark + Nester
  const turmZone = zones.find((z) => z.theme === 'funkturmZone') ?? zones[0];
  pushFest('landmark', 'funkturm', { x: turmZone.center.x, z: turmZone.center.z });

  const nestAnz = intIn(rng, rezept.nestAnzahl);
  for (let i = 0; i < nestAnz; i++) {
    const pos = platzInAnnulus(turmZone.center, 18, 40, 4) ?? inZone(turmZone, rng);
    pushFest('dormantNest', 'container', pos, { gegner: intIn(rng, MAP_TUNING.nestGegner) });
  }

  // 3. Secret: Rampe am Rand + Insel jenseits
  const kante = rng.int(4);
  const rampPos = kantenPunkt(extents, kante, rng);
  pushFest('secretRamp', 'sprungrampe', rampPos);
  const nrm = kantenNormale(kante);
  pushFest('bonusIsland', 'bonusinsel', { x: rampPos.x + nrm.x * 48, z: rampPos.z + nrm.z * 48 });

  // 4. Pfade: Spawn → jede Zone, Spawn → Rampe
  const paths: MapPath[] = [];
  for (const z of zones) paths.push({ id: eid('path'), punkte: [{ ...spawn }, { ...z.center }], breite: rezept.pfadBreite });
  paths.push({ id: eid('path'), punkte: [{ ...spawn }, { ...rampPos }], breite: rezept.pfadBreite });

  // 5. Hazards (pfad- und kollisionsbewusst)
  const hazZone = zones.find((z) => z.theme === 'pressWerk') ?? zones.find((z) => z.theme === 'wrackCluster') ?? zones[0];
  const hazAnz = intIn(rng, rezept.hazardAnzahl);
  for (let i = 0; i < hazAnz; i++) {
    const a = wahl(assetsByThemeCategory(hazZone.theme, 'hazard'), rng) ?? wahl(assetsByThemeCategory('pressWerk', 'hazard'), rng);
    if (!a) break;
    const pos = findePlatz(hazZone, a.footprint, paths) ?? inZone(hazZone, rng);
    pushEntity('hazard', a, pos, { dmgKey: String(a.defaultParams?.dmgKey ?? a.id) });
  }

  // 6. Scatter pro Zone
  for (const z of zones) {
    const regel = rezept.dichte.find((d) => d.theme === z.theme);
    if (!regel) continue;
    scatter(z, 'breakable', regel.breakables);
    scatter(z, 'obstacle', regel.obstacles);
    scatter(z, 'decor', regel.decor);
    scatter(z, 'pickup', regel.collectibles);
  }

  function scatter(z: Zone, cat: AssetCategory, bereich: [number, number]): void {
    const anzahl = intIn(rng, bereich);
    const kand = assetsByThemeCategory(z.theme, cat);
    if (kand.length === 0) return;
    for (let i = 0; i < anzahl; i++) {
      const a = kand[rng.int(kand.length)];
      const pos = findePlatz(z, a.footprint, paths);
      if (!pos) continue;
      const kind: EntityKind =
        cat === 'breakable' ? 'breakable' : cat === 'obstacle' ? 'obstacle' : cat === 'pickup' ? 'collectible' : 'decor';
      let params: MapEntity['params'];
      if (cat === 'breakable') params = { hpKey: String(a.defaultParams?.hpKey ?? a.id) };
      else if (cat === 'pickup') params = { effekt: String(a.defaultParams?.effekt ?? 'heal') };
      pushEntity(kind, a, pos, params);
    }
  }

  const daten: KartenDaten = {
    rezeptId: rezept.id,
    seed,
    biomeId: rezept.biomeId,
    extents,
    spawn,
    zones,
    paths,
    entities,
    valid: false,
    warnungen: [],
  };
  const v = validiere(daten);
  daten.valid = v.valid;
  daten.warnungen = v.warnungen;
  return daten;
}
