# ChaosTankNew — Vision & Architektur (Master-Spec)

- **Datum:** 2026-06-18 · **Rev:** v2 (nach adversarialem Qualitäts-Check)
- **Status:** Entwurf zum Review
- **Art:** Master-/Überblicks-Spec. Fängt die *gesamte* Vision und die systemübergreifenden **Verträge** ein. Einzelne Subsysteme bekommen je eine eigene Detail-Spec (Spec → Plan → bauen). Wo eine Zahl als „(Vorschlag)" markiert ist, ist sie ein änderbarer Default, kein Gesetz.
- **Vorgeschichte:** Neuaufbau in `ChaosTankNew`, weil `ChaosTank-main` an Wildwuchs mehrerer KI-Generationen zerbrochen ist (3 Bootstraps, 2 Frame-Loops, 2 KI-„Gehirne", tote Parallelsysteme, flächendeckende Fallbacks, stummgeschaltetes Logging, zerstörte `UIRenderer.js`).

---

## 0. Glossar

- **Motiv-Archetyp** — Default-Charakter-Voreinstellung (Abschnitt 7), z. B. Aasgeier.
- **Named-Archetyp** — Promotions-/Rivalen-Typ (Abschnitt 8), z. B. der Rasende.
- **Promotion / Named** — ein bestehender Gegner steigt situativ zum benannten Rivalen auf.
- **Origin** — Auslöser einer Promotion (Ereignis + Bedingung) mit eigenem Generator.
- **Akte (Beziehungsakte)** — kleines Gedächtnis pro Gegner über seine Begegnungen mit dem Spieler.
- **Anfüttern** — der Spieler verliert absichtlich knapp, um einen Gegner aufsteigen zu lassen.
- **Reveal** — die einmalige Inszenierung beim Erstkontakt mit einem Named (Zeitlupe + Highlight + Spruch).
- **Rezept** — datengetriebene Beschreibung, aus der ein Resolver eine Teile-Variante / einen Charakter / eine Promotion baut.
- **simSpeed** — globaler Zeitfaktor (0..1) für alle Gameplay-Updates (Abschnitt 9.1).

---

## 1. Vision

> **Eine lebende Panzer-Arena, in der die Gegner ein eigenes Leben führen und sich an *dich* erinnern.**
> Du fährst mit deinem Panzer (solo; später plus angeworbene Verbündete) durch eine endlose, prozedurale Welt mit Biomen. Gegner sind keine Statisten: Jeder hat ein **Motiv**, das Klassen-, Teile- und Bewegungswahl steuert. Aus Begegnungen mit dir entstehen **benannte Rivalen** (Promotion) mit Charakter, Sprüchen, Perks und einzigartigen, **sichtbaren** Teilen. Du kannst Gegner gezielt **anfüttern** (absichtlich knapp verlieren), um sie aufsteigen zu lassen, ihre Beute zu ernten, und über die große Karte deine ganz persönlichen Feinde jagen.

**Zwei oberste Prioritäten:** (1) **Simulation** — Gegner handeln aus Charakter. (2) **Aussehen** — „geile Teile sehen geil aus", erkennbar auf Spielfeld und Karte.

**Cast statt Schwarm:** bewusst **wenige Panzer (~25 gesamt)**. Der Kern ist das *Züchten* persönlicher Rivalen — eine Masse anonymer Panzer würde genau das verwässern (Abschnitt 16).

**Legaler Rahmen:** Das Nemesis-*Gefühl* über **Wiedererkennung** (die Welt merkt sich, was war), **ohne** die patentierte Hierarchie/Festungs-/Vendetta-Struktur von Warner Bros. und ohne deren Begriffe.

---

## 2. Leitplanken (Lessons aus ChaosTank — nicht verhandelbar)

1. **Ein** Game-Loop. Kein zweiter Schatten-Loop.
2. **Eine Wahrheitsquelle pro Domäne.** Keine konkurrierenden „Unified/Enhanced/Legacy"-Parallelsysteme. Neues ersetzt Altes.
3. **Keine stillen Fallbacks zur Laufzeit.** Fehlt eine Pflicht-Abhängigkeit → `throw` mit klarer Meldung (per Negativtest belegt). „Engine-Wahl" (Abschnitt 3) ist *kein* Laufzeit-Fallback.
4. **Gestuftes, filterbares Logging** (debug/info/warn/error + Kanäle pro System + Rate-Limit). Kein Alles-oder-nichts-Schalter.
5. **TypeScript, strict.** Zustände als getippte Unions, nicht als lose Booleans (Altbug `p.active` vs `p.hit`).
6. **Eine Verantwortlichkeit pro Modul** (Single Responsibility). Richtwert: ab ~300–400 Zeilen oder >1 öffentlicher Verantwortung kritisch prüfen.
7. **Keine „Theater"-Validierung.** Checks prüfen *Funktion/Verhalten*, nicht bloß *Existenz* (`typeof x === 'function'`).
8. **Determinismus per Seed.** Welt- und KI-Generierung laufen über einen seedbaren RNG, damit Verhalten reproduzierbar und headless testbar ist.

---

## 3. Technologie-Stack & Engine-Entscheidung

| Bereich | Wahl | Begründung |
|---|---|---|
| Rendering/Engine | **Babylon.js** (3D, WebGL2-Baseline) | Bündelt **Kollision/Picking/Asset-Loader** nativ (Instancing verfügbar, bei ~25 Panzern aber unkritisch). Echte Rigidbody-Physik bräuchte auch hier ein Plugin — siehe 3.1. |
| Sprache | **TypeScript** (strict) | Siehe Leitplanke 5. |
| Build/Dev | **Vite** | Schnell, modern. |
| Spiel-GUI | **HTML/DOM-Overlay** (Framework-Kandidat: React/Svelte/Solid) | UI als echtes HTML *über* dem Canvas. Beendet „handgemalte Canvas-UI flackert". |
| Assets | **CC0-3D-Kits** (Slice 1: **ein** konsistentes Kit) + **Blender-MCP** zur Normalisierung/Lücken | Siehe Socket-Schema 6.3. |

- **Kamera (festgelegt):** **perspektivisch**, kleiner FOV, feste Schräg-Distanz von oben → 2.5D-Look *mit* echtem Tiefen-Culling/LOD und korrekter Billboard-Projektion. (Ortho wäre für Endlos-Welt + LOD ungünstiger.)
- **Renderpfad:** **genau eine** Engine im Code. **Three.js ist Plan B *vor* dem Bauen** (Re-Evaluierungspunkt nach Slice 1), **kein** dualer Render-Pfad und **kein** Laufzeit-Ausweich (sonst Leitplanke 2/3-Verstoß).

### 3.1 Physik-Niveau (festgelegt für Slice 1)
- **Projektile: rein kinematisch** (`pos += richtung · speed · simDt`), **nicht** über eine Physik-Engine. Das macht Zeitlupe (9.1) trivial korrekt und den Projektil-Pool (21) sauber.
- **Chassis/Kollision:** simpler eigener Sweep / Bounding-Volumes (Babylon-Picking/Intersect). **Slice 1 braucht voraussichtlich gar keine Physik-Engine** → kein Schwergewicht ohne Nutzen. Falls später echte Physik, deren `timeStep` an `simSpeed` koppeln.

---

## 4. Architektur-Prinzipien

- **Datengetriebenes Rezept-/Generator-Muster** als roter Faden. Ein gemeinsamer **Resolver-Standard**: ein Rezept ist ein typisiertes Objekt `{ id, basis, modifikatoren[], ... }`, ein Resolver wendet es deterministisch (Seed) an. Drei Ausprägungen mit **gemeinsamer Form**:
  - **Teile-Rezept:** `{ sockettyp, basisMesh, material, skalierung, greebles[] }` → Resolver baut die sichtbare Teile-Variante.
  - **Motiv-Rezept (Default-Charakter):** `{ traitGewichte{...}, klassenBias }` → Resolver liefert ein Trait-Profil.
  - **Origin-Rezept (Promotion):** `{ bedingung, archetyp, perks[], twistRegeln[], signaturTeil? }` → Resolver erzeugt den Named.
  > Verbindlich: **ein** Schema-Standard + **ein** Resolver-Muster, damit die drei Subsystem-Specs nicht divergieren.
- **Komposition über Vererbung.** Panzer = Chassis + Teile + Motiv-Profil + optional Akte. Named = Motiv-Profil + Origin-Overlay.
- **Typisierte Event-Verträge.** Ein zentraler, getippter Event-Bus (Altbug: doppelt verschachteltes `combat.end`-Payload legte die halbe Schicht still).
- **Single Source of Truth für Entities.** Eine Entity-Liste, ein Welt-Zustand. Referenzen existieren oder werfen.
- **KI liest sichtbare Teile als Input.** Der Sichtbarkeits-Datenpfad (welche Teile trägt Panzer X) ist eine **erstklassige Schnittstelle** — mehrere Motive/Named hängen davon ab (Aufrüster, Verstoßener, Schatzjäger).

---

## 5. Welt

- **Endlos-Scroller:** nahtlos wrappende Welt; Kamera folgt. Welt-Mathematik (Wrapping/Distanz) aus dem Alten portierbar.
- **Chunk-Generierung & -Pooling:** Welt um die Kamera in Chunks; **Mesh-Pooling** beim Wrappen (kein `dispose()`/`new` im Scroll → keine Frame-Hitches).
- **Biome:** mehrere, optisch/atmosphärisch unterschiedlich. **Biom-Registry = Single Source** (existiert strukturell ab Slice 1, auch wenn nur 1 Biom befüllt ist). **Negativtest:** unbekanntes Biom ⇒ Error (verhindert Altbug `swamp`-Crash).
- **Zonen:** Safe-/Shop-Zonen über **ein** einheitliches Zonen-Schema.
- **Drei Ansichten derselben Welt:** (a) **Spielfeld** = live befahrene 3D-Ansicht (reale Teile sichtbar); (b) **Minimap** = HUD-Ecke; (c) **Große Map (M)** = weit herausgezoomte Vogeldarstellung zum Spähen. **Karten zeigen abstrahierte Marker/Icons** (Auffälligkeit aus Loot-Wert abgeleitet), **nicht** reale Mesh-Geometrie.

---

## 6. Panzer & Teile

**Drei Klassen:** **Späher** (leichte, schnelle **Motorrad**-Varianten) · **Allrounder** (Panzer) · **Haubitze** (groß/schwer).

### 6.1 Teile-Kategorien (Sockets am Chassis)
1. **Chassis** (Basis; je Klasse mehrere Varianten, beim Start zufällig — Richtwert **6/Klasse (Vorschlag)**)
2. **Räder / Ketten**
3. **Turm**
4. **Waffe**
5. **Platten / Rüstung** (dauerhaft montierte Schadensreduktion)

> **Energieschild ist KEIN Socket-Teil**, sondern ein **Powerup** (Abschnitt 12), das visuell als Aura sitzt. Socket-System und Powerup-System bleiben datenseitig getrennt.

**Klassen-Socket-Sets:** nicht jede Klasse hat jeden Socket. Der **Späher (Motorrad)** nutzt ein abweichendes Set (z. B. 2 Räder, evtl. kein klassischer Turm) — die Socket-Belegung wird **pro Klasse** definiert.

### 6.2 Vielfalt (Rezept-System)
Kleine Basis-Bibliothek + Daten-Rezepte (Material, Skalierung/Proportion, Greebles, Farbe). „6 Chassis/Klasse" = überwiegend parametrische Varianten weniger Basis-Meshes. **Tier mk1→mkN** (Richtwert **mk1–mk5 (Vorschlag)**) = gleiches Mesh, Material hoch + Detail-Meshes dazu. **Uniques** = handverlesene Signatur-Rezepte.

### 6.3 Socket-Schema & Asset-Normalisierung (Vertrag)
- **Verbindliches Socket-Schema:** Pivot-Konvention, **Welt-Einheit = 1 Meter**, benannte Sockets am Chassis (`socket_turret`, `socket_wheel_l`, …).
- **Jedes** importierte CC0-Teil durchläuft einen **Normalisierungs-Schritt (Blender-MCP)** auf dieses Schema (Maßstab, Pivot, Achsen Y-up). Mischen mehrerer Künstler-Quellen erst *nach* Slice 1; **Slice 1 nutzt EIN konsistentes Kit**.

### 6.4 Render-Strategie (entspannt durch den ~25-Panzer-Roster)
Die früher kritische Spannung „viele Gegner per Instancing ⨯ individuell zusammengesteckt" ist durch die **~25-Panzer-Entscheidung (Abschnitt 16)** aufgelöst: Bei dieser Zahl darf **jeder Panzer ein individuell komponierter Mesh-Baum** sein (Chassis + Teile auf Sockets, Greebles überall) — ohne Performance-Klippe.
- **Optional/optimierend** (keine Pflicht): gleiche Teile-Varianten via thin-instance batchen; Tier über wenige geteilte Materialien.
- **Verbleibendes echtes Risiko** ist nicht die Anzahl, sondern das **Socket-/Asset-Schema** (6.3) — dass Teile aus Kits sauber und maßstabstreu zusammenstecken.

### 6.5 Sichtbarkeit
Equippte Teile verändern den Panzer sichtbar auf dem Spielfeld; auf den Karten erzeugt **Loot-Wert/Auffälligkeit einen abstrahierten Marker**.

---

## 7. Simulation — Schicht 1: Default-Charakter (Motiv-Archetyp)

Jeder Gegner hat ab Spawn ein Motiv, das über eine **Utility-KI** Wahl von Klasse, Teilen, Zielen und Bewegung steuert.

### 7.1 Trait→Utility-Vertrag (geschlossen)
- **Geschlossene Trait-Liste**, Wertebereich **0..1**: `mut, stolz, gier, geselligkeit, vorsicht, fortschrittsdrang` *(Liste final, erweiterbar nur per bewusster Spec-Änderung)*.
- **Utility-Muster:** `score(option) = Σ_i trait_i · passung_i(weltzustand)`; gewählt wird die höchstbewertete Option (mit etwas Rauschen/Seed). **Detail-Gewichte offen**, die Schnittstelle nicht.
- **Aktionsraum (geschlossen für die Schnittstelle):** `annähern, fliehen, looten, anwerben, einkaufen, Revier_halten, Ziel_wählen, sich_aufrüsten`.
- **Welt-Inputs (gelesen):** sichtbare Teile/Loot-Wert anderer Panzer, eigene HP, Distanz, Gruppengröße, Zonen-Nähe, bekannte Akte.
- **Klassenwahl ist auch nur eine Utility-bewertete Option**, keine harte Zuordnung. (Der „Aufrüster = beliebig" ist damit aufgelöst: er gewichtet Klasse niedrig und Teile-Nutzen hoch.)
- **Selbstopfer ist erlaubt:** Die Bewertung darf „Loot erzeugen durch eigenen/fremden Tod" als **positiven** Term führen (Gier sticht Vorsicht) → Selbstopfer fällt emergent, nicht hartkodiert.

### 7.2 Motiv-Archetyp-Katalog (Voreinstellungen; Mischungen entstehen aus Trait-Werten)

| Motiv-Archetyp | Kerntrait | Tendenz | Board-Verhalten |
|---|---|---|---|
| Der Aasgeier | opportunistisch | leicht/schnell | schnappt sich Angeschlagene, meidet faire Duelle |
| Der Schatzjäger | beutegierig | mobil | steuert Drops/Beute an; provoziert Tode (inkl. Selbstopfer) zur Loot-Erzeugung |
| Der Angsthase | vorsichtig | schwer, Platten + priorisiert **Schild-Powerups** | klebt an Gruppen, flieht allein |
| Der Aufrüster | fortschrittsdrang | passt sich an | jagt gut bestückte Panzer (auch den Spieler) nach nutzbaren Teilen |
| Der Rudelführer | gesellig | Allrounder | sammelt ein Rudel, führt koordinierte Angriffe |
| Der Platzhirsch | territorial | defensiv | hält ein Revier, greift Eindringlinge an |

---

## 8. Simulation — Schicht 2: Promotion / Named (Named-Archetyp)

Muster: **`Origin` → Generator → Ergebnis-Paket** (Archetyp, prozeduraler Name, Charakter-Werte *verbiegen* das Motiv-Profil, Perks, reaktive Twists, optional Signatur-Teil). Promotion kann **vor dem Spieler** oder **abseits** geschehen (dann Reveal beim Erstkontakt).

**Duell-Gedächtnis (die „Seele"):** pro Gegner kleine Historie (Ausgang, wie knapp, Loot, Häufigkeit). Perks/Twists lesen daraus.

### 8.1 Named-Lebenszyklus (Vertrag)
- **Named können sterben.** Bei Tod: **Signatur-Teil droppt** (erntbar), die **Akte wird archiviert** (Rivalität endet aktiv, bleibt als Historie/„besiegt").
- **Obergrenze & Pruning:** nur die **N relevantesten aktiven Rivalitäten (Vorschlag N=8–12)** bleiben „lebend" simuliert/persistiert; ältere/irrelevante werden archiviert oder vergessen (verhindert unbegrenztes Wachstum in der endlosen Welt).

### 8.2 Origin-/Named-Katalog (Startset; jeder Origin = eigenes Rezept)

| Origin | Named-Beispiel | Charakter | Perk / reaktiver Twist |
|---|---|---|---|
| Spieler gewinnt knapp (≤K% HP, siehe 17) | „der Rasende" | rachsüchtig, flieht nie | Lebensschub kurz vorm Tod als Antwort auf den knappen Sieg |
| Besiegt Spieler zum 4. Mal | „der Spielerkiller" | überheblich, gelangweilt | ignoriert oft, selten Gruppen, flieht nie, brutal wenn aktiv |
| Als Kanonenfutter missbraucht → desertiert | „der Abtrünnige" | verbittert | gründet Rivalengruppe, wirbt Schwache ab, Hinterhalte |
| Vom Spieler ausgetauscht | „der Verstoßene" | gekränkt | jagt den neuen Panzer / das ersetzende Teil |
| Einziger Überlebender seiner Gruppe | „der Letzte" | traumatisiert | Hinterhalte, defensiv, sammelt Loot der Gefallenen |
| Klaut Spieler einen Unique-Drop | „der Plünderer" | protzig | trägt das Teil sichtbar (Map-Magnet), flieht mit Beute |

---

## 9. Reveal & Wiedererkennung

- **Auslöser:** erster Kontakt des Spielers mit einem Named.
- **Inszenierung:** Zeitlupe (9.1), Highlight (Outline/Glühen), **schwebender Sprechtext** (9.2), **eingefärbt nach Charakter** (Lookup pro Archetyp; Trait-Interpolation optional später).
- **Sprechtext** = **rein datengetriebene Template-Funktion** aus Archetyp-Template + Akte. **Kein LLM-Call zur Laufzeit.** Templates sind **deutsch** (Lokalisierung später; Template-Struktur bleibt austauschbar). Audio-Cue gehört in die Reveal-Subsystem-Spec.
- **Wiedererkennung:** bei Wiederbegegnung ein **vom Erstkontakt verschiedener**, aus der Akte gespeister Spruch (kein erneuter Reveal); Verhalten gemäß Charakter + Historie.
- **Recognition, keine Hierarchie.**

### 9.1 simSpeed — Zeit-Subsystem (Vertrag)
Babylon hat **keinen** globalen Master-Zeitregler. Daher: ein eigener **`simSpeed` (0..1) als Single Source of Truth**; **alle** Gameplay-Updates rechnen mit `simDt = engineDelta · simSpeed`. Reveal-Slowmo (Vorschlag **0.2× über 1.5 s**, definierte Ein-/Ausblendkurve) wirkt damit auf Bewegung, kinematische Projektile und KI gleichermaßen. **HUD/DOM läuft in Echtzeit** weiter; Babylon-Animationen (Glühen/Kamera) separat über `animationTimeScale`.

### 9.2 Sprechtext-Billboard (Vertrag)
DOM-Element pro Frame via `Vector3.Project` an die Bildschirmposition des Panzers setzen. **Verdeckung selbst lösen** (Blase nur zeigen, wenn Panzer im Frustum + nicht hinter Terrain; sonst ausblenden). Alternative zur Entscheidung in Subsystem-Spec: Babylon-GUI `linkWithMesh` (löst Projektion/Tiefe nativ, weniger flexibel). Slice 1: genau **ein** Billboard (Reveal) → simple Projektions-Variante.

---

## 10. Gruppen

Formation/Rudel (geselliger Charakter treibt es). **Spieler-Team:** Anwerben von Verbündeten auf dem Board (Mechanismus in Subsystem-Spec). **Desertion/Verstoßung = Rivalen-Fabrik** → Promotion-Origins (Abtrünniger/Verstoßener). *Slice 1: Solo-Spieler, Gruppen draußen.*

---

## 11. Items, Loot & Wirtschaft

- **Item-/Teile-System:** Rarität, Tier (mk1–mk5), Uniques, Spezialeffekte; **ein** konsolidierter Generierungspfad.
- **Loot-Drops:** Besiegte droppen Teile/Spielgeld; Named droppen ihr Signatur-Teil.
- **Shop:** Spieler kauft in Shop-Zonen; **Gegner kaufen autonom** (ein einziger, end-to-end verdrahteter Pfad).

### 11.1 Wirtschafts-Bilanz (Vertrag, Vorschläge)
- **Quellen:** Spielgeld aus Kills + Verkauf von Beute.
- **Senken:** Shop-Kauf (Teile/Tier-Upgrades), Anwerben von Verbündeten, Reparatur.
- **Erbeutete Teile sind direkt montierbar**; der Shop liefert **gezielte** Teile/Tiers, die man nicht erlootet → beide Beschaffungswege koexistieren ohne den Shop überflüssig zu machen.
- **Fortschritts-Kanäle:** Ergaunern (Loot) · Kaufen (Spielgeld) · Freischalten (mk-Stufen via „MK-Level").
- **Niederlage/Anfüttern (Vorschlag):** kein „Game Over". Bei Niederlage **Respawn** an Safe-Zone mit **Teilverlust-Risiko** (ein zufälliges montiertes Teil kann fallen/beschädigt werden) und kleiner Spielgeld-/Zeit-Kosten. So hat „absichtlich verlieren" **definierte Kosten** und bleibt eine bewusste Investition, kein Freifahrtschein.

---

## 12. Powerups

**Zeitlich begrenzte Aufsammler** in der Welt (Optik biom-gefärbt; Effekt/Spawn nicht). **Energieschild** ist einer davon (visuell als Aura). Weiteres Startset (Detail-Spec): Überladung, Reparatur, Tempo, EMP, Tarnung.

---

## 13. UI & Karten

- **HUD:** HTML/DOM-Overlay (Leben, Schild, Spielgeld, Powerups, Gruppe).
- **Minimap:** Spieler, Gegner, Zonen, abstrahierte Named-/Loot-Marker.
- **Große Map (M):** weit herausgezoomt; Ziel-Spähen über Marker.
- **Shop-/Inventar-/Inspektor-UI:** HTML-Komponenten (fertige Bausteine).
- **GUI-Gate (Regel):** Klickbare UI-Texte erklären die **Spielhandlung** (Was tue ich / was kostet es), nie nur Metapher.

---

## 14. Meta & Persistenz

- **Ingame-Wiki:** Nachschlagen von Teilen, Motiven, kennengelernten Named.
- **Klassenwahl / Start.**
- **Persistenz (festgelegt):** **eine endlose Welt pro Spielstand**, gespeichert — Build, Freunde, Freischaltungen, Akten/Rivalitäten. **Wichtig für die Architektur:** Duell-Gedächtnis + Akte sind **ab Slice 1 ein In-Memory-Datenmodell** (kein Wegwerf-Session-State); nur die **Serialisierung auf Platte** ist Roadmap-Schritt 7. Save-Format **versioniert** (Migration absehbar). Pruning gemäß 8.1.

---

## 15. Core-Loop

```
Fahren & erkunden (Spielfeld + Minimap)
 → Ziele wählen (große Map M: Names & Loot-Marker)
 → Kämpfen (Sieg oder Niederlage)
 → Beute / Aufstieg (Sieg: Teile · Anfüttern: Named)
 → Aufrüsten & Gruppe (montieren · anwerben · rauswerfen)
 → Rivalen wachsen (deine eigenen Feinde, wiedererkennbar)
 → zurück zu „Ziele wählen"
```

- **Niederlage als Werkzeug** mit definierten Kosten (11.1).
- **Gruppe = Rivalen-Fabrik** (10).
- **Karte füllt sich mit *deinen* Feinden** → emergente Geschichten.

---

## 16. Skalierung & Simulationsmodell (Vertrag)

- **Roster statt Schwarm (Designentscheidung):** **max. ~25 aktive Panzer** gleichzeitig (Spieler + Verbündete + Gegner). Begründung: Der Kern ist das **Züchten** persönlicher Rivalen; viele anonyme Panzer würden es verwässern. Wenige Panzer = jeder zählt, jeder kann dein benannter Feind werden. Diese Entscheidung **streicht das vormals größte Tech-Risiko** (Render-Skalierung).
- **Render-Konsequenz:** Bei ~25 Panzern darf **jeder voll individuell + detailliert** komponiert sein (Greebles überall). Instancing optional, keine Pflicht (siehe 6.4).
- **KI-Tick:** bei ~25 Einheiten kann **jede KI jeden Frame** voll ticken. LOD/Schlaf nur als spätere Optimierung, für Slice 1 nicht nötig.
- **Zielbudget (Vorschlag):** **60 FPS** auf Mittelklasse-Laptop-iGPU bei ~25 individuell komponierten Panzern.
- **Endlose Welt:** der Roster reist mit dir bzw. wird um dich herum aufgefüllt; verlassene Gegner despawnen, neue spawnen — Zielzahl bleibt ~25.
- **Off-screen-Ereignisse** (z. B. Desertion ohne Zuschauer) werden **ereignis-gewürfelt** auf Basis der Akten, nicht voll simuliert.
- **Pooling:** Projektile (21), Welt-Chunks (5), Effekte.

---

## 17. Kampfmodell (Vertrag)

- **HP pro Panzer**; **Schaden-Pipeline:** `wirksamerSchaden = waffenSchaden − rüstungsReduktion(Platten)`, danach Schild-Powerup absorbiert/regeneriert separat.
- **„Knapper Sieg" (Vorschlag):** Gegner stirbt, während **Spieler-HP ≤ 15 %** des Maximums. Promotion-Trigger feuert **deterministisch** bei genau dieser Bedingung.
- Trefferzonen: vorerst **nein** (eine HP-Hülle); kann später folgen.
- Exakte Zahlen offen; das **Modell** ist verbindlich.

---

## 18. Steuerung & Kamera (Vertrag)

- **Steuerung (Vorschlag):** Fahren über **WASD**; **Turm/Zielen mit der Maus** (Turm folgt Mauszeiger, entkoppelt von Fahrtrichtung); **Feuern Linksklick**; **Karte M**; Interaktion **E**. **Kein Auto-Aim** (Zielen ist Spielerkönnen).
- **Kamera:** perspektivisch, **feste** Schräg-/Höhen-Distanz, folgt dem Spieler; **nicht frei drehbar** in Slice 1.

---

## 19. Salvage-Liste (Wiederverwendung aus ChaosTank-main)

**Mitnehmen (Ideen/Daten/Mathematik, ggf. nach TS):** Welt-Wrapping-/Distanz-Mathematik; Biom-Kachelung (Konzept); Item-Datenmodelle; Nemesis-Inszenierung als **Steinbruch** (Zeitlupen-Timing, **Dialog-Templates/Sprüche**, Charakter→Farbe, Auslöser-Logik aus `NemesisIntroductionSystem`/`NemesisVisualIdentitySystem`/`PersonalityDialogueSystem` — **nur Logik/Daten**); Idee des `SystemManager`-Dependency-Graphen.

**Wegwerfen:** alle 2D-Renderer/Pipeline, 16 `FullscreenMap*`-Module, „Theater"-Monitore, `main-broken.js`, toter `GameLogic`-Loop, doppelter Loop-Start, alle Fallback-/`catch{}`-Schichten, stummes Logging, Parallelsysteme.

**Sicherheit:** Altes Repo enthält **GitHub-Token im Klartext** + **privaten SSH-Key** (`ssh_key/`) → widerrufen/neu, **nicht** ins Neue.

---

## 20. Build-Reihenfolge (Roadmap)

1. **Slice 1** (Abschnitt 21).
2. Welt & Biome (mehrere, Chunks, Zonen).
3. Items, Loot & Teile-Tier-/Rezept-System.
4. Shop inkl. autonomem Gegner-Einkauf.
5. Voller Promotion-Katalog + Gruppen/Desertion + Reveal-Ausbau.
6. Große Map (M) + Minimap-Ausbau + Inspektor/Inventar/Shop-UI.
7. Wiki, Powerup-Set, **Persistenz-Serialisierung**, Tutorial.

Jeder Schritt: eigene Subsystem-Spec → Plan → bauen → verifizieren.

---

## 21. Slice 1 — Scope & objektive Akzeptanz

**Ziel:** das riskanteste Fundament klein, lauffähig und *ehrlich sichtbar* beweisen.

**Drin:** Babylon+TS+Vite; ein Game-Loop; HTML-HUD; gestuftes Logging; Single-Source + seedbarer RNG · 3D-Endlos-Boden + **Biom-Registry** (1 Biom befüllt) · **ein** Klassen-Panzer mit sichtbaren modularen Teilen (Chassis+Räder+Turm+Waffe), Tausch zur Laufzeit · **ein** Motiv-Gegner (Utility-KI) · **ein** Promotion-Auslöser („knapper Sieg → der Rasende") + minimale Akte (In-Memory) + **Reveal** · Kampf & Zielwahl (kinematische, gepoolte Projektile) · HUD + Minimap · Klassenwahl/Start · Steuerung/Kamera (Abschnitt 18).

**Draußen:** Shop, autonomes Shopping, mehrere Biome, volle Tiers/Uniques, große Map, Gruppen, voller Promotion-Katalog, Wiki, Powerup-Set, **Anfüttern/Verlieren** (Slice 1 testet nur den knappen *Sieg*), Persistenz-Serialisierung.

**Akzeptanzkriterien (objektiv/überprüfbar):**
1. **Modulare Teile:** ≥2 austauschbare Varianten je Socket (Chassis/Räder/Turm/Waffe), Tausch zur Laufzeit sichtbar, im Szenengraph als **getrennte Mesh-Knoten auf benannten Sockets** nachweisbar (belegt das Socket-Schema 6.3).
2. **Motiv erkennbar (messbar):** zwei Spawns mit unterschiedlichem Motiv (z. B. Aasgeier vs. Platzhirsch) in derselben **geseedeten** Szene wählen **nachweislich unterschiedliche Ziele/Routen**; im scharfgeschalteten Log steht je Handlung `(Handlung, Score, Motiv-Beitrag)`. Ohne Differenz-Test + Log-Beleg gilt es als nicht erfüllt.
3. **Promotion deterministisch:** „knapper Sieg" = Gegner stirbt bei **Spieler-HP ≤ 15 %**; Trigger feuert in **10/10** geseedeten Wiederholungen → Named mit Reveal (simSpeed-Slowmo sichtbar an verlangsamten Projektilen + charaktergefärbter Spruch).
4. **Wiedererkennung:** bei Wiederbegegnung erscheint ein vom Erstkontakt **textlich verschiedener**, aus der Akte gespeister Spruch (kein erneuter Reveal).
5. **Keine Phantomschüsse (Pool-Vertrag):** jedes Projektil hat einen getippten Zustand `inactive→inflight→consumed`; `acquire()` setzt **alle** Felder zurück; Kollision betrachtet nur `inflight`; **Log-Zähler `aktiv == sichtbar`** stimmt stets.
6. **Keine stillen Fallbacks (Negativtest):** fehlende Pflicht-Abhängigkeit ⇒ `throw`; **Beispieltest:** unbekanntes Biom ⇒ erwarteter Error.
7. **Modulare Komposition (statt Massen-Stresstest):** mehrere (z. B. 5–10) **individuell aus Teilen komponierte** Panzer werden gleichzeitig korrekt und flüssig dargestellt (Ziel-FPS, Mittelklasse). Der frühere ~100–200-Stresstest entfällt durch die ~25-Roster-Entscheidung (Abschnitt 16); das verbleibende Render-Risiko ist das **Socket-/Asset-Schema** (6.3), nicht die Anzahl.
8. **Logging:** „scharf" liefert gestuftes, lesbares Signal; kein Flackern; keine Doppel-Loops.

---

## 22. Offene Punkte (für spätere Subsystem-Specs)

- Konkrete Wahl des CC0-Kits + Normalisierungs-Pipeline-Details.
- UI-Framework final (React vs. Svelte/Solid) + Komponenten-Kit.
- Exakte Trait-Gewichte/Utility-Funktionen (Schnittstelle steht, Abschnitt 7).
- Vollständige Kataloge (Motiv & Origin) über das Startset hinaus.
- Powerup-Liste & Balancing; Spielgeld-/MK-Level-Kurven; Reparatur-/Anwerb-Kosten.
- Anwerb-Mechanismus für Verbündete.
- Sound/Musik inkl. Reveal-Audio-Cue.
- Save-Schema-Migrationsstrategie (Persistenz-Spec).
