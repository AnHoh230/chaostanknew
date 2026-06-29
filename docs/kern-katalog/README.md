# Kern-Katalog — Übersicht (Schritt 1: Ideen-Pool)

> Breiter, absichtlich überfüllter Ideen-Pool für die **Kerne**. Über **120 Kerne** in vier Dateien.
> Du cherry-pickst auf Ebene **Design-Zug / Kern**, ich bohre die Treffer auf baubar.
> *(Ersetzt den ersten Einzeldatei-Wurf `docs/kern-ideen-datenbank.md` — der war bottom-up und zu dünn.)*

---

## Das Fundament (gilt für jeden Kern)

Kerne greifen erst, wenn der Panzer schon auf **Autopilot** feuert — schnell, perfekt zielend. Darum:

- **Kein manueller Skill.** Zielen, Kopfschüsse, manuelle 1·2·3-Reihenfolge, Fehler-Korrektur, Dodge-Timing — alles auto, fällt von vornherein weg.
- **Kern-Agency =** die Automation **gesetzgeben** (Regeln/Verbote/Prioritäten) · **Position** (wohin du fährst, Geländegeometrie) · **Board/Readiness** (mark/feld/gift für Finisher herrichten) · **Ökonomie** (Fuel, Fusion, Ban/Deny, Drop).
- **Kein reiner Zahlenbuff.** Jeder Kern ändert Verhalten und erzeugt eine **neue Spielerentscheidung**.

Der Spieler hat aufgehört, den Abzug zu ziehen. Er kommandiert die Maschine und formt das Schlachtfeld.

## Die 8 Design-Züge (der Generator)

Jeder Kern ist ein Punkt aus `Pol × Design-Zug × Hook`. Die Züge sind die Hebel, mit denen man Kerne *erzeugt*:

1. **Verbot** — der Automation eine Grenze setzen (was sie *nicht* anfasst).
2. **Position** — Fahren & Geländegeometrie wichtig machen (nicht Zielen).
3. **Am-Leben-lassen** — als Regel belohnen, einen Gegner *nicht* zu töten.
4. **Opfer/FIFO** — Verzicht/Verdrängung zur Entscheidung mit Abschieds-Effekt machen.
5. **Herkunft/Gedächtnis** — Zuständen Ursprung & Historie geben.
6. **Readiness** — gezielt einen Board-Zustand für den Finisher vorbereiten.
7. **Umdeutung** — die Standard-Logik umdrehen (Mitte→Rand, töten→behalten, folgen→reagieren).
8. **Ökonomie/Tempo** — Fuel, Drop, Fusion, Takt als Hebel.

## So liest du das (top-down)

Pol-Datei öffnen → nach **Design-Zug** scannen → Kern picken. Jeder Kern trägt: *Wirkung · Warum (im Auto-Modus) · Neue Entscheidung · Board (schreibt·liest·Hook·Risiko)*.

---

## Die vier Kataloge

| Pol | Datei | Kerne | Identität im Kern-Stadium |
|---|---|---|---|
| Befehl | [befehl.md](befehl.md) | 25 | den Auto-Markierer kommandieren (`mark`) |
| Raum | [raum.md](raum.md) | 36 | das auto-gelegte Feld-Geflecht formen (`feld`) |
| Zustand | [zustand.md](zustand.md) | 36 | die automatische Seuche kultivieren (`gift`) |
| Hybrid + Meta | [hybrid-meta.md](hybrid-meta.md) | 26 | zwei Zustände koppeln · Finisher/Ökonomie/Haut |

---

## Landkarte — alle Kerne nach Pol × Design-Zug

