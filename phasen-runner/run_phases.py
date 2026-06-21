#!/usr/bin/env python3
"""Deterministischer Phasen-Orchestrator fuer Claude Code (headless).

Warum: Der Stop-Hook feuert NICHT zuverlaessig (stilles Turn-Ende, API-Fehler
-> StopFailure (read-only), Interrupt, max_turns). Dieser Orchestrator macht
die Schleife unabhaengig vom Agenten:

  * ruft `claude -p` pro Phase auf, haelt dieselbe Session per --resume,
  * zaehlt die Phasen SELBST (nicht das Modell),
  * wiederholt bei transienten Fehlern (rate_limit/overloaded/...) mit Backoff,
  * speichert Fortschritt -> nach Abbruch/Interrupt einfach erneut starten.

Bedienung:
  1. phases.json mit deinen Phasen-Prompts fuellen (Liste, ein Eintrag = eine Phase).
  2. In ChaosTankNew:  python phasen-runner/run_phases.py
  3. Abgebrochen? Einfach nochmal starten - er macht bei der naechsten offenen Phase weiter.
     Komplett neu:  python phasen-runner/run_phases.py --reset
"""
import json
import os
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(HERE)  # ChaosTankNew
PHASES_FILE = os.path.join(HERE, "phases.json")
PROGRESS_FILE = os.path.join(HERE, "phase-progress.json")

MAX_RETRIES = 5
BACKOFF_BASE = 15  # Sekunden, linear steigend pro Versuch

# claude-Binary finden (auf Windows i.d.R. claude.cmd)
CLAUDE = os.environ.get("CLAUDE_BIN") or shutil.which("claude") or shutil.which("claude.cmd")

# Tools/Permissions fuer den headless-Lauf. Bei Bedarf einschraenken:
#   PERM = ["--permission-mode", "acceptEdits", "--allowedTools", "Bash,Read,Edit,Write"]
PERM = ["--dangerously-skip-permissions"]


def die(msg):
    print(f"FEHLER: {msg}", file=sys.stderr)
    sys.exit(1)


def load_phases():
    if not os.path.exists(PHASES_FILE):
        die(f"{PHASES_FILE} fehlt. Lege sie an (siehe Vorlage).")
    with open(PHASES_FILE, encoding="utf-8") as f:
        data = json.load(f)
    phases = data.get("phases", [])
    if not phases:
        die("phases.json enthaelt keine Phasen.")
    return phases


def load_progress():
    try:
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"session_id": None, "done": 0}


def save_progress(p):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(p, f, ensure_ascii=False, indent=2)


def run_phase(prompt, session_id):
    cmd = [CLAUDE, "-p", prompt, "--output-format", "json", *PERM]
    if session_id:
        cmd += ["--resume", session_id]
    return subprocess.run(cmd, capture_output=True, text=True, cwd=PROJECT)


def main():
    if "--reset" in sys.argv:
        save_progress({"session_id": None, "done": 0})
        print("Fortschritt zurueckgesetzt.")

    if not CLAUDE:
        die("`claude` nicht gefunden. Setze CLAUDE_BIN oder pruefe die PATH-Installation.")

    phases = load_phases()
    total = len(phases)
    prog = load_progress()
    print(f"Phasen gesamt: {total} | bereits erledigt: {prog['done']} | Start ab Phase {prog['done'] + 1}")

    for idx in range(prog["done"], total):
        phase_no = idx + 1
        prompt = phases[idx]
        attempt = 0
        while True:
            attempt += 1
            print(f"\n[Phase {phase_no}/{total}] Versuch {attempt}  ->  {prompt[:70].strip()}...")
            proc = run_phase(prompt, prog["session_id"])

            data = {}
            if proc.stdout:
                try:
                    data = json.loads(proc.stdout)
                except json.JSONDecodeError:
                    data = {}

            # Session-ID sichern, sobald vorhanden (auch bei Fehlern -> sauberes Resume)
            sid = data.get("session_id")
            if sid:
                prog["session_id"] = sid

            ok = (proc.returncode == 0) and not data.get("is_error", False)
            if ok:
                prog["done"] = phase_no
                save_progress(prog)
                cost = data.get("total_cost_usd", "?")
                turns = data.get("num_turns", "?")
                print(f"[Phase {phase_no}] OK  (turns={turns}, kosten={cost})")
                break

            # Fehlerfall -> retry mit Backoff
            save_progress(prog)
            reason = data.get("subtype") or (proc.stderr or "unbekannt").strip().splitlines()[-1:]
            print(f"[Phase {phase_no}] Fehlversuch ({reason}). returncode={proc.returncode}")
            if attempt >= MAX_RETRIES:
                die(f"Phase {phase_no} nach {attempt} Versuchen fehlgeschlagen. "
                    f"Erneut starten setzt hier wieder an.\nstderr:\n{proc.stderr[:800]}")
            wait = BACKOFF_BASE * attempt
            print(f"[Phase {phase_no}] warte {wait}s und wiederhole ...")
            time.sleep(wait)

    print(f"\nAlle {total} Phasen erledigt. Session: {prog['session_id']}")


if __name__ == "__main__":
    main()
