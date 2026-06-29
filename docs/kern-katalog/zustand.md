# Kern-Katalog — ZUSTANDSKERNE (Z)

> **Top-down (2 Sätze):** Im Kern-Stadium feuert der Panzer schon automatisch — schnell, perfekt zielend; ein Zustand-Kern wirkt **nie auf den Abzug**, sondern darauf, *wie die automatische Seuche kultiviert und strukturiert* wird. Er setzt Gesetze (wen die Automation infiziert, wen sie verschont), formt das Gelände und die Position, an der Infektionen entstehen, verwaltet **Herkunft/Reife/Quarantäne** der Herde und deutet Gift in **Finisher-Brennstoff / BoardScore** um.

**Geltungsannahmen (aus dem Code, `src/build/garten.ts` + `gartenProgression.ts`):** Schüsse säen `potency` (automatisch). Potenz **reift** je Tick (`×reife`), die Drosselung steigt mit der Reife bis 1 (reif = steht). Reif (`potency ≥ erntePot`) → das Gift wird tödlich (`reifDmg`). Ansteckung steckt pro Tick den **nächsten gesunden** Nachbarn im `ansteckRadius` an — und nur **neue** Ziele, um Reife nicht zu überschreiben. **Ernte** (reifer Gift-Tod) gibt **Erntefieber**, das **ausschließlich** `reifDmg` erhöht. Board-Zustand = `gift` (`giftStacks` je Gegner); Finisher lesen `gift` und entladen den hergerichteten Board (`onFinisherFire`). Ults: **Nährboden** (Ernten heilen), **Gnadenstoß** (Angesteckte unter Schwelle sterben sofort), **Ausbruch** (Ernten stecken Umkreis an + Erntefieber).

**Konventionen aller Kerne:** gefunden · 5 Slots · 5 Level (über Kills) · zwei Maxe fusionieren zu einem Dual-Kern (Slot frei) · wirken **automatisch**. Kein Kern verlangt manuellen Skill. Kein Kern ist ein reiner Zahlenbuff. Jeder erzeugt **eine neue Entscheidung**.

---

## Zug 1 — VERBOT *(die Automation gesetzgeben: was sie NICHT tun darf)*

*Identität: Du regierst die Seuche durch Verbote. Der Wert entsteht, weil die perfekte Auto-Infektion ohne Regel ihre eigene Reife zerstört (überschreibt, übertötet, verstreut).*

### Saatgebot
**Wirkung:** Die Automation infiziert ein Ziel nur einmal und sät danach **nicht nach**, bis dessen Potenz die Schwelle erreicht hat. Frei werdende Schüsse gehen automatisch an noch gesunde Gegner.
**Warum (im Auto-Modus):** Auto-Feuer hämmert sonst dasselbe Ziel voll und treibt Potenz weit über `erntePot` — verschwendete Saat, die nichts beschleunigt. Das Gebot wandelt Überschuss in Breite.
**Neue Entscheidung:** Breite vor Tiefe akzeptieren — viele Reifeträger statt weniger Übersättigter; du positionierst, damit die freien Schüsse Gesunde finden.
**Board:** schreibt gift · liest potency/Reife · Hook onInfect · Risiko low

### Inkubationsruhe
**Wirkung:** Verbietet der Automation, auf ein Ziel zu schießen, dessen Reife über der Hälfte liegt — solche Ziele werden „in Ruhe gelassen" und reifen ungestört zu Ende.
**Warum (im Auto-Modus):** Späte Nachschüsse stapeln nur `potency`, verkürzen die Inkubation aber kaum (Reife ist multiplikativ) und stehlen Schüsse, die anderswo eine neue Kette starten. Ruhe = mehr parallele Reifefenster.
**Neue Entscheidung:** Reife als „abgeschlossen" lesen und die Aufmerksamkeit (Position) auf frische Herde lenken.
**Board:** schreibt gift · liest Reife-Stufe · Hook onInfect · Risiko low

### Stilles Feld
**Wirkung:** Solange ein **reifer** Gegner im Sichtfeld steht, feuert die Automation gar nicht (Funkstille), bis er geerntet ist. Danach normal weiter.
**Warum (im Auto-Modus):** Erzwingt, dass jede Reife wirklich zur **Ernte** wird (Erntefieber), statt dass Auto-Feuer den Reifen vorzeitig anders tötet oder die nächste Welle verfrüht ansät und die Ansteckung verzettelt.
**Neue Entscheidung:** Ernten *aussitzen* — du fährst Deckung/Kreise, während das Feld arbeitet, statt Feuerdruck zu wollen.
**Board:** liest Reife · Hook onPoisonTick · Risiko med

