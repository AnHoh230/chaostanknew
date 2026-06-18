import { MeshBuilder, StandardMaterial, Color3, Vector3, Matrix } from '@babylonjs/core';
import type { Scene, Camera, Mesh, LinesMesh } from '@babylonjs/core';
import { rayGroundY0 } from '../input/aimMath';

/** Was die Spiel-Logik zum Abfeuer-Zeitpunkt EINFRIERT. Alles als rohe Zahlen. */
export interface ShotInput {
  shotId: number;
  frame: number;
  simTime: number; // Sekunden seit Boot (Sim-Uhr)
  tankX: number;
  tankZ: number;
  originX: number; // Mündung/Spawn des Projektils
  originZ: number;
  dirX: number; // eingefrorene Schussrichtung (normiert)
  dirZ: number;
  speed: number; // Welt-Einheiten/s
  range: number; // speed*life: wie weit der Schuss insgesamt fliegt
}

/** Eine fertige Mess-Zeile — das, was ich mir HINTERHER ansehe. */
export interface ShotRecord extends ShotInput {
  // Cursor zum KLICK-Zeitpunkt, frisch projiziert (Bildschirm -> Boden y=0):
  cursorScreenX: number;
  cursorScreenY: number;
  cursorGroundX: number | null;
  cursorGroundZ: number | null;
  // Verhaeltnis Schuss <-> Cursor-Bodenpunkt:
  aimErrDeg: number | null; // Winkel zwischen Schussrichtung und (Cursor - Mündung)
  lateralMiss: number | null; // wie weit der GERADE Schuss seitlich am Cursor vorbeigeht
  rangeToClosest: number | null; // Strecke entlang der Bahn bis zum nächsten Punkt am Cursor
  timeToCursor: number | null; // wann der Schuss dort ankommt (rangeToClosest/speed)
  cursorBehind: boolean; // Cursor liegt HINTER dem Schuss (rangeToClosest < 0)
}

export interface FireRecorder {
  recordShot(s: ShotInput): ShotRecord;
  setEnabled(on: boolean): void;
  toggle(): void;
  records(): ShotRecord[];
}

const MAX_TRACES = 16; // bleibende Bahnen, älteste werden recycelt
const MAX_ROWS = 12; // Zeilen im HUD

/**
 * Schuss-Rekorder + bleibende Flugbahn-Anzeige.
 *  - Pro Schuss EINE Zeile mit Zeitstempel (die Zahlen, die ich hinterher lese).
 *  - Zeichnet die EXAKTE gerade Bahn als bleibende Linie (cyan) + Cursor-Bodenpunkt
 *    zur Klickzeit (magenta Kugel). EIN Screenshot zeigt damit die ganze Salve.
 *  - HUD-Tabelle (Taste "l" schaltet um). Standard: AN (permanent).
 *  - window.__fireLog spiegelt alle Zeilen für externes Auslesen.
 */
