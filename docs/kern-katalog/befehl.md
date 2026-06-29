# Befehlskerne — Tiefkatalog

> Befehl im Kern-Stadium heißt nicht mehr „spiel die 1·2·3-Reihe" — das läuft auto, schnell und perfekt zielend. Ein Befehls-Kern **kommandiert den Auto-Markierer**: was er anfassen darf, in welcher Rangfolge, wie aus Marken BoardScore wird und was die Maschine bewusst *nicht* tut. Board-Zustand = `mark`.

---

## Verbot — der Automation Grenzen geben

### Sperrprotokoll
**Wirkung:** Du führst ein markiertes Ziel als „gesperrt". Auto-Exekution und Auto-Finisher ignorieren es, während es Befehlsdruck lädt; der nächste reguläre Kill entlädt den Druck gebündelt auf die übrigen Marken.
**Warum (Auto-Modus):** Die Maschine würde es sofort wegputzen — du verbietest ihr genau das und schaffst eine gespeicherte Schadensbank.
**Neue Entscheidung:** Welches Ziel verbiete ich meiner eigenen Maschine, um später besser zu ernten?
**Board:** schreibt mark · liest Automation-Ziele · Hook onMark · Risiko med

### Feuerverbot
**Wirkung:** Du sperrst eine ganze Zielklasse (z.B. Bunker) für den Auto-Markierer, bis alles andere tot ist — dann erst fällt das Verbot.
**Warum (Auto-Modus):** Erzwingt eine Aufräum-Reihenfolge, die die perfekte Automation von sich aus nie wählen würde.
**Neue Entscheidung:** Welche Gegnerrolle hebe ich mir bewusst für zuletzt auf?
**Board:** schreibt mark · liest Gegner-Typ · Hook onMark · Risiko med

### Weiße Liste
**Wirkung:** Nur eine einzige gewählte Zielklasse darf überhaupt markiert werden; alles andere ignoriert die Automation komplett.
**Warum (Auto-Modus):** Macht aus dem Allesfresser-Autopilot einen fanatischen Spezialisten — extremer Fokus statt Streuung.
**Neue Entscheidung:** Worauf verenge ich meine ganze Maschine — und lebe ich mit dem Rest?
**Board:** schreibt mark · liest Gegner-Typ · Hook onMark · Risiko high

### Schonfrist
**Wirkung:** Frisch gespawnte Gegner sind ein paar Sekunden markier-immun; die Automation wartet, bis sie „reif" für den Befehl sind.
**Warum (Auto-Modus):** Verhindert, dass die schnelle Maschine Marken an Frischlinge verschwendet — hebt die BoardScore-Qualität pro Marke.
**Neue Entscheidung:** Lasse ich die Welle erst ankommen, statt sofort zu stempeln?
**Board:** schreibt mark · liest Spawn-Alter · Hook onMark · Risiko low

---

## Priorisierung — die Rangfolge der Maschine setzen

### Prioritätsdoktrin
**Wirkung:** Du legst eine feste Zielklassen-Rangfolge fest (z.B. Racer › Schwarm › Bunker); der Auto-Markierer arbeitet sie strikt von oben ab.
**Warum (Auto-Modus):** Du programmierst das Urteilsvermögen der Maschine, statt selbst zu zielen.
**Neue Entscheidung:** Was ist für diesen Build militärisch zuerst dran?
**Board:** schreibt mark · liest Gegner-Typ · Hook onMark · Risiko low

### Bedrohungsfokus
**Wirkung:** Die Automation markiert stets zuerst den objektiv gefährlichsten Gegner (höchster Schadensoutput / kürzeste Distanz).
**Warum (Auto-Modus):** Verlagert „Skill" von Reflex auf eine Regel — die Maschine triagiert für dich nach Gefahr.
**Neue Entscheidung:** Spiele ich auf Sicherheit (Bedrohung zuerst) statt auf Wert?
**Board:** schreibt mark · liest Gegner-DPS · Hook onMark · Risiko low

### Kopfgeld-Order
**Wirkung:** Markierte Ziele einer gewählten Klasse geben bei Kill spürbar mehr (Fuel/EP); die Automation bevorzugt sie automatisch.
**Warum (Auto-Modus):** Lenkt den Autopilot auf Wertziele statt nur auf das Nächste.
**Neue Entscheidung:** Jage ich Wert oder räume ich Druck?
**Board:** schreibt mark · liest Gegner-Typ · Hook onKill · Risiko med

---

## Position — Fahren und Geometrie statt Zielen