### Quarantänegesetz
**Wirkung:** Die Automation infiziert keinen Gegner, der bereits einen infizierten Nachbarn im Ansteckradius hat — Erstinfektionen nur dort, wo die Seuche **noch nicht** hinreicht.
**Warum (im Auto-Modus):** Verhindert Doppelarbeit: Ansteckung deckt Pulks ohnehin ab; manuelle Saat dort ist verschwendet. Schüsse setzen stattdessen neue, getrennte Herde — mehr Ansteckungs-Fronten.
**Neue Entscheidung:** Du säst „Funken" in Lücken und lässt die Ansteckung füllen — Kartenlesen statt Zielen.
**Board:** schreibt gift · liest Nachbar-Infektion · Hook onInfect · Risiko med

### Schwellenbann
**Wirkung:** Verbietet jeden direkten Schaden an Angesteckten, der sie **vor** der Reife töten würde (Köchel/Finisher-Splash gedeckelt) — Angesteckte können nur am **reifen** Gift sterben.
**Warum (im Auto-Modus):** Schützt die Erntefieber-Ökonomie: ein Vorreife-Tod gibt **kein** Erntefieber. Der Bann garantiert, dass investierte Inkubation immer als Ernte zurückkommt.
**Neue Entscheidung:** Gegner bewusst leben lassen, obwohl du sie „erledigen" könntest — Geduld als Regel.
**Board:** liest Reife/HP · Hook onPoisonTick|onKill · Risiko high

---

## Zug 2 — POSITION *(Fahren & Geländegeometrie als Seuchen-Werkzeug)*

*Identität: Wo der Panzer steht und fährt, entscheidet, wo Infektionen entstehen und wie eng sie ansteckungsfähig clustern. Du steuerst die Seuche mit dem Chassis, nicht mit dem Turm.*

### Schleppspur
**Wirkung:** Der Panzer zieht beim Fahren eine schwache Sporenspur; gesunde Gegner, die sie kreuzen, werden mit Minimal-Potenz angeimpft (reift langsam von selbst zu einem Ansteckungs-Funken).
**Warum (im Auto-Modus):** Nutzt die Nachlade-/Ausweich-Bewegung produktiv — die Phase, in der das Auto-Feuer schweigt, sät trotzdem. Deine Fahrlinie wird zur Aussaat.
**Neue Entscheidung:** Fluchtwege so wählen, dass sie durch Gegnerpulks führen — Fahren *ist* Säen.
**Board:** schreibt gift · liest Panzer-Pfad · Hook onPoisonTick · Risiko low

### Talkessel
**Wirkung:** In Engstellen/Sackgassen (Geometrie erkannt) verdoppelt sich der effektive Ansteckradius der dort stehenden Infizierten; auf offenem Feld normal.
**Warum (im Auto-Modus):** Die Ansteckung steckt sonst nur den **einen** nächsten Nachbarn pro Tick an — in der Enge stehen mehr Nachbarn dicht, also greift jede zusätzliche Reichweite überproportional. Du machst Gelände zum Brutkasten.
**Neue Entscheidung:** Gegner in Engen *hineinlocken/kiten*, statt sie im Offenen anzusäen.
**Board:** schreibt gift · liest Gelände/Dichte · Hook onPoisonTick · Risiko med

### Windschatten
**Wirkung:** Ansteckung springt bevorzugt **von dir weg** (in Bewegungsrichtung der Gegner-Herde), nie zurück auf bereits ausgereifte Felder — die Seuche „rollt" als Welle durch den Pulk.
**Warum (im Auto-Modus):** Verhindert, dass die Automation Reife überschreibt, indem die Ansteckungs-Richtung gelenkt wird; eine rollende Front reift gestaffelt statt alles gleichzeitig (= stetiger Ernte-Strom).
**Neue Entscheidung:** Dich so stellen, dass die „Windrichtung" in den dichtesten Teil der Welle zeigt.
**Board:** schreibt gift · liest Herden-Vektor · Hook onInfect · Risiko med

