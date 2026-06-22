import { projectBlip } from './minimapMath';

export interface Blip {
  x: number;
  z: number;
  color: string;
  r?: number;
}

export interface Minimap {
  update(playerX: number, playerZ: number, blips: Blip[]): void;
}

/**
 * Kleine runde Minimap unten rechts. Spieler ist die Mitte; Gegner als
 * einheitliche Punkte relativ dazu. Läuft in Echtzeit (DOM/Canvas).
 */
export function createMinimap(sizePx = 168, rangeWorld = 60): Minimap {
  const cv = document.createElement('canvas');
  cv.width = sizePx;
  cv.height = sizePx;
  cv.id = 'minimap';
  cv.style.cssText =
    'position:fixed;left:12px;bottom:12px;z-index:18;border:1px solid #2a343b;' +
    'border-radius:50%;background:rgba(10,14,12,0.62);';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');

  function dot(x: number, y: number, r: number): void {
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function update(playerX: number, playerZ: number, blips: Blip[]): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, sizePx, sizePx);

    // Fadenkreuz
    ctx.strokeStyle = 'rgba(140,160,150,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sizePx / 2, 8);
    ctx.lineTo(sizePx / 2, sizePx - 8);
    ctx.moveTo(8, sizePx / 2);
    ctx.lineTo(sizePx - 8, sizePx / 2);
    ctx.stroke();

    // Gegner-Blips
    for (const b of blips) {
      const p = projectBlip(playerX, playerZ, b.x, b.z, rangeWorld, sizePx);
      if (!p.inRange) continue;
      ctx.fillStyle = b.color;
      dot(p.x, p.y, b.r ?? 3.5);
    }

    // Spieler (Mitte, zuletzt = oben drauf)
    ctx.fillStyle = '#dfeede';
    dot(sizePx / 2, sizePx / 2, 3.5);
  }

  return { update };
}