### Feuerkorridor
**Wirkung:** Stehen zwei markierte Ziele in einer Linie, spannt sich zwischen ihnen ein Korridor; querende Gegner werden mitmarkiert. Eine sauber abgeräumte Linie stabilisiert den Korridor kurz als eigene Mark-Quelle für den BoardScore.
**Warum (Auto-Modus):** Du steuerst über deine Fahrposition die *Formation*, die die Maschine bearbeitet — nicht den Schuss.
**Neue Entscheidung:** Wie stelle ich mich zur Gegner-Formation?
**Board:** schreibt mark · liest Zielpositionen · Hook onMark · Risiko med

### Kommandoradius
**Wirkung:** Nur Gegner in einem Radius um deinen Panzer werden markiert; fährst du mitten in den Pulk, markiert die Maschine dichter und schneller.
**Warum (Auto-Modus):** Belohnt aggressives Positionieren — Reichweite wird zur Fahrentscheidung, nicht zur Zielhilfe.
**Neue Entscheidung:** Gehe ich ins Getümmel für dichtere Marken oder bleibe ich sicher dünn?
**Board:** schreibt mark · liest Distanz · Hook onMark · Risiko med

### Frontlinie
**Wirkung:** Marken auf Gegner *vor* deiner Fahrtrichtung sind stärker (mehr BoardScore-Gewicht); du „zeigst" mit dem Lenken, wohin der Befehl zählt.
**Warum (Auto-Modus):** Gibt dem Fahren eine Befehlsbedeutung, obwohl die Kanone selbst automatisch zielt.
**Neue Entscheidung:** Fahre ich auf die Ziele zu, die ich aufwerten will?
**Board:** schreibt mark · liest Fahrtrichtung · Hook onMark · Risiko low

---

## Am Leben lassen — als Regel, nicht als Zurückhaltung

### Zeuge
**Wirkung:** Ein Gegner, der eine Hinrichtung überlebt, wird Zeuge. Er wird nicht gefährlicher, aber er hebt den Wert der nächsten Vollstreckung, wenn er später stirbt.
**Warum (Auto-Modus):** Macht aus Überlebenden eine Ressource statt Restmüll — ohne dass du den Schuss zurückhältst.
**Neue Entscheidung:** Lasse ich (per Regel) einen überleben, um später härter zu ernten?
**Board:** liest Überlebende · Hook onFinisherFire · Risiko med

### Geisel
**Wirkung:** Ein bewusst am Leben gelassenes markiertes Ziel strahlt eine schwache Mark-Aura auf seine Nachbarn ab — eine wandelnde Markierungs-Quelle.
**Warum (Auto-Modus):** Verwandelt „nicht töten" in passiven BoardScore, statt in verschenkten Schaden.
**Neue Entscheidung:** Welches Ziel mache ich zum lebenden Sender — und wie lange schütze ich es?
**Board:** schreibt mark · liest Mark-Alter · Hook onMark · Risiko med

### Aufschub
**Wirkung:** Die Automation exekutiert markierte Ziele erst, wenn mindestens N gleichzeitig markiert sind — dann alle auf einmal.
**Warum (Auto-Modus):** Bündelt Einzeltode zu einem BoardScore-Spike, den die ungebremste Maschine nie erzeugen würde.
**Neue Entscheidung:** Warte ich auf die volle Salve oder nehme ich den sicheren Einzeltod?
**Board:** liest Marken-Anzahl · Hook onMark · Risiko med

---

## Herkunft / Gedächtnis — Marken bekommen eine Geschichte

### Befehlsregister
**Wirkung:** Jeder ununterbrochene, korrekt abgeräumte Zielzug schreibt einen Eintrag; eine komplett saubere Reihe lässt den permanenten BBB-Sockel deutlich stärker wachsen.
**Warum (Auto-Modus):** Belohnt, dass du die Automation NICHT durch Verbote/Eingriffe störst — Disziplin auf Bau-Ebene statt auf Trigger-Ebene.
**Neue Entscheidung:** Halte ich die Maschine sauber laufen oder greife ich ein?
**Board:** liest Reihen-Historie · Hook onKill · Risiko low

### Dienstgrad
**Wirkung:** Ein Ziel, das lange markiert überlebt, steigt im Rang; sein Tod gibt dann mehr BoardScore und Fuel. Marken „reifen" wie Gift.
**Warum (Auto-Modus):** Gibt der Marke eine Zeitachse — plötzlich lohnt es, ein Ziel reifen zu lassen statt es sofort zu killen.
**Neue Entscheidung:** Welche Marke lasse ich altern, welche ernte ich sofort?
**Board:** schreibt mark · liest Mark-Alter · Hook onPoisonTick-analog · Risiko med

### Nachlass
**Wirkung:** Stirbt ein lange markiertes Ziel, erbt der nächstgelegene Gegner seine Mark-Stufe, statt dass die Marke einfach verfällt.
**Warum (Auto-Modus):** Hält den BoardScore-Bestand stabil, ohne dass die Maschine neu stempeln muss.
**Neue Entscheidung:** Positioniere ich Kills so, dass die Marke gut „weitervererbt"?
**Board:** schreibt mark · liest Mark-Stufe · Hook onKill · Risiko med

