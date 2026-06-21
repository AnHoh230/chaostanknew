#!/usr/bin/env python3
"""Claude Code Stop-Hook: haelt den Lauf am Leben, bis alle Phasen erledigt sind.

Robuste Pfadaufloesung: findet phase-state.json relativ zur Projektwurzel
(ueber CLAUDE_PROJECT_DIR oder die eigene Skript-Position) - NICHT ueber das
aktuelle Arbeitsverzeichnis. Das cwd-abhaengige Lesen war die Ursache fuer
unzuverlaessiges Ausloesen.
"""
import json
import os
import sys


def project_dir():
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env and os.path.isdir(env):
        return env
    # <proj>/.claude/hooks/phase-stop-hook.py -> <proj>
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(here))


STATE = os.path.join(project_dir(), ".claude", "phase-state.json")
SAFETY_FACTOR = 4  # harte Obergrenze = total * SAFETY_FACTOR Hook-Durchlaeufe


def load_state():
    try:
        with open(STATE, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def save(state):
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def main():
    try:
        json.load(sys.stdin)  # Hook-Payload wird nicht weiter gebraucht
    except Exception:
        pass

    state = load_state()
    if not state or not state.get("active"):
        sys.exit(0)  # kein aktiver Lauf -> Stop erlauben

    current = int(state.get("current", 0))
    total = int(state.get("total", 0))
    iters = int(state.get("iterations", 0)) + 1
    state["iterations"] = iters

    # Fertig -> abschliessen, Stop erlauben
    if total <= 0 or current >= total:
        state["active"] = False
        save(state)
        sys.exit(0)

    # Sicherheits-Limit -> zwangsweise stoppen
    if iters > total * SAFETY_FACTOR:
        state["active"] = False
        save(state)
        sys.stderr.write("Phasen-Runner: Sicherheits-Limit erreicht, Lauf gestoppt.\n")
        sys.exit(0)

    save(state)
    reason = (
        f"PHASEN-RUNNER AKTIV - {current}/{total} Phasen erledigt. Stoppe NICHT. "
        f"Bearbeite jetzt Phase {current + 1} vollstaendig. Erhoehe danach \"current\" "
        f"in .claude/phase-state.json um genau 1. Erst wenn current == total ist der "
        f"Lauf beendet."
    )
    print(json.dumps({"decision": "block", "reason": reason}, ensure_ascii=False))
    sys.exit(0)


if __name__ == "__main__":
    main()
