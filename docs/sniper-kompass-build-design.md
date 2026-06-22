# Sniper / Kommandant — Build-System & Bühnenmeister-Director

**Status:** Design-Diskussion. **Nichts davon ist implementiert.**
**Stand:** 2026-06-22
**Offene Kernfrage:** Lohnt sich dieses ganze System den Bauaufwand — oder ist eine
einfachere Entscheidung beim Kompass-Skillen die bessere Wahl? → siehe **§6**.

Dieses Dokument hält fest, was in der langen Design-Runde (Claude + GPT + Nutzer)
*konzeptionell gefestigt* wurde und was *noch offen / unbewiesen* ist. Es ist ein
Entscheidungs-Dokument, kein Bau-Plan.

---

## 0. Worum es geht

Der Sniper/Kommandant ist kein Scharfschütze, sondern ein **Kommandant**:

> Gottansicht öffnen → Ziele wählen → Befehl auslösen

**Multitargeting ist der Grundkörper** — immer da, **nicht** an „Befehl" gebunden.
Was die Zielauswahl *bedeutet*, formt der Spieler über drei Slots, die mit Anteilen
aus drei Kräften gefüllt werden:

- **B = Befehl** — ordnen, priorisieren, bündeln, auslösen
- **Z = Zustand** — Wunden/Gift legen, reifen, brechen
- **R = Raum** — Felder, Anker, Ausbrüche

Ziel: **viele spürbar verschiedene Builds aus einem einzigen Grundmodus.**

---

## 1. Das Build-Modell (konzeptionell gefestigt)

### 1.1 Drei Gefäß-Slots
Jeder Slot hat ein festes Thema und wird im Spiel mit B/Z/R-Anteilen gefüllt
(Summe 100). Bei 100 **kristallisiert** der Slot (wird fest), der nächste öffnet.

| Slot | Thema | Frage |
|---|---|---|
| 1 | Zielkörper | Was wird aus einem gewählten Ziel? |
| 2 | Folgewirkung | Was passiert nach dem Treffer? |
| 3 | Auswertung | Wie eskaliert/entlädt die Kette? |

Zielkapazität wächst mit den Slots: Start 1 → Slot 1 = 2 → Slot 2 = 3 → Slot 3 = 4.

### 1.2 Linse durch Schärfe
Wie stark eine Achse dominiert, bestimmt, wie stark *fremde* Achsen umgedeutet werden:

- **70+ (Dominanz)** → volle Linse: Fremdanteile geben ihre Eigennatur auf
- **50–69 (Mitträger)** → Teil-Linse: Fremdanteile bleiben halb eigenständig
- **keine Achse über ~50** → keine Linse: **Resonanz-Modus**

Schwellen (Anti-Frust, keine Prozent-Fummelei): 10 Spur · 25 Nebenschicht · 50 Mitträger · 70 Dominanz. Erreichte Schwellen bleiben erhalten, auch wenn man umlenkt.

### 1.3 Das Verb/Objekt-Prinzip ← der Schlüssel
Der zentrale Durchbruch der Diskussion (von GPT, von Claude bestätigt):

> **Die Achse behält ihre Funktion. Das Paradigma setzt nur das Objekt, worauf die Funktion zielt.**

- **Befehl** ist immer *ordnen / priorisieren / auslösen* — aber
  - im **Befehl**-Paradigma ordnet er **Ziele**
  - im **Zustand**-Paradigma ordnet er **Wunden**
  - im **Raum**-Paradigma ordnet er **Anker**

Damit ist `B-Z-R ≠ Z-B-R` (echte Reihenfolge-Individualität), ohne dass eine Achse
ihre Identität *verliert*. Multitargeting kommt dabei nie „zurück", weil es nie weg
war — es ist der Grundkörper, nicht Befehl.

**Harte Regel (Dot-Linse):** Befehl bedeutet im Zustand-Paradigma **nie** „reift
schneller" (Beschleunigung), sondern **Wunddruck umlagern** — bündeln, umleiten,
priorisieren, zünden. Sonst kollabieren `Z-Z-B/Z-B-B` und `Z-Z-R/Z-B-R`.

### 1.4 Resonanz-Build (ausgewogen, 33/33/33)
Kein lauwarmer Mittelweg, sondern ein **eigener Stil**: keine Linse → alle Achsen
wirken pur, aber schwach. Der Peak kommt aus der **Verkettung** (Combo): wenn ein
Ziel gleichzeitig markiert + verwundet + verankert ist, entsteht Konvergenz.

- **Spezialist** = hohe Einzelwirkung
- **Resonanz** = hohe Verkettungswirkung

---

