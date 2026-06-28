import { projectBlip } from './minimapMath';
import { nearestToPointer, type ScreenBlip } from '../inspect/enemyPick';
import { createFog } from '../world/map/fogOfWar';

export interface MapBlip {
  id?: string; // nur Panzer (für Hover); Shop-Felder ohne id
  x: number;
  z: number;
  color: string;
  r?: number;
  name?: string;
  sub?: string; // "Lvl 4 · MK2"
  hpFrac?: number;
  poi?: boolean; // Orientierungspunkt (Wahrzeichen/Rampe/Insel) -> Raute + Dauer-Label, anklickbar als Ziel
}

export interface Waypoint {
  x: number;
  z: number;
  name: string;
}

export interface OverviewMap {
  toggle(): void;
  isOpen(): boolean;
  update(
    playerX: number,
    playerZ: number,
    heading: number,
    blips: readonly MapBlip[],
    pointerX: number,
    pointerY: number,
  ): void;
  revealAt(x: number, z: number, radius: number): void; // Kriegsnebel um die Spielerposition lüften
  resetFog(): void; // neue Karte = wieder alles verhüllt
  setWaypoint(wp: Waypoint | null): void; // aktuelles Ziel (zum Zeichnen) setzen/löschen
  onWaypointPick(fn: (wp: Waypoint | null) => void): void; // Klick auf der Karte wählt/löscht ein Ziel
}

const SIZE = 520; // Pixel-Kantenlänge der großen Karte

/**
 * Große Echtzeit-Übersichtskarte (Taste M) — zeigt das GANZE Feld (ursprungszentriert):
 * Schrottplatz-Props, Gegner und der Spieler als Marker MIT Blickrichtung, plus Feld-Grenze
 * und Kriegsnebel. Orientierungspunkte sind Rauten mit Namen; ein Klick setzt sie als Wegpunkt
 * (Distanz im Tooltip), Rechtsklick löscht ihn. Welt läuft weiter; Canvas (kein DOM pro Punkt).
 *
 * @param range  Welt-Radius, der ins Bild passt (auf die Karten-Extents abgestimmt).
 * @param extentX/extentZ  halbe Feldgröße → zeichnet die Grenze (wo der Schrottplatz endet).
 */