### Befehl (`befehl.md`)
- **Verbot:** Sperrprotokoll · Feuerverbot · Weiße Liste · Schonfrist
- **Priorisierung:** Prioritätsdoktrin · Bedrohungsfokus · Kopfgeld-Order
- **Position:** Feuerkorridor · Kommandoradius · Frontlinie
- **Am-Leben-lassen:** Zeuge · Geisel · Aufschub
- **Herkunft:** Befehlsregister · Dienstgrad · Nachlass
- **Readiness:** Befehls-Zündung · Markteppich · Zielzuweisung
- **Umdeutung:** Räumungsbefehl · Stiller Befehl · Gegenbefehl
- **Ökonomie:** Sold · Eskalation · Standrecht

### Raum (`raum.md`)
- **Verbot:** Bannmeile · Schweigegebot · Sperrgelände · Quotenregel
- **Position:** Schleppspur · Eckenbauer · Brückenschlag · Wallmeister · Höhenlinie
- **Am-Leben-lassen:** Randhüter · Drehtür · Köderzone · Quarantäne
- **Opfer/FIFO:** Abschiedsknall · Erbschaft · Phönixfeld · Aschebett · Opferanode
- **Herkunft:** Altersstärke · Heimatfeld · Blutspur · Echo der Strecke
- **Readiness:** Belagerungsdruck · Schwellenfeld · Resonanzgitter · Stillstandsglut
- **Umdeutung:** Hirtenfeld · Wanderdüne · Sammelgrund · Gezeitenfeld · Niemandsland
- **Ökonomie:** Treibstofffeld · Erntepacht · Pfändung · Wegezoll · Verschrottung

### Zustand (`zustand.md`)
- **Verbot:** Saatgebot · Inkubationsruhe · Stilles Feld · Quarantänegesetz · Schwellenbann
- **Position:** Schleppspur · Talkessel · Windschatten · Standlager · Geländeader
- **Am-Leben-lassen:** Kranke Hände · Wandelnder Herd · Pestglocke · Brutwirt · Siechtum
- **Opfer/FIFO:** Erstgeburt · Brandopfer · Zehntopfer · Ahnenkette
- **Herkunft:** Stammbaum · Reinerbe · Patient Null · Seuchengedächtnis · Wirtsbindung
- **Readiness:** Saatdichte · Reife-Reserve · Doppelnährung · Erntestau-Anzeige · Giftpfand
- **Umdeutung:** Faulreife · Totenfunke · Trockenseuche · Märtyrertod · Schweigende Wirte
- **Ökonomie:** Erntespeicher · Reifezünder · Pollenflug · Mutationsdruck · Seuchenzoll · Brachzeit

### Hybrid + Meta (`hybrid-meta.md`)
- **B+R (Architekt):** Rasterschluss · Bastions-Dekret · Brückenkopf · Belagerungsplan
- **R+Z (Alchemist):** Brutkammer · Seuchenboden · Miasma-Druck · Gärungsherd
- **B+Z (Richter):** Aktenzeichen · Gelenkte Ansteckung · Vollstreckungsbefehl · Kronzeuge
- **Finisher-Gefäß:** Stempelschlag · Kraterrecht · Restseuche · Stiltreue Zündung
- **Readiness:** Schwelbrand · Pulverkammer · Leerer Abzug
- **Ökonomie:** Raffinerie · Überlauf-Ventil · Beuterecht · Magnetstollen · Schleifstein · Brennofen · Banngewölbe
- **Verhärtung/Haut:** Mastery-Korsett · Nachhall · Systembruch-Siegel

*(Kleinkram: „Schleppspur" taucht in Raum und Zustand auf — beim Auswählen einen umbenennen.)*

---

## Was als Nächstes

1. **Markier die Design-Züge / Kerne, die zünden** (gern grob: „Raum-Opfer/FIFO komplett", „Befehl-Verbot", einzelne Namen).
2. Für die Treffer **bohre ich Level 2–3 tief**: konkrete Wirkung mit Zahlen-Range, Implementierungs-Hook im echten Code, Risiko/Balance, 1–2 Varianten.
3. Dann die **Fusions-Tabelle** + die **≥2-Primäre-Mathematik** (Kernzahl × Fusionspaare × Ban/Deny) für genau den gewählten Pool.