## 2. Beweis-Stand: die Dot-Linse (Z-Paradigma)

### 2.1 BEWIESEN — die 9 Identitäten tragen (als Geschichten)
Claude und GPT haben unabhängig dieselben 9 Identitäten *und* denselben dünnen Punkt
gefunden (Konvergenz = starkes Signal). Drei Familien nach Slot 2:

- `Z-Z-*` = Wunden **vertiefen** (bleiben, wo sie sind)
- `Z-B-*` = Wunddruck **lenken/bündeln**
- `Z-R-*` = Wunden **wandern**, verseuchen Raum

| Build | Name | Kern |
|---|---|---|
| Z-Z-Z | Garten | säen, reifen, von selbst ernten |
| Z-Z-B | Henker | reifen lassen, gezielt zünden |
| Z-Z-R | Zeitbombe | reifen, räumlich aufplatzen |
| Z-B-Z | Konzentrator | Gift auf ein Ziel bündeln, fetter Bruch |
| Z-B-B | Dirigent | Wunddruck umleiten + dirigiert zünden |
| Z-B-R | Sprengmeister | bündeln, dann Flächen-Granate |
| Z-R-Z | Patient Null | Seuche springt, alle ernten |
| Z-R-B | Seuchen-General | Seuche + dirigierte Kettenexekution |
| Z-R-R | Pestwolke | springen + explodieren, Kettenreaktion |

### 2.2 NICHT bewiesen — die Spielbarkeit
Die 9 Geschichten setzen still ein **kooperatives Board** voraus (Gegner leben lange,
stehen in Gruppen, töten nicht sofort). Bewiesen ist die **Identität**, nicht das
**Spielerlebnis**. Das hängt komplett am Board (→ §3, §4).

---

## 3. Der Bühnenmeister-Director (Prinzip gefestigt)

Claude, GPT *und* die Intuition des Nutzers konvergierten unabhängig auf dieselbe
Lösung: Der Director kehrt zurück — **nicht als Gegenspieler, sondern als Bühnenmeister.**

> Alter Director: „Ich sehe deinen Build und **bestrafe** ihn." (verworfen)
> Neuer Director: „Ich sehe deinen Build und gebe ihm eine **Bühne mit Druck**."

Er liest *ausgespielte Kampfspuren* (nicht den Kompass/die Absicht) und baut die Lage,
auf der dein Build beweisen kann, was er ist.

### 3.1 Wie es spannend bleibt (nicht „Streichelzoo")
Die Schwierigkeit verschiebt sich von *„hast du den richtigen Build?"* zu
*„spielst du deinen Build gut genug?"*.

- **Intrinsische Build-Spannung:** Die richtige Bühne *enthüllt* die schwere
  Entscheidung im Build. Dot/Garten gegen zähe Gegner → **Gier vs. Sicherheit**:
  jeder reifende Gegner *lebt* und beschießt dich. Mehr reifen = fettere Ernte =
  mehr Gefahr. Gegen fragile Gegner gibt's diese Entscheidung gar nicht.
- **Drei Druck-Hebel (ohne die Kernmechanik zu neutralisieren):**
  1. **Menge & Eskalation** — mehr von der passenden Art, dichter, schneller.
  2. **Restbedrohung** — eine Beimischung, die dein Build *nicht* elegant löst
     (z. B. schnelle Späher, die dich aus der Distanz drängen). Sie löschen **kein
     Gift** — sie teilen nur deine Aufmerksamkeit.
  3. **Reaktions-Lag** — die Bühne kommt erst, wenn du den Build *ausgespielt* hast.
     Im Formungs-Fenster reagiert die Welt noch auf den alten Build.

### 3.2 Die Grenze, die alles trägt
> Der Director darf jeden Hebel ziehen, der dich **fordert** (Menge, Tempo, Formation,
> Leben, Ablenkung). Er darf keinen ziehen, der deine **Kernmechanik abschaltet.**

„Du hast Feuer" → Formationen, bei denen Feuer geil *und gefährlich* aussieht. Nie →
feuerimmune Gegner. Die Bühne testet **Ausführung**, nie **Werkzeugwahl**.

---

## 4. Das Board-Prinzip

**Nicht** „jede Lage trägt alle Builds" (das wäre Einheitsbrei) — sondern
**„jeder Build hat irgendeine Lage."** Ein Build darf situativ schwach sein; er darf
nur nicht *nirgends* dran sein (= toter Content).

Was jede Dot-Familie von der Bühne braucht:

