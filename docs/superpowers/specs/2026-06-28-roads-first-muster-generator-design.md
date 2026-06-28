# Roads-First Muster-Generator — gestaltet wirkende Distrikt-Karten

## 1. Übersicht

Aufbauend auf dem bestehenden Map-System ([2026-06-28-schrott-spielplatz-map-builder-design.md](2026-06-28-schrott-spielplatz-map-builder-design.md)) ersetzen wir die „Zonen + Blue-Noise-Scatter"-Erzeugung durch einen **roads-first** Generator: Erst entsteht ein **Straßennetz**, das die Fläche in **Blöcke** (Distrikte) zerschneidet; jeder Block bekommt ein **Thema** (Biom) und wird mit einem **hand-gemalten Muster** (Zeichen-Raster) bestückt, das der Generator orientiert/klippt/auffüllt. So liest sich die Karte wie ein gestalteter Ort (erkennbare Bereiche, Wege, ummauerte Höfe, ein Checkpoint) statt wie ein gleichförmiges Streufeld — bei größerer Fläche und prozeduraler Abwechslung.

Das Ziel-Vorbild ist eine Top-Down-Endzeit-Karte mit benannten Distrikten (Depot, Industriehof, Schlamm-Öde, Kraterfeld, Ruinen-Los) entlang eines Straßen-Skeletts mit zentralem Checkpoint.

**Invariante (verbindlich, unverändert): kein Balance-Eingriff.** Breakables/Hazards/Collectibles/Nester aus Mustern geben **niemals Impulse oder Skillpunkte**. Nester droppen **Leben** (HP). Die Gegner-Spawn-Rate wird nicht verändert. Keine Kopplung an Kompass/Finisher/Evolution/Fusion.

**Kompatibilität (verbindlich):** Die in dieser Session gebaute **begrenzte Arena** bleibt: Arena-Wand am Feldrand, Szene-Nebel, `klemmeInArena` (Spieler + Gegner), Kriegsnebel + Wegpunkt auf der Übersichtskarte. Der roads-first Generator erzeugt nur den **Inhalt innerhalb** der Arena; Wand/Nebel/Klemmung/Overview greifen unverändert. Secret-Rampe → Bonus-Insel bleibt erhalten (Rampe in einem Randblock, Insel jenseits der Wand wie gehabt).

## 2. Designziele & Nicht-Ziele

**Ziele**
- Erkennbare, individuell wirkende Distrikte (eigener Boden + eigene Komposition).
- Sichtbare Straßen als Skelett (statt unsichtbarer Korridore).
- Hand-gemalte Muster = menschlich *designte* Innenräume, vom Generator platziert/variiert.
- Ummauerte Höfe mit Tor + ein Checkpoint-Set-Piece am Hauptknoten.
- Größere Fläche (~±400). Deterministisch, rein testbar, kuratierbar wie bisher.

**Nicht-Ziele (YAGNI — bewusst raus)**
- Kein nahtloses Verzahnen über Blockgrenzen (WFC). Straßen sind die Nähte; Blöcke müssen nicht zusammenpassen.
- Kein visueller In-Game-Mustereditor in v1 (Muster sind Text-Raster in Daten; Mapsmith-Paint-Modus optional später).
- Keine gemalte Kunst / Sprites — wir bleiben bei komponierten Primitiven + getönten Böden.
- Keine art-direkte bespoke Einzelkarte aus dem Generator (dafür: generierten Seed einfrieren und von Hand nachschärfen — jederzeit nachrüstbar, kein Umbau).
- Kein voll-organisches Voronoi-Netz: wir nehmen **gejitterte rechteckige Unterteilung**, damit die rechteckigen Muster sauber stempeln (siehe §9, ehrlicher Trade-off).

## 3. Architektur-Überblick

Pipeline (rein → Engine):

