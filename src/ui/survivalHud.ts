/**
 * Überlebens-HUD (oben mittig): zeigt die laufende Systemzeit (wie lange überlebt, mm:ss) und den
 * Score, beide sichtbar hochzählend. Reine Anzeige — Zeit = runClock (Summe simDt), Score zählt der
 * Aufrufer pro Spieler-Kill. Tod = Seiten-Reload setzt beides auf 0 (frischer Run).
 */
export interface SurvivalHud {
  update(timeSec: number, score: number): void;
}

function fmtZeit(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function createSurvivalHud(): SurvivalHud {
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:30;pointer-events:none;' +
    'display:flex;gap:14px;align-items:center;' +
    'background:rgba(13,17,22,0.82);border:1px solid #2a343b;border-radius:10px;padding:6px 16px;' +
    'font-family:system-ui,sans-serif;color:#e8e0c8;';

  function zelle(icon: string, farbe: string, label: string): HTMLSpanElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:baseline;gap:6px;';
    const ic = document.createElement('span');
    ic.textContent = icon;
    ic.style.cssText = `font-size:14px;color:${farbe};`;
    const cap = document.createElement('span');
    cap.textContent = label;
    cap.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:1px;color:#7d8893;text-transform:uppercase;';
    const val = document.createElement('span');
    val.style.cssText = 'font-weight:800;font-size:20px;font-variant-numeric:tabular-nums;letter-spacing:1px;';
    wrap.appendChild(ic);
    wrap.appendChild(cap);
    wrap.appendChild(val);
    panel.appendChild(wrap);
    return val;
  }

  const zeitVal = zelle('⏱', '#7fd1c0', 'Überlebt');
  const sep = document.createElement('div');
  sep.style.cssText = 'width:1px;height:22px;background:#2a343b;';
  panel.appendChild(sep);
  const scoreVal = zelle('✦', '#ffcf6b', 'Score');
  document.body.appendChild(panel);

  let lastZeit = '';
  let lastScore = -1;
  function update(timeSec: number, score: number): void {
    const z = fmtZeit(timeSec);
    if (z !== lastZeit) { zeitVal.textContent = z; lastZeit = z; } // nur 1×/s -> kein DOM-Churn
    if (score !== lastScore) { scoreVal.textContent = score.toLocaleString('de-DE'); lastScore = score; }
  }

  return { update };
}