### Standlager
**Wirkung:** Bleibst du längere Zeit nahezu stationär, verankert sich ein wachsender Seuchenherd um deine Position; je länger du hältst, desto größer der Ansteckradius **dieses** Herds (Reset bei Wegfahren).
**Warum (im Auto-Modus):** Belohnt bewusstes Halten (gegen den Reflex, ständig zu kiten) als taktische Wahl — der Herd wird zur Ernte-Maschine, solange du ihn deckst.
**Neue Entscheidung:** Halten-oder-Fahren als echte Abwägung: Standlager-Ernte gegen Bewegungssicherheit.
**Board:** schreibt gift · liest Stillstand-Zeit · Hook onPoisonTick · Risiko high

### Geländeader
**Wirkung:** Reife/tödliche Felder, die du erzeugst, „kriechen" entlang von Wänden und Hindernissen weiter (statt frei zu verpuffen) und stecken Gegner an, die sich an Deckung entlangbewegen.
**Warum (im Auto-Modus):** Gegner-KI nutzt Deckung — die Ader legt die Seuche genau auf ihre Laufwege. Geometrie wird zum Leitsystem der Ansteckung.
**Neue Entscheidung:** Karten mit viel Wandführung gezielt bespielen; Aussaat an Wänden statt im Offenen.
**Board:** schreibt gift · liest Wand-Geometrie · Hook onInfect · Risiko med

---

## Zug 3 — AM-LEBEN-LASSEN *(Reife mit Gegner-Verhalten koppeln, statt zu töten)*

*Identität: Der höchste Wert eines Gegners ist nicht sein Tod, sondern seine Reife. Diese Kerne machen das Leben des Infizierten produktiv und koppeln Reife-Schwellen ans Verhalten (zielt schlechter → steht).*

### Kranke Hände
**Wirkung:** Angesteckte zielen mit steigender Reife zunehmend daneben (Streuung wächst mit `potency`); reif = sie feuern gar nicht mehr. Kein direkter Slow-Buff, sondern Treffgenauigkeit.
**Warum (im Auto-Modus):** Koppelt die Reife-Schwelle an **Verhalten** statt nur an Tempo — ein halbreifer Gegner darf leben, weil er kaum noch trifft. Macht „am Leben lassen" überlebbar.
**Neue Entscheidung:** Bedrohliche Schützen anreifen statt töten — du entwaffnest durch Krankheit.
**Board:** schreibt gift · liest Reife-Stufe · Hook onPoisonTick · Risiko low

### Wandelnder Herd
**Wirkung:** Ein angesteckter, noch lebender Gegner trägt die Seuche aktiv weiter: jeder Tick, den er **lebt**, erhöht seinen eigenen Ansteckradius leicht — ein „Patient Null", der je länger er läuft, desto mehr Funken setzt.
**Warum (im Auto-Modus):** Gibt der Automation einen Grund, einen Gegner **nicht** reif werden zu lassen — ein gehaltener Mittelreife-Träger verseucht mehr als ein schneller Tod.
**Neue Entscheidung:** Einen Träger gezielt „füttern" und durch den Pulk kiten, statt ihn zu ernten.
**Board:** schreibt gift · liest Lebenszeit-infiziert · Hook onPoisonTick · Risiko med

### Pestglocke
**Wirkung:** Solange mindestens ein **reifer** Gegner steht, aber **nicht** geerntet wird, strahlt er einen Verlangsamungs-Puls auf gesunde Gegner im Umkreis aus — der Reife wird zur stehenden Falle.
**Warum (im Auto-Modus):** Wandelt die Wartezeit bis zur Ernte in Crowd-Control um; die Reife ist nicht totes Warten, sondern aktiver Nutzen. Belohnt das Hinauszögern der Ernte.
**Neue Entscheidung:** Ernte timen — eine Glocke laufen lassen, um die nächste Welle zu bremsen.
**Board:** liest Reife · Hook onPoisonTick · Risiko med

### Brutwirt
**Wirkung:** Markiert (intern) den **zähesten** angesteckten Gegner als Wirt; solange er lebt, reifen alle von **ihm** Angesteckten schneller. Stirbt er, fällt der Bonus weg.
**Warum (im Auto-Modus):** Brocken/Bunker haben hohe HP und reifen sicher durch — der Kern macht ihr langes Leben zum Vorteil statt zum Ärgernis. Die Automation schützt den Wirt implizit (Schwellenbann-Synergie).
**Neue Entscheidung:** Den Tank **nicht** zuerst räumen, sondern als Reife-Reaktor erhalten.
**Board:** schreibt gift · liest HP/Wirt-Flag · Hook onInfect · Risiko high