| Familie | Braucht | Sonst |
|---|---|---|
| `Z-Z-*` (vertiefen) | zähe Panzer, Druckkörper, Eliteziele — **Überlebenszeit** | nur schwacher Direktschaden |
| `Z-B-*` (lenken) | mehrere mittlere Gegner + Anker, **verteilter Wunddruck** | `Z-B-B` sieht aus wie `Z-Z-B` |
| `Z-R-*` (wandern) | **Cluster**, Begleitpanzer, Schwarm um Elite, enge Bewegung | nur Einzelgift mit Mini-Splash |

Das verbindet sich mit dem Audit-Befund (siehe Diskussion): das aktuelle Board liefert
nur **eine** Lage (7 feste, fragile Gegner, Einzelspawn aus 360°, Sofort-Kill-Zwang) →
2 von 3 Paradigmen laufen ins Leere.

---

## 5. Methodische Lehre (für die GPT/Claude-Kreuzarbeit)
Zwei Agenten an *derselben* Aufgabe messen **Robustheit, nicht Wahrheit** — sie decken
auf, wo sie sich *unterscheiden* (Wackelstellen), sind aber blind für das, was beide
*voraussetzen* (geteilte blinde Flecken). Blinde Flecken deckt nur **Variation in der
Aufgabe** auf (einer baut, einer greift an), nicht Variation im Agenten.

---

## 6. OFFENE FRAGEN — die Lohnt-sich-Entscheidung

**Das ist der eigentliche nächste Knoten.** Alles oben ist *kohärent* — bewiesen ist
aber nur, dass es auf dem Papier zusammenpasst, nicht dass es den Aufwand wert ist.

### 6.1 Aufwand vs. Ertrag (ehrlich)
Ein *vollständiger* Build dieses Systems heißt:
- **27 Kontext-Wirkungen** (3 Linsen × 3 Slots × 3 Achsen) konkret definieren + bauen
- ~13 Zielzustände (marked/grift/ripe/anchor/field_residue/…) + sichtbare Spuren
- Kompass-Formung + Schwellen-HUD + Schwellen-Slomo
- Bühnenmeister-Director (Bühnen-Logik pro Build + StyleTracker-Ausbau)
- Enemy Families + Cluster-Spawn + Formationen
→ Größenordnung **Monate**, nicht Tage.

### 6.2 Die ungelösten Designpunkte
- **Spielbarkeit** der Builds — ungetestet (nur Geschichten, kein Gefecht).
- **Auto- vs. manuelle Zielauswahl** — offen. Befehl *braucht* manuelle Kontrolle
  (Fokus/Reihenfolge), Dot/Raum sind mit Auto ok. Vorschlag: Hybrid (Rechtsklick
  tippen = Auto-Schnellbefehl, halten = manuelle Kommandosicht).
- **Kristallisierung vs. variable Lagen** — Builds legen sich fest (kristallisieren),
  Lagen wechseln. Wie verhindert man, dass eine Formung auf der falschen Lage strandet?

### 6.3 DIE Entscheidung beim Kompass-Skillen
Drei Skalierungsstufen stehen zur Wahl:

- **(A) Volles Gefäß-Kompass-System** (Spec 3.1) — das hier beschriebene. Reich, 27+
  Builds, fließende Formung. Höchster Aufwand, höchstes Risiko, höchster Reichtum.
- **(B) Diskrete Slot-Wahl** — bei jeder Stufe wählst du B/Z/R für *einen* Slot
  (Level-up-Wahl statt fließendem Kompass). Klar, leichter zu bauen, weniger
  organisch. Immer noch ~27 Kombinationen, aber ohne Mischanteile/Resonanz.
- **(C) Ein Paradigma pro Run** — du wählst früh *eine* Kraft (B/Z/R) und vertiefst
  sie. 3 tiefe Wege statt 27, kein Kombinations-Aufwand. Schlankste, sicherste Option.

---

## 7. Was die Entscheidung billig macht

Die Lohnt-sich-Frage ist **nicht** durch mehr Diskussion zu beantworten — nur durch
einen minimalen spielbaren Test. Der billigste Beweis vor dem Voll-Bau:

> Nimm **eine** Dot-Familie (z. B. `Z-Z-*`, der Garten). Baue ihre **Bühne als
> Director-Regel** (welche Gegner, welcher Druck-Hebel, wo die Gier/Sicherheits-
> Entscheidung kippt) + die Gegenprobe (eine Bühne, wo sie *schlecht* wäre).
> Dann spielen — und sehen, ob „verzögerter Schaden" zu „Garten" wird.

Trägt dieser eine Schnitt im echten Gefecht, skaliert das Vertrauen aufs ganze System.
Trägt er nicht, weißt du es **vor** den Monaten Arbeit — und Option (B)/(C) wird zur
ernsthaften Alternative.
