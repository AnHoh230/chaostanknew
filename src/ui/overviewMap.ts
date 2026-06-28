import { projectBlip } from './minimapMath';
import { nearestToPointer, type ScreenBlip } from '../inspect/enemyPick';

export interface MapBlip {
  id?: string; // nur Panzer (für Hover); Shop-Felder ohne id
  x: number;
  z: number;
  color: string;
  r?: number;
  name?: string;
  sub?: string; // "Lvl 4 · MK2"
  hpFrac?: number;
}

export interface OverviewMap {
  toggle(): void;
  isOpen(): boolean;
  update(playerX: number, playerZ: number, blips: readonly MapBlip[], pointerX: number, pointerY: number): void;
}

const SIZE = 520; // Pixel-Kantenlänge der großen Karte

/**
 * Große Echtzeit-Übersichtskarte (Taste M) — zeigt das GANZE Feld (ursprungszentriert):
 * Schrottplatz-Props, Gegner und der Spieler als wandernder Marker, plus die Feld-Grenze.
 * Welt läuft weiter; Maus über einen Blip → Tooltip. Keine Pause. Canvas (kein DOM pro Punkt).
 *
 * @param range  Welt-Radius, der ins Bild passt (auf die Karten-Extents abgestimmt).
 * @param extentX/extentZ  halbe Feldgröße → zeichnet die Grenze (wo der Schrottplatz endet).
 */
export function createOverviewMap(range = 150, extentX = 0, extentZ = 0): OverviewMap {
  const RANGE = range;
  let open = false;

  const cv = document.createElement('canvas');
  cv.width = SIZE;
  cv.height = SIZE;
  cv.id = 'overview-map';
  cv.className = 'hud-cc'; // UI-Scale: bildschirmmittig; translate(-50%,-50%) + scale via Klasse
  cv.style.cssText =
    'position:fixed;left:50%;top:50%;display:none;z-index:30;' +
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

  function update(
    px: number,
    pz: number,
    blips: readonly MapBlip[],
    pointerX: number,
    pointerY: number,
  ): void {
    if (!open || !ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

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

    // Alle Blips ursprungszentriert (ganzes Feld sichtbar) + Screen-Positionen für Hover.
    const rect = cv.getBoundingClientRect();
    const screenBlips: ScreenBlip[] = [];
    for (const b of blips) {
      const p = projectBlip(0, 0, b.x, b.z, RANGE, SIZE);
      if (!p.inRange) continue;
      dot(p.x, p.y, b.r ?? 4, b.color);
      if (b.id) screenBlips.push({ id: b.id, sx: rect.left + p.x, sy: rect.top + p.y });
    }

    // Spieler-Marker an seiner echten Feld-Position (am Rand geklemmt, falls außerhalb).
    {
      const pp = projectBlip(0, 0, px, pz, RANGE, SIZE);
      const cx = Math.max(8, Math.min(SIZE - 8, pp.x));
      const cy = Math.max(8, Math.min(SIZE - 8, pp.y));
      dot(cx, cy, 6, '#dfeede');
      if (ctx) { ctx.strokeStyle = '#0b0f0d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.stroke(); }
    }

    // Hover-Tooltip am Cursor
    const hoveredId = nearestToPointer(pointerX, pointerY, screenBlips, 16);
    const hb = hoveredId ? blips.find((b) => b.id === hoveredId) : null;
    if (hb) {
      const hp = hb.hpFrac == null ? '' :
        `<div style="height:5px;background:#0006;border-radius:3px;margin-top:4px;overflow:hidden">` +
        `<div style="height:100%;width:${Math.max(0, Math.min(1, hb.hpFrac)) * 100}%;` +
        `background:hsl(${Math.round(Math.max(0, Math.min(1, hb.hpFrac)) * 120)},70%,45%)"></div></div>`;
      tip.innerHTML =
        `<div style="color:#f0e6cc;font-weight:800">${hb.name ?? '?'}</div>` +
        (hb.sub ? `<div style="color:#8aa;font-size:10px;margin-top:1px">${hb.sub}</div>` : '') +
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

  return { toggle, isOpen: () => open, update };
}
