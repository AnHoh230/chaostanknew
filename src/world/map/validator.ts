/**
 * Spielbarkeits-Validierung der generierten Karte (Spec Sektion 3.2). Rein.
 * Fatale Befunde setzen valid=false; nicht-fatale landen nur in warnungen (Mapsmith zeigt sie).
 */
import type { KartenDaten, MapPath, Vec2 } from './mapTypes';

const PFLICHT = ['landmark', 'dormantNest', 'hazard', 'secretRamp', 'bonusIsland'] as const;

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function endpunktNahe(p: MapPath, ziel: Vec2, eps = 0.001): boolean {
  const a = p.punkte[0];
  const b = p.punkte[p.punkte.length - 1];
  return (Math.abs(a.x - ziel.x) < eps && Math.abs(a.z - ziel.z) < eps)
    || (Math.abs(b.x - ziel.x) < eps && Math.abs(b.z - ziel.z) < eps);
}

export function validiere(daten: KartenDaten): { valid: boolean; warnungen: string[] } {
  const warnungen: string[] = [];
  let valid = true;

  const kinds = new Set(daten.entities.map((e) => e.kind));
  for (const need of PFLICHT) {
    if (!kinds.has(need)) {
      valid = false;
      warnungen.push('Pflicht-Set-Piece fehlt: ' + need);
    }
  }

  for (const z of daten.zones) {
    const ok = daten.paths.some((p) => endpunktNahe(p, daten.spawn) && endpunktNahe(p, z.center));
    if (!ok) {
      valid = false;
      warnungen.push('Zone ohne Pfad: ' + z.id);
    }
  }

  const spawnFrei = 12;
  for (const e of daten.entities) {
    if (e.kind === 'bonusIsland' || e.kind === 'secretRamp') continue;
    if (dist(e.pos, daten.spawn) <= spawnFrei) warnungen.push('Entity im Spawn-Umkreis: ' + e.id);
  }

  return { valid, warnungen };
}
