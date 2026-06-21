import type { Tunables, TunableSpec } from './tunables';

/**
 * Regler-HUD für beliebig viele Tunables: nach Kategorie gruppiert (einklappbar),
 * mit Filter-Suchfeld. Taste "K" blendet ein/aus. Skaliert mit der Registry — neue
 * Werte erscheinen automatisch. onChange(label,value) wird beim Loslassen geloggt.
 */
export function createTuningPanel(
  tunables: Tunables,
  opts?: { toggleKey?: string; onChange?: (label: string, value: number) => void },
): void {
  const toggleKey = (opts?.toggleKey ?? 'k').toLowerCase();
  const collapsed = new Set<string>();
  let filter = '';

  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;right:12px;top:64px;z-index:24;width:248px;max-height:82vh;display:flex;flex-direction:column;' +
    'background:rgba(13,17,22,0.94);border:1px solid #2a343b;border-radius:10px;padding:10px 12px;' +
    'font:600 12px system-ui,sans-serif;color:#cdd6dd;';

  const title = document.createElement('div');
  title.textContent = 'Regler — [K] schließen';
  title.style.cssText = 'color:#f0e6cc;font-weight:700;margin-bottom:6px;flex:none;';
  panel.appendChild(title);

  const search = document.createElement('input');
  search.type = 'text';
  search.placeholder = 'filtern…';
  search.style.cssText =
    'flex:none;width:100%;box-sizing:border-box;margin-bottom:6px;padding:4px 7px;border-radius:6px;' +
    'border:1px solid #2a343b;background:#0c1116;color:#e8edf1;font:600 12px system-ui,sans-serif;';
  search.addEventListener('input', () => { filter = search.value.trim().toLowerCase(); rebuild(); });
  panel.appendChild(search);

  const body = document.createElement('div');
  body.style.cssText = 'overflow:auto;flex:1 1 auto;';
  panel.appendChild(body);

  function rowEl(s: TunableSpec): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'margin:6px 0;';
    const cap = document.createElement('div');
    cap.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;gap:6px;margin-bottom:2px;';
    const lab = document.createElement('span');
    lab.textContent = s.label;
    lab.style.cssText = 'color:#aeb9c2;font-size:11px;';
    const val = document.createElement('span');
    val.textContent = s.step < 1 ? s.value.toFixed(2) : String(s.value);
    val.style.cssText = 'color:#ffcf6b;font-weight:800;font-size:11px;';
    cap.appendChild(lab);
    cap.appendChild(val);

    const line = document.createElement('div');
    line.style.cssText = 'display:flex;align-items:center;gap:6px;';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(s.min); input.max = String(s.max); input.step = String(s.step);
    input.value = String(s.value);
    input.style.cssText = 'flex:1 1 auto;';
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      tunables.set(s.key, v);
      val.textContent = s.step < 1 ? v.toFixed(2) : String(v);
    });
    input.addEventListener('change', () => opts?.onChange?.(s.label, parseFloat(input.value)));
    const reset = document.createElement('button');
    reset.textContent = '↺';
    reset.title = 'Zurücksetzen';
    reset.style.cssText = 'flex:none;background:#2a343b;color:#cdd6dd;border:none;border-radius:5px;cursor:pointer;padding:1px 6px;';
    reset.addEventListener('click', () => {
      tunables.reset(s.key);
      input.value = String(s.def);
      val.textContent = s.step < 1 ? s.def.toFixed(2) : String(s.def);
      opts?.onChange?.(s.label, s.def);
    });
    line.appendChild(input);
    line.appendChild(reset);
    row.appendChild(cap);
    row.appendChild(line);
    return row;
  }

  function rebuild(): void {
    body.innerHTML = '';
    const specs = tunables.list().filter((s) => !filter || s.label.toLowerCase().includes(filter));
    const cats = [...new Set(specs.map((s) => s.category))];
    for (const cat of cats) {
      const header = document.createElement('div');
      const isCol = collapsed.has(cat);
      header.textContent = `${isCol ? '▸' : '▾'} ${cat}`;
      header.style.cssText =
        'margin:8px 0 2px;color:#7fd1c0;font-weight:800;font-size:11px;letter-spacing:0.5px;cursor:pointer;';
      header.addEventListener('click', () => {
        if (collapsed.has(cat)) collapsed.delete(cat); else collapsed.add(cat);
        rebuild();
      });
      body.appendChild(header);
      if (isCol) continue;
      for (const s of specs.filter((x) => x.category === cat)) body.appendChild(rowEl(s));
    }
  }

  rebuild();
  document.body.appendChild(panel);

  window.addEventListener('keydown', (ev) => {
    if (ev.key.toLowerCase() === toggleKey) {
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    }
  });
}