```
Rezept(+seed)
  -> citySubdivide()      [rein]  Feld -> Blöcke + Straßensegmente (gejitterte Unterteilung)
  -> themenZuweisung()    [rein]  je Block ein BlockTheme (größen-/positionsabhängig + gewichtet)
  -> musterStempel()      [rein]  je Block: Muster wählen, orientieren, klippen, Rand auffüllen -> MapEntity[]
  -> setpieces()          [rein]  Checkpoint am Hauptknoten, Secret-Rampe in Randblock, Funkturm-Landmark
  => KartenDaten { entities, roads, blocks, paths, zones, extents, ... }   (rein, validiert)
  -> ladeKarte()          [Engine] bestehender Loader (Props)
  -> Boden-Patches, Straßen-Meshes, Hof-Mauern   [Engine] neue Render-Module
```

Alles vor `=> KartenDaten` ist rein (Vitest-testbar), wie der bisherige Generator.

## 4. Datenmodell / Typen

Erweiterung von `src/world/map/mapTypes.ts`:

```ts
// Neuer Distrikt-/Biom-Themenraum (ersetzt die alten ZoneTheme für roads-first Rezepte)
export type BlockTheme =
  | 'industrieHof'   // dichte Cargo-Reihen + Maschinen
  | 'depot'          // ummauerter Hof: Schuppen + Tanks
  | 'schlammOede'    // offen, festgefahrene Wracks, dünn
  | 'kraterFeld'     // offen, Krater/Trümmer, dünn
  | 'ruinenLos'      // Trümmer, tote Bäume, verstreut
  | 'funkturmZone';  // Landmark-Distrikt

export interface Block {
  id: string;
  theme: BlockTheme;
  rect: { x: number; z: number; w: number; h: number }; // achsen-ausgerichtetes Rechteck (Distrikt-Hülle)
  roadEdges: ('N' | 'S' | 'O' | 'W')[]; // welche Kanten an einer Straße liegen (für Tor-Ausrichtung)
  walled: boolean;                       // ummauerter Hof?
}

export interface RoadSegment {
  id: string;
  von: Vec2;
  bis: Vec2;
  breite: number;
  rang: 'arterie' | 'gasse'; // frühe Schnitte = breite Arterien, späte = schmale Gassen
}

// KartenDaten erhält zusätzlich (rückwärtskompatibel: zones/paths werden weiter befüllt):
//   roads: RoadSegment[]
//   blocks: Block[]
```

Bestehende `zones: Zone[]` und `paths: MapPath[]` werden aus `blocks`/`roads` mit-befüllt, damit Overview/Nameplate/Pfad-Logik unverändert funktionieren.

## 5. Maßstab & Konstanten

Neue Konstanten in `mapTuning.ts` (`MAP_TUNING.city`):

| Konstante | Wert (Start) | Bedeutung |
|---|---|---|
| `zelle` | **6** | Welt-Einheiten pro Muster-Zelle |
| `musterMin` / `musterMax` | 8 / 14 | Muster-Kantenlänge in Zellen (~48–84 Einheiten) |
| `extents` | **±400** | halbe Feldgröße (war ±320) |
| `blockZiel` | 70 | Ziel-Block-Kantenlänge in Einheiten (Stop-Kriterium der Unterteilung) |
| `strasseArterie` / `strasseGasse` | 12 / 8 | Straßenbreiten |
| `splitJitter` | [0.35, 0.65] | Verhältnis-Streuung der Schnittlinie |
| `randFuellDichte` | 0.5 | Dichte der losen Theme-Props im Block-Rand außerhalb des Musters |

Panzer Ø 3 fährt durch eine `.`-Zelle (6) und über jede Straße (≥8). Ein Container (~6) ≈ 1 Zelle.

## 6. Design-Sprache (Glyphen)

Glyphen sind **semantisch**, nicht asset-fest — *welches* Asset, entscheidet das BlockTheme (§7). Dadurch funktioniert ein Muster über mehrere Themen.

