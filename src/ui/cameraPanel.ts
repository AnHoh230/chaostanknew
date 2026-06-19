interface CamApi {
  set(height: number, back: number, fov?: number): void;
  get(): { height: number; back: number; fov: number };
}

/**
 * Kleines GUI-Panel mit drei Schiebereglern für Höhe, Distanz und FOV der Kamera
 * (Live, kein Terminal nötig). Taste "K" blendet es ein/aus.
 */
export function createCameraPanel(): void {
  const cam = (): CamApi | undefined => (window as unknown as { __cam?: CamApi }).__cam;

  const panel = document.createElement('div');
  panel.id = 'cam-panel';
  panel.style.cssText =
    'position:fixed;right:12px;top:64px;z-index:24;display:block;background:rgba(13,17,22,0.92);' +
    'border:1px solid #2a343b;border-radius:10px;padding:12px 14px;width:210px;' +
    'font:600 12px system-ui,sans-serif;color:#cdd6dd;';

  const title = document.createElement('div');
  title.textContent = 'Kamera — [K] schließen';
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
