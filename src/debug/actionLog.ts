/**
 * Run-Action-Log: schreibt Spieler-Aktionen (Schüsse, Bewegung, Shop-Käufe …) pro
 * Run gestaffelt über den Vite-Endpunkt /__log nach logs/run-<NNN>.log. Damit lässt
 * sich der letzte Run als Datei nachlesen, statt das Geschehen mündlich zu schildern.
 * Degradiert geräuschlos, wenn der Endpunkt fehlt (z. B. Produktions-Build).
 */
export interface ActionLog {
  log(type: string, fields?: Record<string, unknown>): void;
  tail(n?: number): string[];
  runId(): number;
}

function now(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : 0;
}

export function createActionLog(): ActionLog {
  let run = 0;
  let ready = false;
  const t0 = now();
  const buffer: string[] = [];
  const tailBuf: string[] = [];

  function flush(useBeacon = false): void {
    if (!ready || buffer.length === 0) return;
    const body = buffer.join('');
    buffer.length = 0;
    const url = `/__log?run=${run}`;
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

  function log(type: string, fields?: Record<string, unknown>): void {
    const ms = Math.round(now() - t0);
    const line = `${ms} ${type}${fields ? ' ' + JSON.stringify(fields) : ''}\n`;
    buffer.push(line);
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