export function createFireRecorder(scene: Scene, camera: Camera): FireRecorder {
  let enabled = true;
  const log: ShotRecord[] = [];

  // Ring bleibender Bahn-Linien + Cursor-Marker.
  const traceLines: LinesMesh[] = [];
  const cursorDots: Mesh[] = [];
  const cursorMat = new StandardMaterial('rec_cursor_mat', scene);
  cursorMat.emissiveColor = new Color3(1, 0.2, 1);
  cursorMat.disableLighting = true;

  const hud = document.createElement('div');
  hud.id = 'fire-recorder';
  hud.style.cssText =
    'position:fixed;top:8px;right:8px;z-index:21;font:11px/1.4 monospace;color:#cfe;' +
    'background:rgba(0,0,0,0.66);padding:8px 10px;border:1px solid #2a343b;border-radius:6px;' +
    'white-space:pre;pointer-events:none;max-width:46ch;';
  document.body.appendChild(hud);

  function setEnabled(on: boolean): void {
    enabled = on;
    hud.style.display = on ? 'block' : 'none';
    for (const t of traceLines) t.setEnabled(on);
    for (const d of cursorDots) d.setEnabled(on);
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.key.toLowerCase() === 'l') setEnabled(!enabled);
  });

  function cursorGroundNow(): { sx: number; sy: number; gx: number | null; gz: number | null } {
    const sx = scene.pointerX;
    const sy = scene.pointerY;
    const ray = scene.createPickingRay(sx, sy, Matrix.Identity(), camera);
    const g = rayGroundY0(
      ray.origin.x,
      ray.origin.y,
      ray.origin.z,
      ray.direction.x,
      ray.direction.y,
      ray.direction.z,
    );
    return { sx, sy, gx: g ? g.x : null, gz: g ? g.z : null };
  }

  function drawTrace(rec: ShotRecord): void {
    // Bleibende gerade Bahn (so wie das Projektil TATSÄCHLICH fliegt).
    const a = new Vector3(rec.originX, 0.5, rec.originZ);
    const b = new Vector3(
      rec.originX + rec.dirX * rec.range,
      0.5,
      rec.originZ + rec.dirZ * rec.range,
    );
    const line = MeshBuilder.CreateLines('rec_trace_' + rec.shotId, { points: [a, b] }, scene);
    line.color = new Color3(0.1, 0.95, 0.95);
    line.isPickable = false;
    line.setEnabled(enabled);
    traceLines.push(line);

    // Cursor-Bodenpunkt zur Klickzeit (magenta), falls vorhanden.
    if (rec.cursorGroundX !== null && rec.cursorGroundZ !== null) {
      const dot = MeshBuilder.CreateSphere(
        'rec_cur_' + rec.shotId,
        { diameter: 0.7, segments: 6 },
        scene,
      );
      dot.material = cursorMat;
      dot.isPickable = false;
      dot.position.set(rec.cursorGroundX, 0.5, rec.cursorGroundZ);
      dot.setEnabled(enabled);
      cursorDots.push(dot);
    } else {
      cursorDots.push(MeshBuilder.CreateSphere('rec_cur_empty_' + rec.shotId, { diameter: 0.01 }, scene));
    }

    // Ring kürzen: ältestes Paar entsorgen.
    while (traceLines.length > MAX_TRACES) traceLines.shift()!.dispose();
    while (cursorDots.length > MAX_TRACES) cursorDots.shift()!.dispose();
  }

  function renderHud(): void {
    const rows = log.slice(-MAX_ROWS);
    const f2 = (n: number | null): string => (n === null ? '  — ' : n.toFixed(2).padStart(6));
    const head =
      'id   t(s)  tankXZ        cursorXZ       aimErr  miss  t->cur\n' +
      '------------------------------------------------------------';
    const body = rows
      .map((r) => {
        const id = String(r.shotId).padStart(3);
        const t = r.simTime.toFixed(2).padStart(6);
        const tank = `${f2(r.tankX)},${f2(r.tankZ)}`;
        const cur =
          r.cursorGroundX === null ? '   —        ' : `${f2(r.cursorGroundX)},${f2(r.cursorGroundZ)}`;
        const err = r.aimErrDeg === null ? '  — ' : r.aimErrDeg.toFixed(1).padStart(5);
        const miss = r.lateralMiss === null ? '  — ' : r.lateralMiss.toFixed(1).padStart(5);
        const ttc = r.cursorBehind
          ? ' HINTEN'
          : r.timeToCursor === null
            ? '  — '
            : r.timeToCursor.toFixed(2).padStart(6);
        return `${id} ${t}  ${tank}  ${cur}  ${err} ${miss} ${ttc}`;
      })
      .join('\n');
    hud.textContent = `SCHUSS-LOG  (Taste l)   ${log.length} Schüsse\n${head}\n${body}`;
  }

  function recordShot(s: ShotInput): ShotRecord {
    const cur = cursorGroundNow();

    let aimErrDeg: number | null = null;
    let lateralMiss: number | null = null;
    let rangeToClosest: number | null = null;
    let timeToCursor: number | null = null;
    let cursorBehind = false;

    if (cur.gx !== null && cur.gz !== null) {
      const rx = cur.gx - s.originX;
      const rz = cur.gz - s.originZ;
      const along = rx * s.dirX + rz * s.dirZ; // Projektion auf Schussrichtung
      const cross = rx * s.dirZ - rz * s.dirX; // 2D-Kreuzprodukt = seitlicher Abstand
      lateralMiss = Math.abs(cross);
      rangeToClosest = along;
      cursorBehind = along < 0;
      timeToCursor = along > 0 ? along / s.speed : null;
      const rl = Math.hypot(rx, rz) || 1;
      const dot = (s.dirX * rx + s.dirZ * rz) / rl;
      aimErrDeg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
    }

    const rec: ShotRecord = {
      ...s,
      cursorScreenX: cur.sx,
      cursorScreenY: cur.sy,
      cursorGroundX: cur.gx,
      cursorGroundZ: cur.gz,
      aimErrDeg,
      lateralMiss,
      rangeToClosest,
      timeToCursor,
      cursorBehind,
    };

    log.push(rec);
    (window as unknown as { __fireLog: ShotRecord[] }).__fireLog = log;
    drawTrace(rec);
    if (enabled) renderHud();
    return rec;
  }

  setEnabled(true);
  return { recordShot, setEnabled, toggle: () => setEnabled(!enabled), records: () => log };
}
