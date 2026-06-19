export interface HudState {
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  enemyAlive: boolean;
  enemyName: string | null; // gesetzt = Named (z. B. "der Rasende")
}

export interface Hud {
  update(s: HudState): void;
}

/** HP-Anteil 0..1 → Farbe rot→gelb→grün (HSL-Hue 0..120). */
function hpColor(frac: number): string {
  const f = frac < 0 ? 0 : frac > 1 ? 1 : frac;
  return `hsl(${Math.round(f * 120)}, 70%, 45%)`;
}

function makeBar(parent: HTMLElement, label: string): { label: HTMLElement; fill: HTMLElement; root: HTMLElement } {
  const root = document.createElement('div');
  root.style.cssText = 'margin:4px 0;';
  const cap = document.createElement('div');
  cap.textContent = label;
  cap.style.cssText = 'font:600 12px/1.3 system-ui,sans-serif;color:#dde;text-shadow:0 1px 2px #000;margin-bottom:2px;';
  const track = document.createElement('div');
  track.style.cssText = 'width:200px;height:12px;background:rgba(0,0,0,0.5);border:1px solid #2a343b;border-radius:6px;overflow:hidden;';
  const fill = document.createElement('div');
  fill.style.cssText = 'height:100%;width:100%;transition:width 0.12s linear;';
  track.appendChild(fill);
  root.appendChild(cap);
  root.appendChild(track);
  parent.appendChild(root);
  return { label: cap, fill, root };
}

/** Spieler- und Gegner-HP oben links; Gegner-Balken zeigt Named-Namen. */
export function createHud(): Hud {
  const box = document.createElement('div');
  box.id = 'hud';
  box.style.cssText = 'position:fixed;left:12px;top:12px;z-index:19;pointer-events:none;';
  document.body.appendChild(box);

  const player = makeBar(box, 'Du');
  const enemy = makeBar(box, 'Gegner');

  function update(s: HudState): void {
    const pf = s.playerHp / s.playerMaxHp;
    player.fill.style.width = Math.max(0, pf * 100) + '%';
    player.fill.style.background = hpColor(pf);
    player.label.textContent = `Du — ${Math.max(0, Math.round(s.playerHp))} HP`;

    if (s.enemyAlive) {
      enemy.root.style.display = 'block';
      const ef = s.enemyHp / s.enemyMaxHp;
      enemy.fill.style.width = Math.max(0, ef * 100) + '%';
      enemy.fill.style.background = s.enemyName ? '#ff5a3c' : hpColor(ef);
      enemy.label.textContent = (s.enemyName ?? 'Gegner') + ` — ${Math.max(0, Math.round(s.enemyHp))} HP`;
      enemy.label.style.color = s.enemyName ? '#ff8a72' : '#dde';
    } else {
      enemy.root.style.display = 'none';
    }
  }

  return { update };
}
