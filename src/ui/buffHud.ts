import type { ActiveBuff } from '../combat/buffs';

export interface BuffHud {
  update(active: readonly ActiveBuff[]): void;
}

interface Chip {
  box: HTMLElement;
  label: HTMLElement;
  bar: HTMLElement;
}

/** Aktive Buffs als Chip-Reihe oben links, je mit ablaufendem Timer-Balken. */
export function createBuffHud(): BuffHud {
  const wrap = document.createElement('div');
  wrap.id = 'buff-hud';
  wrap.style.cssText =
    'position:fixed;left:12px;top:48px;z-index:19;display:flex;gap:6px;pointer-events:none;';
  document.body.appendChild(wrap);

  const pool: Chip[] = [];

  function makeChip(): Chip {
    const box = document.createElement('div');
    box.style.cssText =
      'position:relative;display:none;background:rgba(8,12,16,0.8);border:1px solid #2a343b;' +
      'border-radius:6px;padding:4px 8px 6px;font:700 11px system-ui,sans-serif;color:#7fd1c0;' +
      'text-shadow:0 1px 2px #000;overflow:hidden;';
    const label = document.createElement('div');
    box.appendChild(label);
    const track = document.createElement('div');
    track.style.cssText = 'position:absolute;left:0;bottom:0;height:3px;width:100%;background:#0006;';
    const bar = document.createElement('div');
    bar.style.cssText = 'height:100%;width:100%;background:#7fd1c0;';
    track.appendChild(bar);
    box.appendChild(track);
    wrap.appendChild(box);
    return { box, label, bar };
  }

  function update(active: readonly ActiveBuff[]): void {
    while (pool.length < active.length) pool.push(makeChip());
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i]!;
      const b = active[i];
      if (!b) {
        c.box.style.display = 'none';
        continue;
      }
      c.box.style.display = 'block';
      c.label.textContent =
        (b.icon ? b.icon + ' ' : '') + (b.label ?? b.id) + ' ' + Math.ceil(b.remaining) + 's';
      c.bar.style.width = Math.max(0, Math.min(1, b.duration > 0 ? b.remaining / b.duration : 0)) * 100 + '%';
    }
  }

  return { update };
}