```
.   offener Boden (befahrbar, leer)
,   Streu-Deko, niedrige Dichte        -> Truemmer/Reifen/Kegel/Pfuetze
#   Wand / lineare Sperre              -> Thema: Mauer-Segment / Beton / Wrack
B   Cargo-Block (solide)               -> Thema: Container / Rohrstapel
o   kleines Breakable                  -> Thema: Fass / Kiste / Schrotthaufen
X   Hazard                             -> Thema: Presse / Gift / Stachelgrube
*   Pickup-Slot                        -> Fund (Heilung/Schraube/Kanister)
!   Fokus-Set-Piece (Distrikt-Zentrum) -> Thema: Funkturm / Grossmaschine / Schuppen
n   schlafendes Nest (Gegner)
=   Tor (Luecke in der Wand, an die Strasse)
(Leerzeichen)  nicht Teil des Musters (fuer nicht-rechteckige Formen)
```

Jeder Glyph platziert **eine** Sache zentriert in der Zelle, mit Positions-Jitter + Zufalls-Rotation (`MAP_TUNING.rotJitter`) → kein Schachbrett. `=`-Tore richtet der Generator zur angrenzenden Straße aus (Muster-Rotation). Fülldeko `,` streut 1–3 kleine Props innerhalb der Zelle.

## 7. BlockTheme-Registry (Auflösung + Boden)

Pro Thema: Bodenfarbe + erlaubte Muster-Archetypen + Glyph→Asset-Auflösung.

```ts
interface ThemeDef {
  id: BlockTheme;
  bodenFarbe: [number, number, number]; // getönter Distrikt-Boden
  archetypen: ('compound' | 'yard' | 'waste')[]; // welche Muster passen
  walled: boolean;                      // Hof mit Mauer?
  aufloesung: {
    wand: AssetId[]; cargo: AssetId[]; breakable: AssetId[];
    hazard: AssetId[]; fokus: AssetId[]; deko: AssetId[];
  };
}
```

Beispiele (echte Assets aus dem Asset-Kit):
- `industrieHof` — Boden Beton-grau; `yard`; offen; cargo=[container,rohrstapel], breakable=[kiste,fass], fokus=[presse,funkturm], hazard=[giftpfuetze].
- `depot` — Boden Asphalt; `compound`; **walled**; wand=[betonblock], cargo=[container], fokus=[funkturm], breakable=[fass,kiste].
- `schlammOede` — Boden braun; `waste`; offen; breakable=[fass,schrotthaufen], deko=[truemmer,pfuetze], fokus=[wrack_auto].
- `kraterFeld` — Boden grau-pockig; `waste`; hazard=[stachelgrube], deko=[truemmer], breakable=[schrotthaufen].
- `ruinenLos` — Boden sand-tan; `waste`; deko=[truemmer,reifenstapel], breakable=[kiste].

`*` → collectible (heal/schraube/kanister, wie bisher), `n` → dormantNest (Leben-Drop), `.`/Leerzeichen → nichts.

## 8. Muster-Format, Parser & Minimal-Set

```ts
// src/world/map/muster.ts  (rein, getestet)
export interface MusterDef {
  id: string;
  archetyp: 'compound' | 'yard' | 'waste';
  zeilen: string[]; // alle gleich lang; Breite/Höhe daraus abgeleitet
}

export interface StempelOpt {
  origin: Vec2;          // Welt-Position der Muster-Mitte
  zelle: number;         // Welt-Einheiten pro Zelle
  rotation: 0 | 1 | 2 | 3; // 90°-Schritte (Tor zur Straße)
  spiegeln: boolean;
  theme: ThemeDef;
  rng: Rng;
}
// Liefert die platzierten Entities (kind/asset/pos/rotY/scale/params) inkl. Wand-/Tor-Markierungen.
export function stempleMuster(def: MusterDef, opt: StempelOpt): MapEntity[];
```

