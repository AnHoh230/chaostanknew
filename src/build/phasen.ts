/**
 * B — Häutungs-Zustand (Spec 0 §4/§6). Reiner Zustand: welche Schicht ist VERHÄRTET (= automatisiert)?
 * main.ts liest ihn, um Schuss/Q auf Autopilot zu schalten und den Übergang EINMALIG zu melden.
 * (Die Finisher-Verhärtung selbst lebt in finisher.ts; hier nur build + ult, plus ein finisher-Flag
 * für die Vollständigkeit der Ladder.)
 */
export type Schicht = 'build' | 'ult' | 'finisher';

export interface PhasenState {
  verhaertet: Record<Schicht, boolean>;
}

export function createPhasenState(): PhasenState {
  return { verhaertet: { build: false, ult: false, finisher: false } };
}

/** Eine Schicht verhärten. Gibt true zurück, wenn sie JETZT NEU verhärtet (für einmaligen Toast + Auto-Start). */
export function verhaerte(s: PhasenState, schicht: Schicht): boolean {
  if (s.verhaertet[schicht]) return false;
  s.verhaertet[schicht] = true;
  return true;
}