### Siechtum
**Wirkung:** Angesteckte verlieren mit steigender Reife langsam Max-HP (zehren aus), sterben aber weiterhin nur am reifen Gift — sie werden zum leichteren, aber bewusst lebenden Ziel für die Ansteckung.
**Warum (im Auto-Modus):** Senkt die effektive Schwelle, ab der reifes Gift tötet, ohne `reifDmg` zu erhöhen (kein Zahlenbuff) — die Wirkung kommt aus dem Verhalten/Verfall, nicht aus mehr Schaden.
**Neue Entscheidung:** Zähe Gegner anreifen und „aushungern" lassen statt Feuer zu konzentrieren.
**Board:** schreibt gift · liest Reife/MaxHP · Hook onPoisonTick · Risiko med

---

## Zug 4 — OPFER / FIFO *(bewusst älteste/erste Infektionen verbrauchen)*

*Identität: Die Seuche hat ein Gedächtnis und eine Warteschlange. Diese Kerne machen die **Reihenfolge** der Infektionen zur Ressource — wer zuerst kam, wird zuerst geopfert oder geerntet.*

### Erstgeburt
**Wirkung:** Der **älteste** lebende Infizierte gilt als „Erstgeborener": Stirbt er reif, gibt er doppeltes Erntefieber, und sein Tod impft automatisch den **nächst-ältesten** als neuen Erstgeborenen.
**Warum (im Auto-Modus):** Schafft eine geordnete Ernte-Kette aus der bestehenden Reife-Reihenfolge, ohne Reife zu überschreiben — die Automation pflegt eine FIFO-Schlange statt chaotisch zu ernten.
**Neue Entscheidung:** Die älteste Infektion schützen/durchbringen, statt die nächstbeste zu ernten.
**Board:** schreibt gift · liest Infektions-Alter · Hook onKill · Risiko med

### Brandopfer
**Wirkung:** Erreicht das Feld eine Überzahl an Infizierten, „opfert" der Kern automatisch den am weitesten gereiften: sofortiger Tod als Ernte, dessen Nova alle Nachbar-Reifen mit-zündet (Kaskade).
**Warum (im Auto-Modus):** Löst Reife-Stau auf, bevor zu viele Reife gleichzeitig stehen und die nächste Welle nicht mehr angesät werden kann — ein Ventil, das die Seuche am Laufen hält.
**Neue Entscheidung:** Wann den Stau zünden lassen (Opfer jetzt) vs. mehr Reife sammeln für eine größere Kaskade.
**Board:** liest Reife-Zähler · Hook onMature|onKill · Risiko high

### Zehntopfer
**Wirkung:** Jeder zehnte angesteckte Gegner wird intern als „Zehnt" geführt — stirbt er (reif), entlädt sich der gesammelte Köchel-Schaden aller seither Verstorbenen als Bonus-Erntefieber.
**Warum (im Auto-Modus):** Verwandelt die unvermeidlichen Vorreife-Köchel-Tode (Verlust in der Erntefieber-Logik) in eine periodische Auszahlung — verschenkte Ticks werden gebündelt nutzbar.
**Neue Entscheidung:** Köchel-Tode dulden statt vermeiden, weil sie auf den Zehnt einzahlen.
**Board:** schreibt gift · liest Tod-Zähler · Hook onKill · Risiko med

### Ahnenkette
**Wirkung:** Stirbt ein reifer Gegner, „erbt" der **am längsten** lebende noch-unreife Angesteckte einen Reife-Schub — Erntereife wandert vom Toten zum Ältesten weiter.
**Warum (im Auto-Modus):** Hält die Ernte-Frequenz hoch, ohne neue Saat oder schnelleres Reifen pauschal (kein Zahlenbuff) — die Reife wird **umverteilt** entlang der Altersschlange.
**Neue Entscheidung:** Die Reihenfolge der Infektionen bewusst staffeln, damit ein Erbe bereitsteht.
**Board:** schreibt gift · liest Infektions-Alter/Reife · Hook onKill · Risiko med

---

## Zug 5 — HERKUNFT / GEDÄCHTNIS *(Stamm, Wirt, Linie einer Infektion)*

*Identität: Jede Infektion weiß, woher sie kommt. Diese Kerne lesen die Abstammung (per Saat vs. per Ansteckung, von welchem Wirt) und belohnen reine Linien, gewachsene Ketten oder den Ursprungsfunken.*