**Stempel-Ablauf:** Raster lesen → (optional spiegeln) → rotieren → je Zelle Glyph→Entity über `theme.aufloesung` + `rng` auflösen → an `origin` in Welt setzen → **an Block-Rect klippen** (Entities außerhalb verwerfen) → Block-Rand außerhalb des Musters mit losen Theme-Props in `randFuellDichte` auffüllen.

**Minimal-Set: 3 Archetypen × 2 Varianten = 6 Muster** (Zellen-Raster), aufgelöst über 4–5 Themen + Rotation/Spiegelung.

**A · compound** (Mauer-Ring + Tor + Zentrum + Deckung) — Depot:
```
##########
#.o....o.#
#...!....#
=....*...#
#........#
#.oX..Xo.#
#,..nn..,#
##########
```

**B · yard** (Cargo-Reihen + Fahrgassen + Fokus, keine Außenmauer) — Industriehof:
```
,..........,
.BB..BB..BB.
.BB..BB..BB.
.....!......
.BB..BB..BB.
.BB..BB..BB.
...*.....X..
,..........,
```

**C · waste** (offen, dünn, verstreute Cluster) — Schlamm/Krater/Ruinen:
```
,..........,
....o.....,.
..,....X....
.......o....
,....!......
....o....,..
..X.....o...
.,.....*....
.....o....,.
,..........,
```

Je 2 Varianten = 6. Ablage als Daten in `musterBibliothek.ts`.

## 9. Roads-First Unterteilung (`citySubdivide.ts`, rein, getestet)

Gejitterte rekursive Unterteilung (BSP-artig):

1. Start: Feld-Rechteck minus Rand-Puffer (innerhalb der Arena-Wand).
2. Ist ein Rechteck größer als `blockZiel`, entlang der **längeren** Achse an einem gejitterten Verhältnis (`splitJitter`) teilen. Die Schnittlinie wird eine **Straße** (`strasseArterie` für frühe, `strasseGasse` für späte Schnitte); die zwei Hälften minus Straßenbreite werden neue Rechtecke.
3. Rekursion bis Blöcke ≈ `blockZiel`. **Nicht alle** Blöcke maximal teilen (Zufalls-Stop) → gemischte Größen (große = `waste`, kleine = `compound`).
4. **Konnektivität ist baulich garantiert:** jeder Block grenzt an die Straße seines letzten Schnitts. `roadEdges` je Block aus angrenzenden Schnitten ableiten.
5. **Checkpoint:** der Schnittpunkt der ersten beiden (breitesten) Arterien = zentraler Knoten → Checkpoint-Set-Piece. Spawn auf/an diesem Knoten.

Ehrlicher Trade-off: Unterteilung gibt einen „Häuserblock"-Look. `splitJitter` + Zufalls-Stop + leicht versetzte/gekurvte Straßen mildern das. Volle Organik (Voronoi) wäre schöner, aber rechteckige Muster würden nicht sauber stempeln — bewusst gegen Voronoi entschieden.

## 10. Rendering (Engine-Module)

- **`groundPatches.ts`** — je Block eine getönte Boden-Fläche (flaches Mesh knapp über dem Endlos-Boden, Theme-Farbe, weiche Alpha-Kante). Pro Thema gemergt.
- **`roadMesh.ts`** — Asphalt-Band entlang jedes `RoadSegment` (dunkles Mesh) + gestrichelte Mittellinie (Textur oder dünne Boxen). Gemergt.
- **Hof-Mauern** — der bestehende `arenaBoundary`-Segmentbau wird zu `wallRing(scene, rect, gaps)` verallgemeinert: umrandet ein Block-Rect, lässt am `=`-Tor eine Lücke. Wiederverwendung statt Duplikat.

Alle statisch: gemergt, `freezeWorldMatrix`, `isPickable=false` (wie Map-Props).

## 11. Integration

