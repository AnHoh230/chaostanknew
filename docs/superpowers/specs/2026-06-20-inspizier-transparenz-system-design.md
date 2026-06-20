# Inspizier- & Transparenz-System — Detail-Spec

- **Datum:** 2026-06-20 · **Status:** Entwurf zum Review
- **Art:** Subsystem-Detail-Spec (gehört unter die Master-Spec `2026-06-18-chaostank-neu-design.md`).
- **Warum jetzt:** Macht den Gegner-Build **lesbar**, *bevor* der Shop-Overhaul (SH3/SH5) Gegnern Auto-Turrets, Dodge, Module & Verhaltens-Kerne in die Hand gibt. Ohne dieses Tell wäre die kommende Gegner-Ökonomie unsichtbarer Zahlen-Nebel. Es ist außerdem die **Vorbereitung der Unique-Item-Jagd**: der Spieler scoutet, *wer was trägt*, bevor er jagt.
- **Verhältnis zum Shop-Overhaul:** Eigenständig. Der Shop-Overhaul (Spec folgt separat, SH1–SH6) ist geparkt. Diese Spec referenziert ihn nur an einer Stelle: die Karten-Zeile **„Aktive Booster"** bleibt leer, bis SH2 das Aktiv-Buff-Framework liefert; das Feld wird aber jetzt schon angelegt.

---

## 1. Ziel

Volle **Transparenz** über jeden Gegner-Panzer in zwei Tiefen, ohne den Spielfluss zu zerstören:

- **(M) Echtzeit-Übersichtskarte** — schneller Überblick „wer ist wo, wer ist gefährlich", Welt läuft weiter.
- **(I) Modaler Tiefblick** — alles über *einen* Gegner (Stats, Ausrüstung, Inventar, Historie), Welt pausiert.

Erfolgskriterium: Der Spieler kann jederzeit ablesen, **was** ein Gegner trägt und **warum** er es trägt (Motiv/Historie), und so seine Jagd planen.

**Nicht-Ziel (bewusst später):** Keine sichtbaren Teile am Panzer-Mesh (kommt mit den Asset-/Visual-Phasen). Diese Spec liefert nur die *Informations*-Schicht (M-Karte + I-Karte), nicht die *visuelle* Schicht am Modell.

---

## 2. Scope

**In Scope**
1. Taste **M**: große Echtzeit-Übersichtskarte als Overlay; Welt läuft weiter; Maus über einen Panzer → kondensiertes **Maus-Menü** (Tooltip am Cursor).
2. Taste **I**: im normalen Fahr-Bild den per Maus anvisierten Gegner inspizieren → **Pause + Abdunklung + hervorgehobene Info-Karte**.
3. **Hover-Erkennung** des Gegners unter dem Mauszeiger im Fahr-Bild + kleiner **„[I] Inspizieren"**-Hinweis am anvisierten Gegner.
4. Daten-Snapshot eines Gegners (Stats, Ausrüstung, Inventar, leeres Booster-Feld, Historie aus `akteBuch`).

**Out of Scope (diese Spec)**
- Sichtbare Teile/Effekte am Panzer-Mesh.
- Inspizieren des *eigenen* Panzers (eigenes Loadout sieht man im Shop).
- Inspizieren direkt *auf* der M-Karte (Punkt anklicken statt Panzer im Fahr-Bild). Architektur lässt es als leichten späteren Zusatz offen (siehe §9).
- Auto-Turret/Accuracy/Dodge-Werte (existieren erst nach SH3; die Karte zeigt nur, was im Datenmodell vorhanden ist).

---

## 3. Modus M — Echtzeit-Übersichtskarte

**Verhalten**
- Taste **M** schaltet die Karte an/aus. **Keine Pause** — `clock.simSpeed` bleibt unangetastet. Panzer fahren live über die Karte.
- Großes Overlay, mittig, ~ 60 % der kürzeren Bildschirmkante (quadratisch). Halbtransparenter Hintergrund, klarer Rahmen.
- **Spielerzentriert**, Reichweite ~150 Weltеinheiten (≈ 2,5× Eck-Minimap). Da Gegner im Ring 40–55 spawnen und Shop-Felder bei ±40/±85 liegen, zeigt das de facto „alles, was zählt".
- Inhalt (live pro Frame neu gezeichnet):
  - **Spieler** = heller Punkt in der Mitte + Blickrichtung.
  - **Gegner** = Punkt; benannte Rivalen **rot + größer**, normale orange.
  - **Shop-Felder** = cyan Marker.
  - Optionales Fadenkreuz/Gitter wie bei der Eck-Minimap.

