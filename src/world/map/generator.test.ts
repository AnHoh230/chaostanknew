import { describe, it, expect } from 'vitest';
import { generiere } from './generator';
import { getRezept } from './recipe';
import type { KartenDaten, Vec2 } from './mapTypes';

const R = getRezept('schrottfeld');

function naheBei(a: Vec2, b: Vec2, eps = 0.001): boolean {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.z - b.z) < eps;
}
function kinds(d: KartenDaten): Set<string> {
  return new Set(d.entities.map((e) => e.kind));
}

describe('Generator (Phase 2)', () => {
  it('ist deterministisch: gleicher Seed → identische Karte', () => {
    expect(generiere(R, 4242)).toEqual(generiere(R, 4242));
  });

  it('verschiedene Seeds → andere Layouts', () => {
    const a = generiere(R, 1);
    const b = generiere(R, 2);
    expect(JSON.stringify(a.entities)).not.toBe(JSON.stringify(b.entities));
  });

  it('enthält alle Pflicht-Set-Pieces', () => {
    const k = kinds(generiere(R, 7));
    for (const need of ['landmark', 'dormantNest', 'hazard', 'secretRamp', 'bonusIsland']) {
      expect(k.has(need), `fehlt: ${need}`).toBe(true);
    }
  });

  it('erzeugt die geforderte Zonen-Anzahl', () => {
    const d = generiere(R, 11);
    expect(d.zones.length).toBeGreaterThanOrEqual(R.zonenAnzahl[0]);
    expect(d.zones.length).toBeLessThanOrEqual(R.zonenAnzahl[1]);
  });

  it('Pfade verbinden den Spawn mit jedem Zonenzentrum', () => {
    const d = generiere(R, 13);
    for (const z of d.zones) {
      const verbunden = d.paths.some((p) => {
        const a = p.punkte[0];
        const b = p.punkte[p.punkte.length - 1];
        return (
          (naheBei(a, d.spawn) && naheBei(b, z.center)) ||
          (naheBei(b, d.spawn) && naheBei(a, z.center))
        );
      });
      expect(verbunden, `Zone ${z.id} nicht verbunden`).toBe(true);
    }
  });

  it('hält Entities innerhalb der Karten-Region (Insel/Rampe ausgenommen)', () => {
    const d = generiere(R, 17);
    const grenzeX = d.extents.halfX + 60;
    const grenzeZ = d.extents.halfZ + 60;
    for (const e of d.entities) {
      if (e.kind === 'bonusIsland' || e.kind === 'secretRamp') continue;
      expect(Math.abs(e.pos.x), e.id).toBeLessThanOrEqual(grenzeX);
      expect(Math.abs(e.pos.z), e.id).toBeLessThanOrEqual(grenzeZ);
    }
  });

  it('keine exakt gestapelten Entities (Mindestabstand)', () => {
    const d = generiere(R, 19);
    const es = d.entities.filter((e) => e.kind !== 'bonusIsland');
    for (let i = 0; i < es.length; i++) {
      for (let j = i + 1; j < es.length; j++) {
        const dist = Math.hypot(es[i].pos.x - es[j].pos.x, es[i].pos.z - es[j].pos.z);
        expect(dist, `${es[i].id} ~ ${es[j].id}`).toBeGreaterThan(0.5);
      }
    }
  });

  it('Spawn-Umkreis ist frei von Entities', () => {
    const d = generiere(R, 21);
    for (const e of d.entities) {
      if (e.kind === 'bonusIsland' || e.kind === 'secretRamp') continue;
      expect(Math.hypot(e.pos.x - d.spawn.x, e.pos.z - d.spawn.z), e.id).toBeGreaterThan(12);
    }
  });

  it('Validierung besteht für das Standard-Rezept', () => {
    expect(generiere(R, 23).valid).toBe(true);
  });
});