- **Generator-Variante:** neues Modul `cityGen.ts` mit `generiereStadt(rezept, seed): KartenDaten`. Rezept erhält `layout: 'zonen' | 'roadsFirst'`; `generiere()` delegiert. Alte Rezepte (`zonen`) bleiben unangetastet.
- **Loader:** `ladeKarte` bekommt die `entities` wie bisher; zusätzlich rendert `boot()` Boden-Patches/Straßen/Hof-Mauern aus `karte.blocks`/`karte.roads`.
- **Mapsmith/Curated:** unverändert — Seeds würfeln (G), gute als Zeile speichern (C), in `curatedMaps.ts` (neue roads-first Einträge).
- **Bestehende Systeme** (Kollision, `klemmeInArena`, Overview-Blips, Kriegsnebel, Wegpunkt, Nameplate, Secret-Sprung) konsumieren `entities`/`extents`/`paths` → funktionieren ohne Änderung.

## 12. Milestones

- **M1 — Skelett & Lesbarkeit:** `citySubdivide` (rein+getestet) → Blöcke+Straßen; Theme-Zuweisung; `groundPatches` + `roadMesh`; Extents ±400. Innenräume vorerst einfacher Scatter. *Beweist: erkennbare Bereiche + sichtbare Wege.*
- **M2 — Muster:** `muster.ts` (Parser, rein+getestet) + BlockTheme-Auflösung + 6 Minimal-Muster + Stempeln je Block (Orientierung/Klippen/Rand-Füllung). *Beweist: designte, nicht hingeklatschte Innenräume.*
- **M3 — Höfe & Checkpoint:** `wallRing` (Mauer+Tor je `walled`-Block), Checkpoint-Set-Piece am Hauptknoten, Secret-Rampe in Randblock. *Politur zum Vorbild.*

## 13. Test-Strategie

Reine Module mit `*.test.ts` (wie der Rest):
- **citySubdivide:** Determinismus (gleicher Seed → identisch); jeder Block grenzt an ≥1 Straße (Konnektivität); Blockanzahl im erwarteten Bereich; Blöcke überlappen nicht; bleiben in Extents.
- **muster:** Raster → korrekte Entity-Anzahl/-Positionen; Rotation/Spiegelung korrekt; `=`-Tor liegt nach Orientierung an der angegebenen Kante; Klippen verwirft Außen-Entities.
- **Theme-Auflösung:** Glyph→Asset deterministisch je Theme+rng; `n`→dormantNest, `*`→collectible (nie Impuls — Invariante).
- Engine-Module (Boden/Straße/Mauer-Mesh) nicht unit-getestet (wie `loader`/`mapMesh`), via `tsc`+Build+Spiel verifiziert.

## 14. Ehrliche Grenzen (Wiederholung, verbindlich kommuniziert)

- **Globale Komposition:** „ordentlich prozedural", nicht art-directed; das Gesamtbild komponiert sich nicht von allein.
- **Wiederholung:** wenige Muster → erkennbar wiederkehrend (akzeptabel wie „Räume", nicht langweiliges Scatter). Mehr Muster = mehr Varianz, inkrementell.
- **Kunst-Decke:** lesbar stilisiert, nicht painterly.
- **Über-Tidy-Risiko:** Unterteilung kann gegittert wirken → über Jitter/Straßenversatz/Block-Größen-Mix tunen.
- **Rechteck ↔ Block:** Muster rechteckig, Stempel zentriert + geklippt + Rand-Füllung; perfekte Polygon-Passung gibt's nicht.

## 15. Offene Tuning-Fragen

- `blockZiel`/`zelle`/Extents final (Navigierbarkeit vs. Dichte im Panzer-Feel).
- Theme-Verteilungs-Regel (rein gewichtet vs. größen-/positionsabhängig vs. „keine zwei gleichen Nachbarn").
- Straßen-Look (gerade vs. leicht gekurvt; Mittellinie als Textur vs. Boxen).
- Anzahl benannter Distrikte pro Karte (Ziel ~5–8 + offene Füllblöcke).