### Stammbaum
**Wirkung:** Per **Ansteckung** entstandene Infektionen tragen die „Generation" ihres Stamms; je tiefer in der Ansteckungskette (Enkel, Urenkel), desto höher ihr reifer Gift-Schaden — die Seuche wird mit jeder Weitergabe virulenter.
**Warum (im Auto-Modus):** Belohnt lange, ungestörte Ansteckungsketten — also genau das Verhalten, das das Quarantäne-/Saatgebot fördert. Die Automation soll **wenig** selbst säen und **viel** ansteckt.
**Neue Entscheidung:** Einen einzigen Funken tief durch einen großen Pulk laufen lassen statt überall neu anzusäen.
**Board:** schreibt gift · liest Ansteckungs-Generation · Hook onInfect · Risiko med

### Reinerbe
**Wirkung:** Gegner, die **nur** durch Ansteckung (nie durch deinen Schuss) infiziert wurden, reifen ohne Inkubations-Wackeln gleichmäßig durch und geben bei Ernte mehr Erntefieber — „wild gewachsene" Seuche zählt mehr.
**Warum (im Auto-Modus):** Setzt einen Anreiz, die Automation gerade **nicht** überall feuern zu lassen — die wertvollste Ernte ist die, die sich selbst getragen hat.
**Neue Entscheidung:** Schuss-Disziplin: nur den Ursprung setzen, den Rest der Seuche überlassen.
**Board:** schreibt gift · liest Infektions-Herkunft · Hook onKill · Risiko low

### Patient Null
**Wirkung:** Der **ursprüngliche** Funke jeder Kette (das von dir geschossene Saatziel) ist als „Null" markiert; solange er lebt, reifen alle seine Nachkommen schneller. Stirbt Null, verlangsamt sich die ganze Linie spürbar.
**Warum (im Auto-Modus):** Gibt einem bestimmten Gegner strategischen Schutzwert — die Automation darf Null **nicht** ernten, obwohl er oft zuerst reif ist (Spannung mit FIFO-Kernen).
**Neue Entscheidung:** Den Ursprungsgegner identifizieren und bewusst am Leben halten.
**Board:** schreibt gift · liest Herkunft/Null-Flag · Hook onInfect|onKill · Risiko high

### Seuchengedächtnis
**Wirkung:** Stirbt ein reifer Gegner eines Typs (z. B. Läufer), merkt sich der Kern den Typ; die nächste Infektion **desselben** Typs startet mit Vorsprung-Potenz. Über einen Run lernt die Seuche ihre Beute.
**Warum (im Auto-Modus):** Übersetzt wiederkehrende Wellen-Muster in wachsende Effizienz, ohne pauschalen Buff — der Vorsprung gilt nur für „bekannte" Typen.
**Neue Entscheidung:** Welchen Typ du zuerst „lehrst" (früh ernten), um ihn später im Pulk schneller zu knacken.
**Board:** schreibt gift · liest Gegner-Typ-Gedächtnis · Hook onKill|onInfect · Risiko med

### Wirtsbindung
**Wirkung:** Jede Ansteckung bleibt an ihren Wirt gebunden: Stirbt der Wirt **bevor** der Angesteckte reif ist, verfällt dessen Infektion mit. Reift der Wirt jedoch durch, „segnet" sein Tod alle seine Direkt-Angesteckten zur Sofort-Reife.
**Warum (im Auto-Modus):** Macht die Abstammung zweischneidig — die Automation muss Wirte durchbringen, sonst kollabiert deren Subbaum. Belohnt geduldiges Hüten ganzer Linien.
**Neue Entscheidung:** Wirte priorisiert schützen; ihren reifen Tod als Ketten-Auslöser timen.
**Board:** schreibt gift · liest Wirt-Linie · Hook onKill · Risiko high

---

## Zug 6 — READINESS *(Board-Zustand & Finisher-Bereitschaft vorbereiten)*

*Identität: Gift ist nicht nur Schaden, sondern **Munition** für Finisher (BoardScore über `giftStacks`). Diese Kerne richten den Board so her, dass die automatischen Finisher voll entladen — sie kultivieren Bereitschaft, nicht Kills.*

### Saatdichte
**Wirkung:** Hält die Automation aktiv `giftStacks` auf möglichst **vielen** Gegnern gleichzeitig (Breite vor Stärke), statt wenige hoch zu stapeln — der `gift`-BoardScore wächst über die Zahl der Träger.
**Warum (im Auto-Modus):** BoardScore zählt Stacks pro Gegner (gedeckelt) plus Synergie-Bonus je belegtem Zustand — viele Träger schlagen wenige Übersättigte. Bereitet Tier-1-Finisher (`seuchenausbruch`) für volle Wucht vor.
**Neue Entscheidung:** Auf Flächendeckung spielen, wenn ein Finisher geladen ist — säen für den Board, nicht für den Tod.
**Board:** schreibt gift · liest giftStacks-Verteilung · Hook onInfect|onFinisherFire · Risiko low

