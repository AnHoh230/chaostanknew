/**
 * Balance-Taschenrechner — grobe Progressions-Tabelle über die Laufzeit. Beantwortet die Kern-Frage:
 * wie laufen Spieler-Schaden und Gegner-HP über die Zeit GEGENEINANDER (merkt man die Eskalation)?
 *
 * KEINE sekundengenaue Simulation — eine Approximation mit offen dokumentierten ANNAHMEN. Nutzt die
 * ECHTEN Gegner-Formeln (gegnerWelle / gartenTypStats / buildStufe + DEFAULT_GARTEN), damit die Tabelle
 * automatisch mitzieht, sobald sich die Kurven ändern. Die SPIELER-Seite kommt aus verstreuten main.ts-
 * Werten — die sind hier als ANNAHMEN gespiegelt.
 *
 * AKTUALISIEREN: Wenn neue Messzahlen vorliegen (z. B. andere kpm aus einem Log) oder ich Spieler-Werte
 * in main.ts ändere, hier die ANNAHMEN anpassen. Der Test balanceModell.test.ts gibt die Tabelle aus.
 */
import { gegnerWelle, gartenTypStats, buildStufe } from './gartenProgression';
import { DEFAULT_GARTEN } from './garten';

// — ANNAHMEN (HIER anpassen bei neuen Messzahlen) —
export const ANNAHMEN = {
  kpm: 17, // gemessene Kills/Minute (run-112). Treibt Erntefieber, Kommander-Aufbau und Skillpunkte.
  grundschaden: 36, // = TANK_CLASSES[0].damage
  sniperMul: 2, // = sniperDmgMul (main.ts)
  markMul: 1.6, // = MARK_VERWUNDBAR (markiertes Ziel)
  befehlDmgProStufe: 10, // = BEFEHL_DMG_PRO_STUFE (additiver Schaden je Aufbau-Stufe)
  aufbauEffizienz: 0.5, // grob: Anteil der Kills, der den Kommander-perma-Sockel hebt (BBB, ungedeckelt)
  killsProSkillpunkt: 8, // grob: so viele Kills bis ein Skillpunkt (Impuls-Überschuss)
};

export interface BalanceZeile {
  min: number;
  gegnerStufe: number; // welle.level
  hpAllrounder: number;
  hpBunker: number;
  kills: number;
  buildStufeGift: number; // zeit-getriebene Gift-Build-Stufe (0=Grund … 3=ZZZ, 4+=Verstärkung)
  // Gift (DoT):
  erntefieber: number;
  giftReifProTick: number;
  giftTicksBisKill: number; // reif-Ticks bis ein Allrounder tot ist (Reifezeit kommt obendrauf)
  // Kommander (Direktschuss):
  permaStufe: number;
  schussMarkiert: number;
  schuesseBisKill: number; // markierte Schüsse bis ein Allrounder tot ist
  // Talente:
  skillpunkte: number;
}

export function balanceZeile(min: number, a = ANNAHMEN): BalanceZeile {
  const t = min * 60;
  const welle = gegnerWelle(t);
  const hpAllrounder = gartenTypStats('allrounder', welle.level).hp;
  const hpBunker = gartenTypStats('bunker', welle.level).hp;
  const kills = Math.round(a.kpm * min);

  // Gift: Erntefieber ≈ kumulierte Ernten ≈ Kills; reifes Gift = reifDmg + Fieber × dmgProFieber.
  const erntefieber = kills;
  const giftReifProTick = DEFAULT_GARTEN.reifDmg + erntefieber * DEFAULT_GARTEN.dmgProFieber;
  const giftTicksBisKill = Math.max(1, Math.ceil(hpAllrounder / giftReifProTick));

  // Kommander: perma-Sockel ≈ Kills × Effizienz; markierter Schuss = Basis×Sniper×Verwundbar + Stufe×Bonus.
  const permaStufe = Math.round(kills * a.aufbauEffizienz);
  const schussMarkiert = Math.round(a.grundschaden * a.sniperMul * a.markMul + permaStufe * a.befehlDmgProStufe);
  const schuesseBisKill = Math.max(1, Math.ceil(hpAllrounder / schussMarkiert));

  return {
    min, gegnerStufe: welle.level, hpAllrounder, hpBunker, kills,
    buildStufeGift: buildStufe(t), erntefieber, giftReifProTick, giftTicksBisKill,
    permaStufe, schussMarkiert, schuesseBisKill,
    skillpunkte: Math.floor(kills / a.killsProSkillpunkt),
  };
}

/** Tabelle über mehrere Zeitpunkte (Minuten). Default deckt Früh- bis Endgame ab. */
export function balanceTabelle(minuten = [1, 2, 3, 5, 10, 15, 20, 30], a = ANNAHMEN): BalanceZeile[] {
  return minuten.map((m) => balanceZeile(m, a));
}