---

## Readiness — das Board für den Finisher herrichten

### Befehls-Zündung
**Wirkung:** Generalbefehl/Urteil feuern nicht auf alle gültigen Ziele gleichzeitig, sondern in Reihenfolge; jeder korrekte Finisher-Kill wertet die nächste Zielmarke auf.
**Warum (Auto-Modus):** Selbst der automatische Finisher fühlt sich wie ein Befehl an, statt wie ein Flächentod.
**Neue Entscheidung:** Baue ich auf eine lange, saubere Finisher-Kette hin?
**Board:** liest mark · BoardScore · Hook onFinisherFire · Risiko low

### Markteppich
**Wirkung:** Die Automation hält stets mindestens N Marken aktiv und füllt nach, sobald welche wegfallen.
**Warum (Auto-Modus):** Garantiert einen Mindest-BoardScore, damit Befehls-Finisher nie leer zünden.
**Neue Entscheidung:** Investiere ich Slots in stabile Finisher-Versorgung statt in Spitzen?
**Board:** schreibt mark · liest Marken-Anzahl · Hook onFinisherReady · Risiko low

### Zielzuweisung
**Wirkung:** Kurz vor Finisher-Readiness markiert die Automation bevorzugt ungedeckte, zähe Ziele statt schwacher.
**Warum (Auto-Modus):** Maximiert die Wucht des kommenden Finishers, indem sie ihn auf lohnende Ziele lenkt.
**Neue Entscheidung:** Spiele ich aktiv auf das Finisher-Fenster hin?
**Board:** schreibt mark · liest BoardScore-Lücke · Hook onFinisherReady · Risiko med

---

## Umdeutung — die Standard-Logik umdrehen

### Räumungsbefehl
**Wirkung:** Statt markierte Masse zu exekutieren, befiehlst du ihr die Flucht nach außen; wer den Pulk verlässt, läuft in Felder und Ränder.
**Warum (Auto-Modus):** Dreht Befehl vom Töten zum Treiben — nützt die Bewegung der Gegner als Werkzeug.
**Neue Entscheidung:** Treibe ich sie in andere Build-Zonen statt sie zu halten?
**Board:** schreibt mark (indirekt) · liest Position · Hook onMark · Risiko med

### Stiller Befehl
**Wirkung:** Marken machen keinen Direktschaden mehr, verdreifachen aber ihren BoardScore-Wert.
**Warum (Auto-Modus):** Macht Befehl zum reinen Finisher-Aufbau-Pol — die Maschine sät, der Finisher erntet.
**Neue Entscheidung:** Verzichte ich auf Sofort-Schaden für gewaltige Finisher?
**Board:** schreibt mark · liest BoardScore · Hook onMark · Risiko high

### Gegenbefehl
**Wirkung:** Die am längsten lebende Marke wird zur „Fahne"; nahe Gegner greifen sie an statt dich.
**Warum (Auto-Modus):** Verwandelt eine Marke in einen Köder — Kontrolle aus dem Befehlssystem statt aus Schaden.
**Neue Entscheidung:** Opfere ich eine Marke als Blitzableiter?
**Board:** schreibt mark · liest Mark-Alter · Hook onMark · Risiko med

---

## Ökonomie / Tempo — Fuel, Takt, Burst

### Sold
**Wirkung:** Jeder Kill an einem markierten Ziel gibt einen Bruchteil Fuel in den Befehl-Pol.
**Warum (Auto-Modus):** Marken finanzieren die Finisher, die sie selbst auslesen — ein geschlossener Kreislauf.
**Neue Entscheidung:** Baue ich auf Marken-Durchsatz, um Fuel-autark zu werden?
**Board:** schreibt fuel · liest mark · Hook onKill · Risiko low

### Eskalation
**Wirkung:** Je länger eine Reihe ununterbrochen läuft, desto schneller markiert die Automation — bei jeder Lücke fällt das Tempo zurück.
**Warum (Auto-Modus):** Belohnt störungsfreien Bau-Fluss mit Tempo, ohne manuelles Zutun.
**Neue Entscheidung:** Schütze ich den Fluss, statt zwischendurch einzugreifen?
**Board:** schreibt mark · liest Reihen-Dauer · Hook onKill · Risiko med

### Standrecht
**Wirkung:** Verbrennt einen Schwung Befehl-Fuel, um sofort die gesamte Sicht zu markieren.
**Warum (Auto-Modus):** Wandelt gespartes Fuel in einen schlagartigen BoardScore-Burst für einen sofortigen Finisher.
**Neue Entscheidung:** Spare ich Fuel für den großen Knopf oder lasse ich es stetig laufen?
**Board:** schreibt mark · liest fuel · Hook Puls · Risiko med
