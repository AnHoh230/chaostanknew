import type { EnemyInfo } from '../inspect/enemyInfo';

export interface InspectCard {
  open(info: EnemyInfo, onClose: () => void): void;
  close(): void;
  isOpen(): boolean;
}

function row(label: string, value: string): string {
  return (
    `<div style="display:flex;justify-content:space-between;gap:14px;margin:3px 0">` +
    `<span style="color:#8aa">${label}</span><span style="color:#e8e0c8;text-align:right">${value}</span></div>`
  );
}

function section(title: string, body: string): string {
  return (
    `<div style="border-top:1px solid #2a343b;margin-top:12px;padding-top:10px">` +
    `<div style="color:#f0e6cc;font-weight:700;font-size:12px;letter-spacing:0.5px;margin-bottom:6px">${title}</div>` +
    body +
    `</div>`
  );
}

/**
 * Modaler Tiefblick (Taste I): abgedunkeltes Vollbild-Overlay + hervorgehobene
 * Info-Karte. Klick aufs Overlay schließt (ruft onClose — dort stellt main den
 * vorherigen simSpeed wieder her). Keine eigenen Tasten-Listener.
 */
export function createInspectCard(): InspectCard {
  let open = false;
  let onCloseCb: (() => void) | null = null;

  const overlay = document.createElement('div');
  overlay.id = 'inspect-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;display:none;align-items:center;justify-content:center;' +
    'background:rgba(4,6,8,0.78);z-index:40;font-family:system-ui,sans-serif;';

  const card = document.createElement('div');
  card.style.cssText =
    'background:#13171c;border:2px solid #d8b04a;border-radius:12px;padding:20px 22px;' +
    'width:460px;max-width:94vw;max-height:88vh;overflow:auto;' +
    'box-shadow:0 0 0 1px #000,0 12px 40px rgba(0,0,0,0.6),0 0 32px rgba(216,176,74,0.25);';
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) doClose();
  });

  function doClose(): void {
    if (!open) return;
    open = false;
    overlay.style.display = 'none';
    const cb = onCloseCb;
    onCloseCb = null;
    cb?.();
  }

  function render(info: EnemyInfo): void {
    const head =
      `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">` +
      `<div style="font-size:19px;font-weight:800;color:#f0e6cc">${info.name}</div>` +
      `<div style="color:#9aa;white-space:nowrap">Lvl ${info.level} · MK${info.mk}</div></div>`;

    const stats = section(
      'Stats',
      row('HP', `${info.hp}/${info.maxHp}`) +
        row('Schaden', String(info.damage)) +
        row('Rüstung', String(info.armor)) +
        (info.dodge > 0 ? row('Ausweichen', `${Math.round(info.dodge * 100)} %`) : '') +
        row('Tempo', info.speed ? String(info.speed) : '—') +
        row('Beutewert', info.lootValue.toFixed(2)),
    );

    const boosters = section(
      'Aktive Effekte',
      info.boosters.length
        ? `<div style="color:#7fd1c0">${info.boosters.join(', ')}</div>`
        : `<div style="color:#677">— keine —</div>`,
    );

    card.innerHTML =
      head + stats + boosters +
      `<div style="text-align:center;color:#778;font-size:11px;margin-top:14px">[I] / [Esc] schließen</div>`;
  }

  return {
    open(info, onClose) {
      onCloseCb = onClose;
      render(info);
      open = true;
      overlay.style.display = 'flex';
    },
    close: doClose,
    isOpen: () => open,
  };
}
