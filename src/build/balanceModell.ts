/**
 * Balance-Taschenrechner — Progressions-Hochrechnung auf Basis ECHTER Run-Messpunkte. Beantwortet die
 * Kern-Frage: wie laufen Spieler-Schaden und Gegner-HP über die Zeit GEGENEINANDER?
 *
 * Datengrundlage: die MESSPUNKTE unten sind aus echten Run-Logs abgelesen (run-121, Befehl-Build) —
 * je Zeit der gemessene Schaden/Schuss (= dpsOut/sps, also INKL. Aufbau) und kpm. Dazwischen wird
 * linear interpoliert, darüber hinaus linear extrapoliert (klar markiert). Die Gegner-Seite kommt aus
 * den echten Formeln (gegnerWelle/gartenTypStats), zieht also automatisch mit, wenn die Kurven sich ändern.
 *
 * AKTUALISIEREN: nach einem längeren/neueren Run die MESSPUNKTE ersetzen (Schaden/Schuss = dpsOut/sps,
 * kpm direkt aus dem snap). Der Test balanceModell.test.ts gibt die Tabelle aus.
 */
import { gegnerWelle, gartenTypStats } from './gartenProgression';
import { DEFAULT_GARTEN } from './garten';

// — ECHTE MESSPUNKTE (run-121, Befehl-Build, 838s-Lauf inkl. Crit/Boni) — t[s] → gemessen (dmgProSchuss = dpsOut/sps) —
export interface Messpunkt { t: number; kpm: number; dmgProSchuss: number; }
export const MESSPUNKTE: Messpunkt[] = [
  { t: 30, kpm: 8.4, dmgProSchuss: 72 }, // St0 Grundschuss
  { t: 60, kpm: 8.6, dmgProSchuss: 90 }, // markiert, noch kein Aufbau
  { t: 120, kpm: 11.4, dmgProSchuss: 122 },
  { t: 180, kpm: 12.6, dmgProSchuss: 140 },
  { t: 240, kpm: 13.5, dmgProSchuss: 235 }, // Aufbau setzt ein
  { t: 300, kpm: 14.8, dmgProSchuss: 804 },
  { t: 360, kpm: 21.8, dmgProSchuss: 1961 }, // Aufbau zündet (BBB grenzenlos)
  { t: 420, kpm: 27.2, dmgProSchuss: 3012 },
  { t: 480, kpm: 30.7, dmgProSchuss: 4593 },
  { t: 540, kpm: 33.4, dmgProSchuss: 9804 },
  { t: 600, kpm: 36.0, dmgProSchuss: 13597 },
  { t: 660, kpm: 41.7, dmgProSchuss: 18099 }, // ~11 min; danach Plateau ~18k, Tod bei 838s (14 min, 5–12 % HP)
];

// — ANNAHMEN für das, was (noch) NICHT im Log steht —
export const ANNAHMEN = {
  killsProSkillpunkt: 8, // grob: so viele Kills bis ein Skillpunkt (Impuls-Überschuss)
};

/** Linear interpolieren zwischen Messpunkten; über den letzten hinaus mit der letzten Rate extrapolieren. */
function ausMessung(t: number, key: 'kpm' | 'dmgProSchuss'): number {
  const m = MESSPUNKTE;
  if (t <= m[0]!.t) return m[0]![key];
  for (let i = 1; i < m.length; i++) {
    if (t <= m[i]!.t) {
      const a = m[i - 1]!, b = m[i]!;
      return a[key] + (b[key] - a[key]) * ((t - a.t) / (b.t - a.t));
    }
  }
  const a = m[m.length - 2]!, b = m[m.length - 1]!;
  return b[key] + ((b[key] - a[key]) / (b.t - a.t)) * (t - b.t); // Extrapolation
}

/** Ab dieser Laufzeit ist die Hochrechnung Extrapolation (jenseits der Messpunkte). */
export const MESS_ENDE = MESSPUNKTE[MESSPUNKTE.length - 1]!.t;

export interface BalanceZeile {
  min: number;
  extrapoliert: boolean; // jenseits der echten Messpunkte?
  gegnerStufe: number;
  hpAllrounder: number;
  hpBunker: number;
  kpm: number;
  kills: number;
  // Kommander (gemessen):
  schussSchaden: number; // echter Schaden/Schuss inkl. Aufbau
  schuesseBisKill: number; // gegen einen Allrounder
  overkillFaktor: number; // Schaden / HP — wie viel verpufft (>1 = Overkill)
  // Gift (Formel — kein langer Gift-Run vorhanden):
  erntefieber: number;
  giftReifProTick: number;
  giftTicksBisKill: number;
  // Talente:
  skillpunkte: number;
}

export function balanceZeile(min: number, a = ANNAHMEN): BalanceZeile {
  const t = min * 60;
  const welle = gegnerWelle(t);
  const hpAllrounder = gartenTypStats('allrounder', welle.level).hp;
  const hpBunker = gartenTypStats('bunker', welle.level).hp;
  const kpm = ausMessung(t, 'kpm');
  const kills = Math.round(kpm * min);
  const schussSchaden = Math.round(ausMessung(t, 'dmgProSchuss'));

  const erntefieber = kills; // Gift: jede Ernte +1
  const giftReifProTick = DEFAULT_GARTEN.reifDmg + erntefieber * DEFAULT_GARTEN.dmgProFieber;

  return {
    min,
    extrapoliert: t > MESS_ENDE,
    gegnerStufe: welle.level,
    hpAllrounder, hpBunker,
    kpm: +kpm.toFixed(1), kills,
    schussSchaden,
    schuesseBisKill: Math.max(1, Math.ceil(hpAllrounder / schussSchaden)),
    overkillFaktor: +(schussSchaden / hpAllrounder).toFixed(1),
    erntefieber,
    giftReifProTick: Math.round(giftReifProTick),
    giftTicksBisKill: Math.max(1, Math.ceil(hpAllrounder / giftReifProTick)),
    skillpunkte: Math.floor(kills / a.killsProSkillpunkt),
  };
}

/** Tabelle über mehrere Zeitpunkte (Minuten). Default deckt Früh- bis Endgame ab. */
export function balanceTabelle(minuten = [1, 2, 3, 5, 6.5, 10, 15, 20, 30], a = ANNAHMEN): BalanceZeile[] {
  return minuten.map((m) => balanceZeile(m, a));
}