### Reife-Reserve
**Wirkung:** Hält gezielt eine kleine Zahl reifer Gegner **ungeerntet** als „geladene" Hochwert-Stacks zurück; ein Finisher, der diese Reife entlädt, bekommt einen Wucht-Aufschlag.
**Warum (im Auto-Modus):** Reife = maximale `giftStacks`/Potenz; sie nicht zu ernten, sondern in einen Finisher-Tick zu kippen, ist der höchste BoardScore-Hebel. Koppelt Ernte-Verzicht an Finisher-Timing.
**Neue Entscheidung:** Reife horten statt ernten, bis der Finisher bereit ist — Erntefieber jetzt vs. Finisher-Wucht gleich.
**Board:** schreibt gift · liest Reife/giftStacks · Hook onFinisherFire · Risiko high

### Doppelnährung
**Wirkung:** Schreibt zusätzlich zum `gift`-Zustand einen schwachen `feld`-Zustand unter dichten Infizierten — Gegner tragen zwei Board-Zustände, was den Synergie-Bonus im BoardScore auslöst.
**Warum (im Auto-Modus):** Der Board wertet „zwei passende Zustände auf einem Gegner" extra (`BOARD_WEIGHT_TWO_MATCHING_STATES`) — relevant für Dual-Finisher wie `sporenfeld` (feld+gift). Bereitet Cross-Pol-Readiness rein aus Zustand-Seite vor.
**Neue Entscheidung:** Infizierte verdichten, damit der Doppelzustand zündet — Cluster für den Synergie-Bonus.
**Board:** schreibt gift|feld · liest Dichte · Hook onPoisonTick|onFinisherFire · Risiko med

### Erntestau-Anzeige
**Wirkung:** Bündelt reife Gegner intern zu einem „Ladebalken"; ist genug Reife im Feld, **hält** der Auto-Finisher-Dispatcher zurück, bis die Schwelle für maximale Readiness erreicht ist, und feuert dann gesammelt.
**Warum (im Auto-Modus):** Der Dispatcher feuert sonst beim ersten ausreichenden BoardScore (`MIN_EFFECTIVE`) — oft unter dem Optimum. Dieser Kern verschiebt das Auto-Feuer Richtung Readiness-Maximum.
**Neue Entscheidung:** Ein volles Feld aufbauen und das System „laden" lassen, statt früh kleine Finisher abzufeuern.
**Board:** liest BoardScore/Reife · Hook onFinisherFire · Risiko med

### Giftpfand
**Wirkung:** Jeder Vorreife-Köchel-Tod (der sonst kein Erntefieber gibt) zahlt stattdessen einen Bruchteil als **Fuel** in den Zustand-Pol ein — verlorene Infektionen finanzieren den nächsten Finisher.
**Warum (im Auto-Modus):** Finisher kosten Fuel (`treibstoff: { zustand }`); in dichten Pulks sterben viele vorzeitig — dieser Kern recycelt diesen Verlust in Zünd-Ökonomie statt ihn zu verschwenden.
**Neue Entscheidung:** Übersaat/Massentod nicht mehr meiden, sondern als Fuel-Quelle einplanen.
**Board:** schreibt gift · liest Köchel-Tode/Fuel · Hook onKill|onFinisherFire · Risiko low

---

## Zug 7 — UMDEUTUNG *(eine Kern-Regel kehrt eine Seuchen-Annahme um)*

*Identität: Diese Kerne brechen je eine eingebaute Annahme der Seuche (Reife = gut, Tod = Ende, Ansteckung = Nachbar) und zwingen dich, neu zu spielen.*

### Faulreife
**Wirkung:** Kehrt die Reifekurve um: Gegner sind **frisch** am gefährlichsten (hoher Köchel) und werden mit der Reife **harmloser**, sterben aber weiterhin erst reif. Belohnung verschiebt sich vom Ernten zum Anstecken.
**Warum (im Auto-Modus):** Zwingt die Automation, Breite statt Tiefe zu fahren — frische Funken überall schlagen wenige Reife. Bricht die „reif = Ziel"-Gewohnheit ohne Zahlenbuff.
**Neue Entscheidung:** Auf Erstinfektions-Tempo spielen statt auf Reife-Ernte.
**Board:** schreibt gift · liest Reife-Stufe (invertiert) · Hook onPoisonTick · Risiko high