export function createOverviewMap(range = 150, extentX = 0, extentZ = 0): OverviewMap {
  const RANGE = range;
  const fog = createFog(RANGE, RANGE, 16); // Kriegsnebel-Raster über das ganze Kartenbild
  let open = false;
  let waypoint: Waypoint | null = null;
  let pickFn: (wp: Waypoint | null) => void = () => {};
  // Zuletzt gezeichnete Blips mit Pixel-Position — für die Klick-Auswahl (nächster Treffer).
  let lastDrawn: { x: number; z: number; name: string; px: number; py: number; poi: boolean }[] = [];

  const cv = document.createElement('canvas');
  cv.width = SIZE;
  cv.height = SIZE;
  cv.id = 'overview-map';
  cv.className = 'hud-cc'; // UI-Scale: bildschirmmittig; translate(-50%,-50%) + scale via Klasse
  cv.style.cssText =
    'position:fixed;left:50%;top:50%;display:none;z-index:30;cursor:crosshair;' +
    'border:2px solid #2a343b;border-radius:10px;background:rgba(8,12,10,0.86);' +
    'box-shadow:0 12px 40px rgba(0,0,0,0.55);';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');

  const tip = document.createElement('div');
  tip.style.cssText =
    'position:fixed;z-index:31;display:none;pointer-events:none;min-width:120px;' +
    'background:rgba(10,14,18,0.95);border:1px solid #2a343b;border-radius:7px;padding:7px 9px;' +
    'font:600 11px system-ui,sans-serif;color:#cdd6dd;text-shadow:0 1px 2px #000;';
  document.body.appendChild(tip);

  function dot(x: number, y: number, r: number, color: string): void {
    if (!ctx) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function raute(x: number, y: number, r: number, color: string): void {
    if (!ctx) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = color;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.strokeStyle = '#0b0f0d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  // Klick → Welt-Koordinate (Umkehrung von projectBlip mit Ursprung 0,0).
  function pixelZuWelt(pxCanvas: number, pyCanvas: number): { x: number; z: number } {
    const half = SIZE / 2;
    return { x: ((pxCanvas - half) / half) * RANGE, z: ((half - pyCanvas) / half) * RANGE };
  }
  function klickPixel(ev: MouseEvent): { x: number; y: number } {
    const rect = cv.getBoundingClientRect();
    return { x: ((ev.clientX - rect.left) / rect.width) * SIZE, y: ((ev.clientY - rect.top) / rect.height) * SIZE };
  }
  cv.addEventListener('mousedown', (ev) => {
    if (!open) return;
    if (ev.button === 2) { waypoint = null; pickFn(null); return; } // Rechtsklick: Ziel löschen
    if (ev.button !== 0) return;
    const p = klickPixel(ev);
    // Nächster benannter Orientierungspunkt unter dem Klick? Sonst freie Markierung am Klickpunkt.
    let best: { x: number; z: number; name: string } | null = null;
    let bestD = 20;
    for (const d of lastDrawn) {
      if (!d.poi && !d.name) continue;
      const dd = Math.hypot(d.px - p.x, d.py - p.y);
      if (dd < bestD) { bestD = dd; best = { x: d.x, z: d.z, name: d.name || 'Ziel' }; }
    }
    const w = pixelZuWelt(p.x, p.y);
    waypoint = best ?? { x: w.x, z: w.z, name: 'Markierung' };
    pickFn(waypoint);
  });
  cv.addEventListener('contextmenu', (ev) => ev.preventDefault()); // Rechtsklick = löschen, kein Browser-Menü

  function update(
    px: number,
    pz: number,
    heading: number,
    blips: readonly MapBlip[],
    pointerX: number,
    pointerY: number,
  ): void {
    if (!open || !ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    lastDrawn = [];

    // Kriegsnebel: erkundete Zellen heller einfärben; Unerkundetes bleibt der dunkle Hintergrund.
    const cellPx = (fog.cellSize / RANGE) * (SIZE / 2);
    ctx.fillStyle = 'rgba(120,150,130,0.13)';
    for (let c = 0; c < fog.cols; c++) {
      for (let r = 0; r < fog.rows; r++) {
        if (!fog.istZelleEnthuellt(c, r)) continue;
        const zc = fog.zelleZentrum(c, r);
        const p = projectBlip(0, 0, zc.x, zc.z, RANGE, SIZE);
        ctx.fillRect(p.x - cellPx / 2, p.y - cellPx / 2, cellPx + 1, cellPx + 1);
      }
    }

    // Fadenkreuz
    ctx.strokeStyle = 'rgba(140,160,150,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SIZE / 2, 14);
    ctx.lineTo(SIZE / 2, SIZE - 14);
    ctx.moveTo(14, SIZE / 2);
    ctx.lineTo(SIZE - 14, SIZE / 2);
    ctx.stroke();

    // Feld-Grenze: wo der Schrottplatz endet (ursprungszentriert).
    if (extentX > 0 && extentZ > 0) {
      const tl = projectBlip(0, 0, -extentX, extentZ, RANGE, SIZE);
      const br = projectBlip(0, 0, extentX, -extentZ, RANGE, SIZE);
      ctx.strokeStyle = 'rgba(150,180,160,0.32)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    }

    // Spieler-Pixel (für Wegpunkt-Linie + Marker), am Rand geklemmt falls außerhalb.
    const pp = projectBlip(0, 0, px, pz, RANGE, SIZE);
    const pcx = Math.max(8, Math.min(SIZE - 8, pp.x));
    const pcy = Math.max(8, Math.min(SIZE - 8, pp.y));

    // Wegpunkt: Linie Spieler → Ziel + Raute (immer sichtbar, auch im Nebel).
    if (waypoint) {
      const wp = projectBlip(0, 0, waypoint.x, waypoint.z, RANGE, SIZE);
      ctx.strokeStyle = 'rgba(255,224,138,0.5)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pcx, pcy);
      ctx.lineTo(wp.x, wp.y);
      ctx.stroke();
      ctx.setLineDash([]);
      raute(wp.x, wp.y, 6, '#ffe08a');
    }

    // Alle Blips ursprungszentriert (ganzes Feld sichtbar) + Screen-Positionen für Hover.
    const rect = cv.getBoundingClientRect();
    const screenBlips: ScreenBlip[] = [];
    for (const b of blips) {
      if (!fog.istEnthuellt(b.x, b.z)) continue; // noch im Nebel → verborgen
      const p = projectBlip(0, 0, b.x, b.z, RANGE, SIZE);
      if (!p.inRange) continue;
      if (b.poi) {
        raute(p.x, p.y, (b.r ?? 4) + 1, b.color);
        if (b.name) {
          ctx.fillStyle = 'rgba(225,232,225,0.9)';
          ctx.font = '700 9px system-ui,sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(b.name, p.x, p.y - (b.r ?? 4) - 4);
          ctx.textAlign = 'left';
        }
      } else {
        dot(p.x, p.y, b.r ?? 4, b.color);
      }
      lastDrawn.push({ x: b.x, z: b.z, name: b.name ?? '', px: p.x, py: p.y, poi: !!b.poi });
      if (b.id) screenBlips.push({ id: b.id, sx: rect.left + p.x, sy: rect.top + p.y });
    }

    // Spieler-Marker MIT Blickrichtungs-Kegel (forward = (sin,cos) → +Z ist oben/Norden).
    {
      const fx = Math.sin(heading), fz = Math.cos(heading); // Welt-Vorwärts
      const dx = fx, dy = -fz; // Karten-Pixel (+Z = oben)
      const L = 15, W = 7;
      const px2 = -dy, py2 = dx; // Quer-Vektor
      ctx.fillStyle = 'rgba(223,238,222,0.35)';
      ctx.beginPath();
      ctx.moveTo(pcx + dx * L, pcy + dy * L);
      ctx.lineTo(pcx + px2 * W, pcy + py2 * W);
      ctx.lineTo(pcx - px2 * W, pcy - py2 * W);
      ctx.closePath();
      ctx.fill();
      dot(pcx, pcy, 6, '#dfeede');
      ctx.strokeStyle = '#0b0f0d'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(pcx, pcy, 6, 0, Math.PI * 2); ctx.stroke();
    }

    // Hover-Tooltip am Cursor (mit Distanz Spieler → Blip).
    const hoveredId = nearestToPointer(pointerX, pointerY, screenBlips, 16);
    const hb = hoveredId ? blips.find((b) => b.id === hoveredId) : null;
    if (hb) {
      const dist = Math.round(Math.hypot(hb.x - px, hb.z - pz));
      const hp = hb.hpFrac == null ? '' :
        `<div style="height:5px;background:#0006;border-radius:3px;margin-top:4px;overflow:hidden">` +
        `<div style="height:100%;width:${Math.max(0, Math.min(1, hb.hpFrac)) * 100}%;` +
        `background:hsl(${Math.round(Math.max(0, Math.min(1, hb.hpFrac)) * 120)},70%,45%)"></div></div>`;
      tip.innerHTML =
        `<div style="color:#f0e6cc;font-weight:800">${hb.name ?? '?'}</div>` +
        (hb.sub ? `<div style="color:#8aa;font-size:10px;margin-top:1px">${hb.sub}</div>` : '') +
        `<div style="color:#9fb;font-size:10px;margin-top:1px">${dist} m entfernt</div>` +
        hp;
      tip.style.left = pointerX + 14 + 'px';
      tip.style.top = pointerY + 14 + 'px';
      tip.style.display = 'block';
    } else {
      tip.style.display = 'none';
    }
  }

  function toggle(): void {
    open = !open;
    cv.style.display = open ? 'block' : 'none';
    if (!open) tip.style.display = 'none';
  }

  return {
    toggle,
    isOpen: () => open,
    update,
    revealAt: (x, z, radius) => fog.reveal(x, z, radius),
    resetFog: () => fog.reset(),
    setWaypoint: (wp) => { waypoint = wp; },
    onWaypointPick: (fn) => { pickFn = fn; },
  };
}
