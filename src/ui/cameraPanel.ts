interface CamApi {
  set(height: number, back: number, fov?: number): void;
  get(): { height: number; back: number; fov: number };
}

interface TuneApi {
  getShotRange(): number;
  setShotRange(v: number): void;
  getPulse(): number;
  setPulse(v: number): void;
}

/**
 * Einstellungs-Panel (Kamera + Gameplay-Regler), live, kein Terminal nötig.
 * Taste "K" blendet es ein/aus. onChange(name,value) wird beim Loslassen jedes
 * Reglers aufgerufen (→ Run-Log), damit die gesetzten Werte nachlesbar sind.
 */
export function createCameraPanel(onChange?: (name: string, value: number) => void): void {
  const cam = (): CamApi | undefined => (window as unknown as { __cam?: CamApi }).__cam;
  const tune = (): TuneApi | undefined => (window as unknown as { __tune?: TuneApi }).__tune;

  const panel = document.createElement('div');
  panel.id = 'cam-panel';
  panel.style.cssText =
    'position:fixed;right:12px;top:64px;z-index:24;display:block;background:rgba(13,17,22,0.92);' +
    'border:1px solid #2a343b;border-radius:10px;padding:12px 14px;width:210px;' +
    'font:600 12px system-ui,sans-serif;color:#cdd6dd;';

  const title = document.createElement('div');
  title.textContent = 'Einstellungen — [K] schließen';
  title.style.cssText = 'color:#f0e6cc;font-weight:700;margin-bottom:8px;';
  panel.appendChild(title);

  function slider(
    label: string,
    min: number,
    max: number,
    step: number,
    get: () => number,
    onInput: (v: number) => void,
  ): void {
    const row = document.createElement('div');
    row.style.cssText = 'margin:8px 0;';
    const cap = document.createElement('div');
    const val = document.createElement('span');
    cap.textContent = label + ' ';
    cap.style.cssText = 'margin-bottom:3px;display:block;';
    cap.appendChild(val);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(get());
    input.style.cssText = 'width:100%;';
    val.textContent = String(get());
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      val.textContent = step < 1 ? v.toFixed(2) : String(v);
      onInput(v);
    });
    // Beim Loslassen den Endwert in den Log schreiben (nicht jeden Drag-Tick).
    input.addEventListener('change', () => onChange?.(label, parseFloat(input.value)));
    row.appendChild(cap);
    row.appendChild(input);
    panel.appendChild(row);
  }

  // Werte aus der aktuellen Kamera ziehen (Defaults falls noch nicht da).
  const cur = cam()?.get() ?? { height: 30, back: 26, fov: 0.6 };
  let height = cur.height;
  let back = cur.back;
  let fov = cur.fov;
  const apply = (): void => cam()?.set(height, back, fov);

  slider('Höhe (steiler ↑)', 8, 60, 1, () => height, (v) => {
    height = v;
    apply();
  });
  slider('Distanz', 5, 55, 1, () => back, (v) => {
    back = v;
    apply();
  });
  slider('Zoom (FOV)', 0.3, 1.0, 0.01, () => fov, (v) => {
    fov = v;
    apply();
  });

  // Gameplay-Regler (Schussweite, Max-Gegner) — falls __tune vorhanden.
  const t = tune();
  if (t) {
    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid #2a343b;margin:8px 0 2px;';
    panel.appendChild(sep);
    slider('Schussweite', 12, 120, 1, () => t.getShotRange(), (v) => t.setShotRange(v));
    slider('Frontlage-Puls s', 10, 120, 5, () => t.getPulse(), (v) => t.setPulse(v));
  }

  const hintRow = document.createElement('div');
  hintRow.textContent = '[K] öffnet/schließt dieses Panel';
  hintRow.style.cssText = 'color:#778;font-size:10px;margin-top:6px;';
  panel.appendChild(hintRow);

  document.body.appendChild(panel);

  window.addEventListener('keydown', (ev) => {
    if (ev.key.toLowerCase() === 'k') {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  });
}
