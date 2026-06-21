/**
 * Run-Diagnostik: sammelt während eines Runs die Kennzahlen, an denen man Schieflagen
 * SIEHT, und liefert pro Intervall einen kompakten Snapshot fürs Log. Damit lässt sich
 * nach dem Spielen ablesen, WAS schiefläuft, statt es zu erspielen:
 *  - „stirbt zu schnell" → dpsIn (erlittener Schaden/s), hpPct, surv (Überlebenszeit), deaths
 *  - „killt nix"         → kills, kpm, dpsOut, acc (Trefferquote)
 *  - „zu langsam"        → spd (Ø-Tempo)
 *  - „zu viele Gegner"   → alive, peak, target, spawns/Intervall
 * Reine Logik (keine Zeit-/DOM-Abhängigkeit): Zeit kommt über die summierten dt.
 */
export interface MetricsState {
  alive: number;
  target: number;
  hp: number;
  hpMax: number;
  geld: number;
  level: number;
  mk: number;
  heat: Record<string, number>; // Richtung → Heat
  mix: Record<string, number>; // Typ → lebende Anzahl
}

export interface RunSnapshot {
  t: number; // Sekunden seit Run-Start
  alive: number;
  peak: number; // max. gleichzeitige Gegner im Intervall
  target: number;
  spawns: number; // neue Gegner im Intervall
  hp: number;
  hpPct: number;
  spd: number; // Ø-Tempo im Intervall (Welteinheiten/s)
  surv: number; // Sekunden seit dem letzten Tod (aktuelles Leben)
  deaths: number;
  kills: number; // Kills im Intervall
  kpm: number; // Kills/Minute (kumuliert)
  dpsOut: number; // ausgeteilter Schaden/s (Intervall)
  dpsIn: number; // erlittener Schaden/s (Intervall)
  acc: number; // Trefferquote % (Intervall): Treffer/Schüsse
  geld: number;
  level: number;
  mk: number;
  heat: Record<string, number>;
  mix: Record<string, number>;
}

export interface RunMetrics {
  onShot(): void;
  onHitDealt(dmg: number): void;
  onDamageTaken(dmg: number): void;
  onKill(): void;
  onDeath(): void;
  onSpawn(): void;
  /** Pro Frame: Zeit + Tempo + aktuelle Gegnerzahl akkumulieren. */
  frame(dt: number, speed: number, alive: number): void;
  /** Snapshot bilden UND die Intervall-Zähler zurücksetzen. */
  takeSnapshot(state: MetricsState): RunSnapshot;
}

const r1 = (v: number): number => Math.round(v * 10) / 10;

export function createRunMetrics(): RunMetrics {
  // kumuliert über den ganzen Run
  let totalTime = 0, totalKills = 0, totalDeaths = 0, totalShots = 0, totalHits = 0;
  let sinceDeath = 0; // aktuelle Überlebenszeit
  // pro Intervall (Reset bei takeSnapshot)
  let iTime = 0, iSpeedSum = 0, iPeak = 0, iSpawns = 0;
  let iKills = 0, iDmgOut = 0, iDmgIn = 0;

  return {
    onShot() { totalShots += 1; },
    onHitDealt(dmg) { totalHits += 1; iDmgOut += dmg; },
    onDamageTaken(dmg) { iDmgIn += dmg; },
    onKill() { totalKills += 1; iKills += 1; },
    onDeath() { totalDeaths += 1; sinceDeath = 0; },
    onSpawn() { iSpawns += 1; },
    frame(dt, speed, alive) {
      if (dt <= 0) return; // Pause → nicht mitzählen
      totalTime += dt; iTime += dt; sinceDeath += dt;
      iSpeedSum += speed * dt; // zeitgewichtetes Ø-Tempo
      if (alive > iPeak) iPeak = alive;
    },
    takeSnapshot(state) {
      const snap: RunSnapshot = {
        t: Math.round(totalTime),
        alive: state.alive,
        peak: Math.max(iPeak, state.alive),
        target: state.target,
        spawns: iSpawns,
        hp: Math.round(state.hp),
        hpPct: state.hpMax > 0 ? Math.round((state.hp / state.hpMax) * 100) : 0,
        spd: iTime > 0 ? r1(iSpeedSum / iTime) : 0,
        surv: Math.round(sinceDeath),
        deaths: totalDeaths,
        kills: iKills,
        kpm: totalTime > 0 ? r1((totalKills / totalTime) * 60) : 0,
        dpsOut: iTime > 0 ? r1(iDmgOut / iTime) : 0,
        dpsIn: iTime > 0 ? r1(iDmgIn / iTime) : 0,
        acc: totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0, // kumuliert (kein Intervall-Artefakt >100%)
        geld: state.geld,
        level: state.level,
        mk: state.mk,
        heat: state.heat,
        mix: state.mix,
      };
      // Intervall zurücksetzen (Peak startet beim aktuellen Stand)
      iTime = 0; iSpeedSum = 0; iPeak = state.alive; iSpawns = 0;
      iKills = 0; iDmgOut = 0; iDmgIn = 0;
      return snap;
    },
  };
}