### Totenfunke
**Wirkung:** Ein reifer Gift-Tod ist **nicht** das Ende: Die Leiche bleibt als ansteckender Herd liegen und steckt eine Zeitlang gesunde Gegner an, die über sie laufen — Tote säen weiter.
**Warum (im Auto-Modus):** Deutet den Kill von „Abschluss" zu „Saatquelle" um; die Automation muss Leichen-Positionen als Karten-Features mitdenken. Verlängert Ketten über den Tod hinaus.
**Neue Entscheidung:** Gegner über frische Leichen kiten; Schlachtfeld-Hotspots merken.
**Board:** schreibt gift · liest Leichen-Position · Hook onKill · Risiko med

### Trockenseuche
**Wirkung:** Ansteckung springt nicht mehr auf den **nächsten**, sondern auf den **entferntesten** Gesunden in Reichweite — die Seuche streut bewusst, statt zu verdichten.
**Warum (im Auto-Modus):** Kehrt das „nächster Nachbar"-Gesetz um (gegen das Quarantäne-/Talkessel-Denken) und maximiert **Flächendeckung** statt Herd-Dichte — stark mit Readiness-Breite-Kernen, schwach mit Kaskaden.
**Neue Entscheidung:** Pulks aufbrechen statt bündeln — Streuung als Strategie wählen.
**Board:** schreibt gift · liest Nachbar-Distanz (invertiert) · Hook onInfect · Risiko high

### Märtyrertod
**Wirkung:** Tötet die **Automation** doch einmal einen Angesteckten vor der Reife (unvermeidbar bei AoE), zündet dessen unfertige Potenz als kleine Ansteckungs-Nova — der „falsche" Tod sät statt zu verpuffen.
**Warum (im Auto-Modus):** Macht den sonst wertlosen Vorreife-Tod (kein Erntefieber) zu einem Streu-Mechanismus; die Automation darf wieder freier feuern, ohne Reife-Verlust zu „bestrafen".
**Neue Entscheidung:** Vorreife-Tode in dichten Pulks aktiv suchen, um Funken zu streuen.
**Board:** schreibt gift · liest Potenz-bei-Tod · Hook onKill · Risiko med

### Schweigende Wirte
**Wirkung:** Reife Gegner geben **kein** Glühen/Rauch mehr ab (für die Gegner-KI unsichtbar krank) — umstehende Gegner fliehen nicht vor reifen Herden, sondern laufen weiter hinein.
**Warum (im Auto-Modus):** Wenn die KI auf Reife-Signale reagieren würde, mieden Gesunde die Herde; die Umdeutung hält den Pulk dicht und ansteckungsfähig. Reine Verhaltens-/Wahrnehmungsregel.
**Neue Entscheidung:** Reife als Köder einsetzen, um Nachschub in den Herd zu ziehen.
**Board:** liest Reife/KI-Sicht · Hook onMature · Risiko med

---

## Zug 8 — ÖKONOMIE / TEMPO *(Fuel, Erntefieber, Fusion, Drop, Takt)*

*Identität: Diese Kerne greifen in die Schicht-1-Schleife der Seuche — Erntefieber-Kurve, Fuel-Fluss, Slomo/Munition als Aussaat-Takt, Fusions-Reife. Vorsicht bei der Garantie-Mathematik.*

### Erntespeicher
**Wirkung:** Erntefieber zerfällt nicht mehr ungenutzt, sondern wird über einen Schwellenwert hinaus „eingelagert"; bricht der Ernte-Strom ab (keine Ernte für X s), zehrt die Seuche aus dem Speicher und hält `reifDmg` oben.
**Warum (im Auto-Modus):** Glättet die selbsttragende Erntefieber-Spirale gegen Durststrecken (z. B. zwischen Wellen), in denen sonst nichts reif stirbt — Stabilität statt höherem Peak (kein Zahlenbuff).
**Neue Entscheidung:** Erntefieber „sparen" vor einer ruhigen Phase statt es zu verfeuern.
**Board:** liest Erntefieber/Ernte-Takt · Hook onKill · Risiko med

