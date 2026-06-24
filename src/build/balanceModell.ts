/**
 * Balance-Taschenrechner — Progressions-Hochrechnung auf Basis ECHTER Run-Messpunkte. Beantwortet die
 * Kern-Frage: wie laufen Spieler-Schaden und Gegner-HP über die Zeit GEGENEINANDER?
 *
 * Datengrundlage: die MESSPUNKTE unten sind aus echten Run-Logs abgelesen (run-111, Befehl-Build) —
 * je Zeit der gemessene Schaden/Schuss (= dpsOut/sps, also INKL. Aufbau) und kpm. Dazwischen wird
 * linear interpoliert, darüber hinaus linear extrapoliert (klar markiert). Die Gegner-Seite kommt aus
 * den echten Formeln (gegnerWelle/gartenTypStats), zieht also automatisch mit, wenn die Kurven sich ändern.
 *
 * AKTUALISIEREN: nach einem längeren/neueren Run die MESSPUNKTE ersetzen (Schaden/Schuss = dpsOut/sps,
 * kpm direkt aus dem snap). Der Test balanceModell.test.ts gibt die Tabelle aus.
 */
import { gegnerWelle, gartenTypStats } from './gartenProgression';
import { DEFAULT_GARTEN } from './garten';

// — ECHTE MESSPUNKTE (run-111, Befehl-Build) — t[s] → gemessen —
export interface Messpunkt { t: number; kpm: number; dmgProSchuss: number; }
export const MESSPUNKTE: Messpunkt[] = [
  { t: 30, kpm: 8.0, dmgProSchuss: 72 }, // St0 Grundschuss
  { t: 60, kpm: 9.0, dmgProSchuss: 115 }, // markiert, noch kein Aufbau
  { t: 120, kpm: 12.0, dmgProSchuss: 115 },
  { t: 210, kpm: 13.1, dmgProSchuss: 125 }, // Aufbau setzt ein
  { t: 270, kpm: 15.5, dmgProSchuss: 240 },
  { t: 300, kpm: 16.4, dmgProSchuss: 360 },
  { t: 360, kpm: 22.6, dmgProSchuss: 879 },
  { t: 390, kpm: 24.9, dmgProSchuss: 1144 }, // ~6,5 min, Aufbau explodiert
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
