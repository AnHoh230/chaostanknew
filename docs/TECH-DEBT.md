# Technische Schulden & vertagte Design-Themen

Sammelstelle für Dinge, die bewusst NICHT „mal eben" gefixt werden — sie brauchen
eine eigene Brainstorm-/Design-Session, bevor implementiert wird.

---

## TD-1 — „Zu offensichtliche KI" (braucht eigene Brainstorm-Session)

**Symptom (Nutzer, 2026-06-20):** Die Gegner wirken mechanisch/durchschaubar. Sie
- weichen Schüssen **nicht** aus,
- **fliehen** kaum,
- **entscheiden** sich nicht sichtbar (kein lesbares Zögern/Umschwenken).

Folge: Der Spieler „fährt nur rum und sucht Items" — der Kampf trägt sich nicht aus
sich selbst, weil der Gegner keine spürbaren eigenen Absichten zeigt.

**Warum kein Schnellfix:** Das ist kein einzelner Bug, sondern das Herz der
„lebenden Welt / Gegner mit eigenem Leben"-Vision. Es berührt das Utility-AI-Modell
(Motive, Passung, Schwellen), die Bewegungs-Ausführung (Ausweich-Manöver,
Flucht-Pfade), und die **Lesbarkeit** (der Spieler muss die Entscheidung *sehen*).
Vorschnelles Schrauben an Einzelwerten würde es nur anders-kaputt machen.

**Nächster Schritt:** Eigene Brainstorm-Session — Fragen u. a.:
- Was soll ein Gegner *sichtbar* tun, das ihn „lebendig" macht (Ausweich-Roll bei
  Beschuss? Deckung suchen? Rückzug bei niedrigem HP mit Sichtbarkeit?)?
- Wie wird die Entscheidung **lesbar** (Tell/Animation/Spruch), nicht nur ein
  Zahlen-Flip?
- Wie verzahnt sich das mit Dodge (SH3) und den Motiven, ohne den 0,5-s-Frame-Spam?
- Mess-Overlay zuerst (Observability): Entscheidung & Grund pro Gegner sichtbar
  machen, bevor getunt wird.

**Erste Fassung in Arbeit** (Spec `docs/superpowers/specs/2026-06-20-engagement-zonen-ki-erste-fassung-design.md`):
Engagement-Zonen-Modell + Scouten + Mess-Overlay, damit die Gegner überhaupt
*etwas* tun (kein totes Stehen). **Bewusst nur erste Fassung.**

**Noch zu vertiefen (Folgearbeit, eigene Sessions):**
- Motiv-spezifische Zonen (Platzhirsch stürmt kurz, Aasgeier kitet weit, Angsthase
  feuert nur aus Sicherheit) — die erste Fassung ist für alle Motive gleich.
- **Ausweichen/Dodge-Reflex** unter Beschuss (das `dodge`-Stat existiert schon, wird
  aber noch nicht durch ein Manöver genutzt).
- Feineres Fliehen: Schwellen, Flucht-Pfade, **lesbare** Entscheidung (Tell).
- Gruppen-/Schwarm-Verhalten (hängt mit M6 zusammen — patent-zahm halten!).
- Rolle des Utility-/Motiv-Gehirns: in der ersten Fassung für die Bewegung
  stillgelegt; klären, ob es als Modulator der Zonen zurückkommt.

**Status:** erste Fassung wird gebaut; Vertiefung offen.

---

## TD-2 — Balance der Gegner-HP (gear-basiert) noch ungetestet

Seit „Gegner-Stats aus Ausrüstung" sind Gegner deutlich zäher (MK1 ~322 statt ~100
HP). Gewollt, aber das Früh-Spiel-Tempo (bevor der Spieler eine Waffe hat) ist
ungetestet. Über den Run-Log feintunen (`BASE_HP` / Item-Beitrag in
`enemy/enemyStats.ts`). Kein Design-Problem, nur Tuning per Playtest.

---

## TD-3 — `enemyLevelStats` ist toter Code

Seit der Umstellung auf `enemyCombatStats` wird `enemyLevelStats` (enemy.ts) nirgends
mehr benutzt, ist aber noch exportiert. Bei Gelegenheit entfernen.

---

## TD-4 — Level UND MK-Stufen: doppelte Funktion fürs gleiche Problem (neu framen)

Aktuell hat ein Gegner ein **Level** UND eine daraus abgeleitete **MK-Stufe**
(`enemyMk(level)`). Beim Spieler dasselbe Muster: Level (XP) schaltet MK frei. Zwei
Achsen für **denselben** Fortschritt — fühlt sich doppelt an (Nutzer, 2026-06-20).

**Leaning (Nutzer):** wahrscheinlich nur EIN Fortschritt — ein **XP-Balken, der
direkt die MK-Stufen füllt**, kein separates Level daneben. Umsetzung *später*.

**Muss vor dem Anfassen neu geframt werden:**
- Was *ist* eine MK-Stufe genau (nur Gear-Tier? + optionaler Veteran-Bonus?).
- Verhältnis zum gear-basierten Stat-Modell (B2/TD-2): wenn Stats aus Gear kommen
  und Gear-MK aus der Stufe, ist die Stufe der *einzige* Fortschritts-Knopf — passt
  zur XP→MK-Idee.
- Hängt an der offenen Design-Frage „soll die Stufe einen *direkten* Bonus geben
  (Veteran zäher bei gleichem Gear) oder rein über Gear wirken?".
- Ein XP→MK-Balken für Spieler UND Gegner (Symmetrie).

**Status:** offen, vertagt (nach dem KI-Thema TD-1).