### Reifezünder (Fusions-Kern)
**Wirkung:** Beschleunigt die **Reife einer anstehenden Fusion**: Kills an reifen Gegnern zählen doppelt auf den Fortschritt der beiden zu fusionierenden Kerne — die Seuche „brütet" die Fusion aus.
**Warum (im Auto-Modus):** Bindet die Meta-Progression (Fusion) an das Kern-Loop-Verhalten (Ernte) statt an reine Zeit; belohnt aktives Ernten mit schnellerem Dual-Kern.
**Neue Entscheidung:** Ernte-Spielweise vorziehen, wenn eine Fusion ansteht — Tempo gegen Sicherheit.
**Board:** liest Ernte/Fusions-Fortschritt · Hook onKill|onFusion · Risiko low

### Pollenflug (Slomo/Takt)
**Wirkung:** Jede **Ernte** schenkt der Waffen-Ökonomie einen Bruchteil Slomo-Zeit zurück (nicht Munition) — gut laufende Seuche verlängert die Aussaat-Fenster.
**Warum (im Auto-Modus):** Koppelt den Erfolg der automatischen Seuche an mehr Zeit zum Säen der nächsten Funken — ein positiver Kreislauf über die `SLOMO_TIME`-Ressource, ohne den Schaden zu erhöhen.
**Neue Entscheidung:** Aussaat-Phasen verlängern durch konstantes Ernten statt durch Nachladen.
**Board:** liest Ernte/Slomo · Hook onKill · Risiko low

### Mutationsdruck (Drop)
**Wirkung:** Je länger eine ungebrochene Ansteckungskette läuft (ohne dass sie ausstirbt), desto höher die Drop-Chance auf einen weiteren Zustand-Kern beim nächsten Ernte-Tod.
**Warum (im Auto-Modus):** Belohnt gepflegte, langlebige Seuchenherde (Stammbaum-/Patient-Null-Synergie) mit Pool-Wachstum — Drop folgt der Kettenqualität, nicht dem Zufall allein. Berührt Garantie-Mathematik → vorsichtig tunen.
**Neue Entscheidung:** Ketten hüten für Drops statt schnell durchräumen.
**Board:** liest Ketten-Lebensdauer · Hook onKill · Risiko high

### Seuchenzoll (Fuel/Ban)
**Wirkung:** Jede Ernte zahlt einen kleinen, stetigen Zustand-Fuel-Tropfen; staut sich genug, wird automatisch eine **Ban**-/**Deny**-Aufladung der Schicht-1-Schleife regeneriert. Die laufende Seuche finanziert die Pool-Steuerung.
**Warum (im Auto-Modus):** Verbindet das selbsttragende Ernte-Loop mit der Meta-Ökonomie (Fuel → Finisher **und** Ban/Deny), sodass gutes Seuchen-Management langfristige Auswahl-Macht gibt.
**Neue Entscheidung:** Ernte-Überschuss in Pool-Kontrolle (Ban/Deny) umlenken statt in Sofort-Wucht.
**Board:** schreibt gift · liest Fuel/Ernte · Hook onKill|onFinisherFire · Risiko high

### Brachzeit
**Wirkung:** Bleibt ein Areal längere Zeit infektionsfrei (Seuche dort ausgestorben), regeneriert es „Nährboden": die **erste** neue Infektion dort startet mit Reife-Vorsprung. Verbrauchte Felder müssen ruhen.
**Warum (im Auto-Modus):** Setzt einen Anreiz, die Karte zu **rotieren** statt denselben Fleck zu übersättigen — räumliche Ökonomie, die Position und Tempo koppelt (Anti-Overstay).
**Neue Entscheidung:** Über die Map wandern und „brachliegende" Zonen frisch bespielen.
**Board:** schreibt gift · liest Areal-Ruhezeit · Hook onInfect · Risiko med

---

## Hinweis zur Auswahl

Diese 36 Kerne sind ein **bewusst überfüllter Pool** — pro Zug mehrere Varianten, damit auf Hub-Ebene cherry-gepickt werden kann. Vor Aufnahme in den echten Pool gegen die **≥2-Primäre-Invariante** (Kernzahl × Fusionstabelle × Ban/Deny/Drop) prüfen; besonders die ÖKONOMIE-Kerne (Mutationsdruck, Seuchenzoll) berühren die Garantie-Mathematik. Spannungspaare sind beabsichtigt (z. B. **Erstgeburt/FIFO** vs. **Patient Null/Herkunft**: ältesten ernten vs. Ursprung schützen) — sie erzeugen echte Build-Identität.
