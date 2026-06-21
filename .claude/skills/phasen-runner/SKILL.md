---
name: phasen-runner
description: >
  Aktiviert einen mehrphasigen Auto-Continue-Lauf in Claude Code. Trigger:
  "wir haben N Phasen", "X Phasen", "phasenweise abarbeiten", "arbeite alle
  Phasen durch", "Phasen-Runner", "nicht stoppen bis alle Phasen fertig sind".
  Legt einen Phasen-Zustand an und lässt den Stop-Hook den Lauf fortsetzen,
  bis alle Phasen erledigt sind.
---

# Phasen-Runner

Wenn dieser Skill aktiviert wird, soll Claude einen mehrphasigen Lauf
selbstständig bis zum Ende durcharbeiten, ohne dass der Mensch nach jeder
Phase "mach weiter" tippen muss.

## Setup (einmal zu Beginn des Laufs)

1. Bestimme die Gesamtzahl der Phasen `N` aus dem Auftrag des Nutzers.
2. Schreibe die Datei `.claude/phase-state.json` mit:
   ```json
   { "active": true, "current": 0, "total": N, "iterations": 0 }
   ```
3. Beginne mit **Phase 1**.

## Während des Laufs

- Arbeite immer **genau eine** Phase ab.
- Sobald eine Phase vollständig fertig ist, erhöhe `"current"` in
  `.claude/phase-state.json` um **genau 1**.
- Stoppe NICHT von dir aus. Der `Stop`-Hook blockiert das Beenden und schickt
  dich automatisch in die nächste Phase, solange `current < total`.

## Abschluss

- Wenn `current == total`, setze `"active": false` und beende den Lauf mit
  einer kurzen Zusammenfassung aller 10 Phasen.

## Sicherheits-Hinweis

Der Hook hat eine harte Obergrenze (`total * 4` Durchläufe). Wird sie erreicht,
wird der Lauf zwangsweise gestoppt — Schutz gegen Endlosschleifen, falls eine
Phase den Zähler nicht erhöht.
