/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Run-Action-Log: schreibt pro Spiel-Run eine Datei logs/run-<NNN>.log.
 * GET  /__log/new      → { run: N }   (nächste freie Nummer, Datei noch nicht angelegt)
 * POST /__log?run=N    → Body wird an logs/run-<NNN>.log angehängt
 * So kann der letzte Run jederzeit als Datei nachgelesen werden (höchste Nummer).
 */
function actionLogPlugin(): Plugin {
  let root = process.cwd();
  const nextRun = (dir: string): number => {
    try {
      const files = fs.readdirSync(dir).filter((f) => /^run-\d+\.log$/.test(f));
      return files.reduce((m, f) => Math.max(m, parseInt(f.slice(4), 10) || 0), 0) + 1;
    } catch {
      return 1;
    }
  };
  return {
    name: 'action-log',
    configResolved(c) {
      root = c.root;
    },
    configureServer(server) {
      const dir = path.resolve(root, 'logs');
      fs.mkdirSync(dir, { recursive: true });
      server.middlewares.use('/__log', (req, res) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ run: nextRun(dir) }));
          return;
        }
        if (req.method === 'POST') {
          const run = new URL(req.url ?? '', 'http://x').searchParams.get('run') ?? '0';
          const file = path.join(dir, `run-${String(run).padStart(3, '0')}.log`);
          const chunks: Buffer[] = [];
          req.on('data', (c: Buffer) => chunks.push(c));
          req.on('end', () => {
            try {
              fs.appendFileSync(file, Buffer.concat(chunks));
            } catch {
              /* Log-Fehler dürfen das Spiel nie stören */
            }
            res.statusCode = 204;
            res.end();
          });
          return;
        }
        res.statusCode = 405;
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [actionLogPlugin()],
  server: {
    open: false,
    port: 5174,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