**Maus-Menü (Hover)**
- Fährt der Cursor über einen Panzer-Punkt (Treffer-Radius in Pixeln), erscheint ein **Tooltip am Cursor** mit **kondensierten** Infos:
  - **Name** (rot, wenn benannt) · **Lvl · MK** · **HP-Balken** · **Motiv**.
- Tooltip folgt dem Cursor, verschwindet, wenn kein Punkt mehr getroffen wird. Kein Klick nötig, keine Pause.
- Die volle Karte gibt es über **I** (nicht hier) — bewusst, damit M „glanceable" bleibt.

---

## 4. Modus I — Modaler Tiefblick

**Auslösen**
- Im **Fahr-Bild** (nicht zwingend bei offener M-Karte): liegt ein Gegner **unter dem Mauszeiger** (Hover-Pick, §6) und der Spieler drückt **I**, dann:
  1. **Snapshot** des Gegners bauen (`buildEnemyInfo`, §7) — eingefroren.
  2. **Pause:** `prevSimSpeed = clock.simSpeed; clock.simSpeed = 0`.
  3. **Abdunkeln:** dunkles Vollbild-Overlay.
  4. **Info-Karte** mittig, hervorgehoben über dem Overlay.
- Liegt **kein** Gegner unter dem Cursor, passiert bei **I** nichts (optional kurzer Hinweis „kein Ziel unter dem Cursor").

**Schließen**
- **I**, **Esc** oder **Klick** auf das Overlay → Karte weg, Overlay weg, **`clock.simSpeed = prevSimSpeed`** (stellt den vorherigen Wert wieder her — robust gegenüber einem evtl. laufenden Reveal-Slowmo).

**Pause-Vertrag (wichtig):** Inspizieren **speichert** den vorherigen `simSpeed` und **stellt ihn wieder her**, statt hart auf `1` zu setzen. Damit kollidiert es nicht mit Reveal-Slowmo oder anderen Zeitfaktor-Nutzern. Solange die Karte offen ist, ignoriert der Inspizier-Code Reveal-Updates am `simSpeed` nicht — die Karte hält `0`, bis sie schließt (Reveal kann ohnehin nicht starten, weil die Welt steht).

**Inhalt der Info-Karte**
```
┌─ <NAME> ───────────────────────────── Lvl <L> · MK<M> ─┐
│ Motiv: <Motiv>  [· Archetyp: <Archetyp>  nur wenn benannt] │
├────────────────────────────────────────────────────────┤
│ STATS    HP <hp>/<maxHp> · Schaden <dmg> · Rüstung <arm> │
│          Tempo <spd> · Beutewert <loot>                  │
├────────────────────────────────────────────────────────┤
│ AUSRÜSTUNG  <Slot>  <Item-Name>            <Hauptwert>   │
│             … 5 Slots (Waffe/Wanne/Turm/Räder/Rüstung)  │
├────────────────────────────────────────────────────────┤
│ INVENTAR    <Item-Name>, <Item-Name>, …   (oder „leer") │
├────────────────────────────────────────────────────────┤
│ AKTIVE BOOSTER   — (kommt mit SH2) —                     │
├────────────────────────────────────────────────────────┤
│ HISTORIE    <b> Begegnungen · <s> Siege · <n> Niederl.  │
│             knappster Sieg: <p>% HP                      │
│             (bei „Panzer N": „Noch keine Geschichte …")  │
└────────────────────────────────────────────────────────┘
                  [I] / [Esc] schließen
```
- **Benannt** (z. B. „Garfild der Aasgeier"): Kopf zeigt Name + Motiv + Archetyp; Historie aus `akteBuch`.
- **Unbenannt** („Panzer 7"): Kopf zeigt Name + Motiv + Lvl·MK; Historie-Block = *„Noch keine Geschichte mit diesem Gegner."*; Ausrüstung/Inventar/Stats trotzdem voll lesbar.
- **MK** wird aus dem Level abgeleitet (`enemyMk(level)`), konsistent zur Ausrüstung.

---

## 5. Architektur & Bausteine

Kleine, klar abgegrenzte Einheiten (eine Verantwortung je Datei):

| Modul | Datei | Aufgabe | Abhängig von | Test |
|---|---|---|---|---|
| **EnemyInfo** | `src/inspect/enemyInfo.ts` | `buildEnemyInfo(enemy, akte) → EnemyInfo` (reiner, eingefrorener Snapshot) | Typen aus `enemy`, `akte`, `catalog`, `equipment` | ✓ pure (Vitest, Fakes) |
| **EnemyPick** | `src/inspect/enemyPick.ts` | `nearestToPointer(px, py, blips, maxPx) → id \| null` | nichts (reine Mathematik) | ✓ pure |
| **OverviewMap** | `src/ui/overviewMap.ts` | großes Live-Karten-Overlay + Hover-Tooltip | `minimapMath.projectBlip`, `enemyPick` | UI (Browser) |
| **InspectCard** | `src/ui/inspectCard.ts` | abgedunkeltes Modal + hervorgehobene Karte, rendert einen `EnemyInfo` | `EnemyInfo` | UI (Browser) |
| **Verdrahtung** | `src/main.ts` | Tasten M/I, Pointer-Tracking, Hover-Pick je Frame, „[I] Inspizieren"-Prompt, Pause-Toggle | alle obigen | Browser |

**Schnittstellen (Verträge)**

```ts
// enemyInfo.ts
export interface EnemyInfoEquip { slot: Slot; name: string; stat: string } // stat = "28 Schaden"
export interface EnemyInfoHistory {
  hasHistory: boolean; begegnungen: number; siege: number; niederlagen: number; knappsterSiegPct: number;
}
export interface EnemyInfo {
  id: string;
  name: string;            // "Panzer 7" oder "Garfild der Aasgeier"
  isNamed: boolean;
  motiv: string;           // lesbares Motiv-Label
  archetyp: string | null; // nur wenn benannt
  level: number; mk: number;
  hp: number; maxHp: number; damage: number; armor: number; speed: number; lootValue: number;
  equipment: EnemyInfoEquip[];
  bag: string[];           // Item-Namen
  boosters: string[];      // vorerst immer [] (SH2)
  history: EnemyInfoHistory;
}
export function buildEnemyInfo(e: EnemyLike, akte: AkteLike | null): EnemyInfo;

// enemyPick.ts
export interface ScreenBlip { id: string; sx: number; sy: number }
export function nearestToPointer(px: number, py: number, blips: readonly ScreenBlip[], maxPx: number): string | null;

// overviewMap.ts
export interface OverviewMap {
  toggle(): void; isOpen(): boolean;
  update(playerX: number, playerZ: number, blips: MapBlip[], pointerX: number, pointerY: number): void;
}

// inspectCard.ts
export interface InspectCard {
  open(info: EnemyInfo): void; close(): void; isOpen(): boolean;
}
```

`EnemyLike`/`AkteLike` sind schmale strukturelle Typen (nur die gelesenen Felder), damit `enemyInfo` ohne Babylon/DOM testbar bleibt und nicht an die volle `Enemy`-Klasse koppelt.

---

## 6. Hover-Pick (Gegner unter dem Mauszeiger)

- Pro Frame: jeden **lebenden** Gegner per `Vector3.Project` auf Bildschirm-Pixel projizieren (gleiches Verfahren wie HP-Balken/Loot-Labels), nur sichtbare (z ∈ (0,1)).
- `nearestToPointer(scene.pointerX, scene.pointerY, blips, maxPx)` liefert die `id` des nächsten Gegners innerhalb `maxPx` (Vorschlag **70 px**) — oder `null`.
- Der getroffene Gegner ist „gehovt": kleiner DOM-Hinweis **„[I] Inspizieren"** an seiner projizierten Position (lehrt die Taste; dein Gate „Menschenverständlichkeit").
- **I** inspiziert genau diesen Gegner. Wechselt der Hover zwischen Frames, folgt der Prompt; stirbt der Gegner, verschwindet er.

---

## 7. Datenfluss

```
Frame (M offen):
  roster(alive) → projectBlip(range 150) → OverviewMap.update(..., pointer)
                                         → Hover-Tooltip (kondensiert) via buildEnemyInfo

Frame (Fahr-Bild):
  roster(alive) → Vector3.Project → ScreenBlip[]
  nearestToPointer(pointer, blips, 70) → hoveredId
  hoveredId ≠ null → "[I] Inspizieren"-Prompt an Gegner

Taste I (hoveredId ≠ null):
  e = roster.find(hoveredId); akte = akteBuch.get(hoveredId)
  info = buildEnemyInfo(e, akte)          // eingefrorener Snapshot
  prevSimSpeed = clock.simSpeed; clock.simSpeed = 0
  InspectCard.open(info)

Schließen (I/Esc/Klick):
  InspectCard.close(); clock.simSpeed = prevSimSpeed
```

Da die Welt bei offener Karte steht, ist der Snapshot ausreichend (kein Live-Update der Karte nötig).

---

## 8. Randfälle

- **Kein Ziel + I:** nichts passiert (optional dezenter Hinweis).
- **Gehovter Gegner stirbt im selben Frame:** Hover-Pick liefert ihn nicht mehr → kein Inspizieren ins Leere.
- **M offen + I gedrückt:** erlaubt; I öffnet die modale Karte über der M-Karte (M bleibt darunter, pausiert mit). Schließen der I-Karte stellt `prevSimSpeed` her; M bleibt offen.
- **Reveal läuft, dann I:** `prevSimSpeed` fängt den Slowmo-Wert ab und stellt ihn beim Schließen wieder her (kein „Festkleben" der Zeit).
- **Spieler tot / Spielende:** M/I bleiben nutzbar (reine Lese-Ansichten), brechen nichts.
- **Sehr viele Gegner:** DOM-Pools (wie bei HP-Balken) wiederverwenden; M-Karte zeichnet auf Canvas (kein DOM pro Punkt).

---

## 9. Bewusst offen / später

- **Inspizieren auf der M-Karte** (Hover-Punkt + I statt Panzer im Fahr-Bild): `nearestToPointer` ist bereits generisch (Pixel-Blips), also später leicht nachrüstbar — die M-Karte müsste nur ihre Blip-Pixel an denselben Picker geben.
- **„Aktive Booster"** füllt sich, sobald SH2 (Aktiv-Buff-Framework) steht; Karten-Zeile existiert schon.
- **Accuracy/Dodge/Auto-Turret** erscheinen in Stats/Ausrüstung automatisch, sobald das Datenmodell (SH3) sie hat — `buildEnemyInfo` liest dann zusätzliche Felder.
- **Eigen-Inspektion** und **visuelle Teile am Mesh** sind eigene spätere Themen.

---

## 10. Testplan

**Unit (Vitest, headless)**
- `enemyPick.nearestToPointer`: nächster Treffer; nichts innerhalb `maxPx` → `null`; Gleichstand → erster; leere Liste → `null`.
- `enemyInfo.buildEnemyInfo`: benannter Gegner (Archetyp + Historie aus Akte); „Panzer N" (kein Archetyp, `history.hasHistory=false`); Ausrüstung→Slot/Name/Stattext; `mk` aus Level; `boosters` immer `[]`.

**Browser-Verifikation (Preview, wie S1–S4)**
- M: Karte öffnet/schließt mit Taste; Punkte bewegen sich live (Welt läuft); Hover über Punkt → Tooltip mit korrektem Namen/Lvl/HP; benannter Rivale rot.
- I: Hover über Gegner zeigt „[I] Inspizieren"; I → `simSpeed` wird 0 (per `__live`/`__dbg` beweisbar), Overlay abgedunkelt, Karte zeigt exakt die Werte des Gegners; Schließen → `simSpeed` zurück auf vorherigen Wert.
- Datenabgleich: Karteninhalt == `__dbg.enemyState(id)` (Ausrüstung/Inventar/Level) und `akteBuch`-Historie.

**Akzeptanz:** alle Unit-Tests grün, `tsc` clean, keine Konsolenfehler, und die obigen Browser-Checks belegt (Daten + Screenshot).

---

## 11. Risiken

- **Pick-Treffsicherheit bei schräger 2.5D-Kamera:** Projektion auf den Panzer-Mittelpunkt + großzügiger `maxPx` (70). Falls unzuverlässig, Pick-Punkt leicht anheben (Turmhöhe) — messbar im Browser.
- **Pause-Wiederherstellung** gegenüber Reveal: durch `prevSimSpeed`-Vertrag entschärft; im Browser gegen einen laufenden Reveal testen.
- **Lesbarkeit der Karte** bei vielen Punkten: benannte größer/rot, Rest klein; Tooltip nur für den nächsten Treffer.
