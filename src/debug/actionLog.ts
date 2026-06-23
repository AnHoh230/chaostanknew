/**
 * Run-Action-Log: schreibt Spieler-/Welt-Ereignisse pro Run über den Vite-Endpunkt
 * /__log nach logs/run-<NNN>.<kategorie>.log. Aufgeteilt in mehrere Dateien, damit
 * jede für sich lesbar bleibt (statt einer riesigen Sammeldatei):
 *   - snap   : periodische Diagnose-Snapshots (Verlauf/Kennzahlen) — die Balance-Sicht.
 *   - combat : Kampf-Aktionen (Schuss/Salve/DoT/Ernte/Dash/Nachladen/Ult …).
 *   - event  : Meilensteine (Klassenwahl/Flow/Evolution/Tod/Respawn/Regler/Run-Start+Ende).
 * Degradiert geräuschlos, wenn der Endpunkt fehlt (z. B. Produktions-Build/Pages).
 */
export interface ActionLog {
  log(type: string, fields?: Record<string, unknown>): void;
  tail(n?: number): string[];
  runId(): number;
}

/** Snapshots eigene Datei; Meilensteine in 'event'; alles andere ist 'combat'. */
const EVENT_TYPES = new Set([
  'class', 'flow', 'evolution', 'run.start', 'run.over', 'player.death', 'player.respawn', 'regler',
]);
function categoryOf(type: string): 'snap' | 'combat' | 'event' {
  if (type === 'snap') return 'snap';
  if (EVENT_TYPES.has(type)) return 'event';
  return 'combat';
}

function now(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : 0;
}

export function createActionLog(): ActionLog {
  let run = 0;
  let ready = false;
  const t0 = now();
  const buffers: Record<string, string[]> = {}; // pro Kategorie ein Puffer
  const tailBuf: string[] = []; // alle Zeilen gemischt (für Konsole/Inspect, in-memory)

  function flush(useBeacon = false): void {
    if (!ready) return;
    for (const cat of Object.keys(buffers)) {
      const buf = buffers[cat]!;
      if (buf.length === 0) continue;
      const body = buf.join('');
      buf.length = 0;
      const url = `/__log?run=${run}&cat=${cat}`;
      try {
        if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(url, body);
        } else {
          void fetch(url, { method: 'POST', body, keepalive: true }).catch(() => {});
        }
      } catch {
        /* Log-Fehler dürfen das Spiel nie stören */
      }
    }
  }

  function log(type: string, fields?: Record<string, unknown>): void {
    const ms = Math.round(now() - t0);
    const line = `${ms} ${type}${fields ? ' ' + JSON.stringify(fields) : ''}\n`;
    (buffers[categoryOf(type)] ??= []).push(line);
    tailBuf.push(line.trimEnd());
    if (tailBuf.length > 300) tailBuf.shift();
  }

  // Run-Nummer vom Server holen, dann scharf schalten.
  void fetch('/__log/new')
    .then((r) => r.json())
    .then((d: { run: number }) => {
      run = d.run;
      ready = true;
      log('run.start', { ts: Math.round(now()) });
      flush();
    })
    .catch(() => {
      ready = false;
    });

  if (typeof window !== 'undefined') {
    window.setInterval(() => flush(), 1500);
    window.addEventListener('beforeunload', () => flush(true));
  }

  return { log, tail: (n = 80) => tailBuf.slice(-n), runId: () => run };
}
