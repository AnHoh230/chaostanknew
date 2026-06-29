# Kern-Katalog — RAUM

> **Raum im Kern-Stadium ist nicht „mehr Feld".** Der Panzer legt im Auto-Takt Felder auf den Boden, sie bleiben liegen, das Munitions-Cap deckelt ihre Zahl, FIFO frisst das älteste. Ein Raum-KERN formt dieses automatisch entstehende Feld-Geflecht: er entscheidet **wo** Felder liegen (Ränder statt Mitte), **wie sie zueinander stehen** (Brücken, Linien, Ketten), **welches Feld geopfert wird**, und **wie das Geflecht auf Gegnerdruck reagiert** — und übersetzt all das in Board-Score & Finisher-Readiness.
>
> Niemand zielt, niemand platziert von Hand. Der Spieler ist Gesetzgeber und Fahrer: er schreibt die Regeln, nach denen die Automation legt, und stellt mit der Panzer-Position & dem Gelände die Bühne, auf die gelegt wird.

**Lese-Konvention für `Board:`** — `schreibt` = welche Board-States/Marker der Kern setzt · `liest` = worauf er reagiert · `Hook` = Engine-Aufhänger · `Risiko` = wie sehr der Kern dich verwundbar/abhängig macht.

Mechanik-Bausteine, auf die sich der Katalog stützt:
- **R** Tick-Schaden + Slow im Feld · **RR** Verlasser werden zur Feldmitte zurückgezogen · **RRR** Kills im Feld geben Ernte-Buff (Feldschaden + Radius)
- **FIFO**: neues Feld verdrängt das älteste · Cap am Munitions-Cap
- **Verhärtung** stärkt bestehende Feld**anker**, erzeugt keine neuen Felder
- **Ults**: Umlagerung (Felder frei verlegen) · Großfeld (300%) · Verseuchung (Feld = ansteckender DoT, kein Fangen)
- Board-Zustand dieser Säule = `feld`

---

## ZUG 1 — Verbot *(die Automation gesetzgeben: was NICHT gelegt wird)*

*Die stärkste Raum-Entscheidung ist oft eine Regel, die Felder zurückhält. Ein Verbot macht das Geflecht vorhersehbar — du weißt, wo nie ein Feld liegt, und kannst genau dort fahren bzw. kämpfen.*

### Bannmeile
**Wirkung:** Verbietet der Automation, Felder im Nahkreis um den Panzer zu legen — Felder entstehen nur ab Mindestabstand. Der Innenraum bleibt feldfrei.
**Warum (im Auto-Modus):** Die Auto-Platzierung klatscht Felder sonst genau dorthin, wo der Panzer steht; das fesselt dich an die Mitte und verschwendet FIFO-Slots auf Boden, den du eh überfährst. Der Bann zieht das Geflecht nach außen, ohne dass du eine Hand rührst.
**Neue Entscheidung:** Du fährst bewusst in deine eigene feldfreie Blase als Rückzugsraum — und musst akzeptieren, dass Gegner dich dort nicht durch Felder gebremst erreichen.
**Board:** schreibt `feld` (mit No-Spawn-Zone um Spieler) · liest Spielerposition · Hook `onFieldPlace` (veto) · Risiko med

### Schweigegebot
**Wirkung:** Solange ein gegnerischer Elite/Boss lebt, legt die Automation keine *neuen* Felder mehr — nur die bestehenden ticken weiter und werden durch Verhärtung verstärkt.
**Warum (im Auto-Modus):** Auto-Feuer würde stur weiterlegen und deine guten, gewachsenen Felder per FIFO wegschieben, ausgerechnet im Boss-Moment. Das Verbot friert das Geflecht im Bestzustand ein.
**Neue Entscheidung:** Vor dem Elite-Spawn baust du dein Feld-Set bewusst fertig auf; danach ist das Layout eingefroren und du kämpfst rein über Positionierung im fixen Geflecht.
**Board:** schreibt `feld` (gefroren) · liest Elite/Boss-Flag · Hook `onFieldPlace` (veto bei elitePresent) · Risiko med

### Sperrgelände
**Wirkung:** Auf bestimmten Geländetypen (Wasser/Abgrund/Straße — je nach Tile) legt die Automation grundsätzlich keine Felder. Felder kleben nur auf „gutem" Boden.
**Warum (im Auto-Modus):** Die Automation legt sonst Felder auch auf Tiles, über die Gegner gar nicht laufen — toter Tick-Schaden. Das Verbot konzentriert das knappe FIFO-Kontingent auf Boden mit Gegnerverkehr.
**Neue Entscheidung:** Du liest die Map-Geometrie und fährst Engstellen aus gutem Boden an, weil du weißt, dass dort *garantiert* gelegt wird — und nirgends sonst.
**Board:** schreibt `feld` (tile-gefiltert) · liest Tile-Typ unter Legepunkt · Hook `onFieldPlace` (veto je Tile) · Risiko low

### Quotenregel
**Wirkung:** Die Automation darf pro Sekunde nur 1 Feld legen, egal wie schnell der Panzer feuert; überschüssige „Lege-Impulse" verfallen. Dafür halten die wenigen Felder länger.
**Warum (im Auto-Modus):** Hohe Auto-Kadenz würde dein Geflecht in Sekunden komplett durchrotieren (FIFO-Sturm), sodass nie ein Feld reift. Die Quote macht jedes Feld langlebig und planbar.
**Neue Entscheidung:** Du gibst Lege-Tempo auf für Stabilität — und entscheidest, ob dein Build davon lebt, dass Felder *bleiben* (gut) oder dass sie *fließen* (dann ist dieser Kern Gift).
**Board:** schreibt `feld` (rate-limited) · liest Lege-Takt · Hook `onFieldPlace` (throttle) · Risiko med

---

## ZUG 2 — Position *(Fahren & Geländegeometrie: wohin der Panzer fährt, formt das Geflecht)*

*Im Auto-Modus ist die Fahrlinie deine einzige direkte Hand am Feld-Layout. Diese Kerne übersetzen Bewegung & Gelände in Feld-Struktur — du „malst" mit dem Fahrweg.*

### Schleppspur
**Wirkung:** Statt Felder am Panzer zu stapeln, legt die Automation sie als Perlenkette entlang deiner zurückgelegten Fahrlinie ab — gleichmäßig verteilt, nicht überlappend.
**Warum (im Auto-Modus):** Auto-Platzierung häuft sonst alles auf einen Fleck, wenn du stehst. Die Schleppspur macht deinen Fahrweg selbst zur Mauer aus Tick-Feldern.
**Neue Entscheidung:** Du fährst Linien und Haken bewusst quer zu Gegnerströmen, weil deine Spur dort zur Barriere wird — Stillstand wird wertlos, Routenführung wird alles.
**Board:** schreibt `feld` (entlang Pfad) · liest Bewegungsvektor/Pfad-Historie · Hook `onMove` + `onFieldPlace` · Risiko low

### Eckenbauer
**Wirkung:** Die Automation snappt jeden Legepunkt an die nächste Geländeecke/Engstelle, statt frei in die Fläche zu legen. Felder setzen sich in Chokes fest.
**Warum (im Auto-Modus):** Ein Feld mitten im offenen Feld umgehen Gegner einfach; an einer Engstelle *müssen* sie hindurch. Der Kern macht aus dummer Auto-Platzierung Choke-Control.
**Neue Entscheidung:** Du steuerst den Panzer in die Nähe von Engstellen, damit die Snap-Logik dort greifen kann — Map-Lesen wird zur Kerndisziplin.
**Board:** schreibt `feld` (an Choke gesnappt) · liest Gelände-Topologie (Chokes) · Hook `onFieldPlace` (reposition) · Risiko low

### Brückenschlag
**Wirkung:** Liegen zwei Felder nah genug beieinander, füllt die Automation den Spalt dazwischen mit einem schmalen Verbindungsfeld auf — aus Inseln wird eine durchgehende Linie.
**Warum (im Auto-Modus):** Auto-gelegte Felder lassen Lücken, durch die Gegner schlüpfen. Brücken schließen die Lücken automatisch, sobald deine Fahrt zwei Felder benachbart legt.
**Neue Entscheidung:** Du fährst so, dass deine Felder in Reichweite zueinander liegen (statt verstreut), um Mauern zu „nähen" — Abstandsgefühl beim Fahren wird zur Mechanik.
**Board:** schreibt `feld` (Brücken-Segmente) · liest Feld-Nachbarschaft · Hook `onFieldPlace` (Lückenfüllung) · Risiko low

### Wallmeister
**Wirkung:** Felder werden nicht rund, sondern als kurze gerade Segmente quer zur deiner Fahrtrichtung gelegt — jedes Feld ist ein Mauerstück. Mehrere ergeben eine Linie.
**Warum (im Auto-Modus):** Runde Auto-Felder decken Fläche, aber sperren keine Achse. Quergelegte Segmente machen aus dem Geflecht eine Verteidigungslinie ohne manuelles Platzieren.
**Neue Entscheidung:** Deine Fahrtrichtung bestimmt die Mauer-Ausrichtung — du fährst parallel zur gewünschten Front, damit die Segmente sich zur Wand reihen.
**Board:** schreibt `feld` (Liniensegment, orientiert) · liest Bewegungsvektor · Hook `onFieldPlace` (Form+Rotation) · Risiko low

### Höhenlinie
**Wirkung:** Die Automation legt Felder bevorzugt auf den Tiles mit dem meisten Gegnerverkehr der letzten Sekunden (eine „Trampelpfad-Heatmap"), statt am Panzer.
**Warum (im Auto-Modus):** Der Panzer weiß nicht, wo Gegner laufen — der Kern gibt der Automation dieses Wissen und legt Felder auf die echten Laufwege.
**Neue Entscheidung:** Du positionierst dich so, dass die Trampelpfade in Reichweite deiner Lege-Logik bleiben — und entscheidest, ob du Gegner zu dir lockst, um die Heatmap zu „füttern".
**Board:** schreibt `feld` (auf Heatmap-Peak) · liest Gegner-Pfad-Dichte · Hook `onFieldPlace` (Zielwahl) · Risiko low

---

## ZUG 3 — Am-Leben-lassen *(Ränder statt Mitte: das Feld als Falle, nicht als Grab)*

*RR zieht Verlasser zur Mitte — die Standard-Automation will Gegner einsperren und schreddern. Diese Kerne kehren das um: sie halten Gegner am Feldrand am Leben, weil ein lebender Gegner am richtigen Ort mehr wert ist als eine schnelle Leiche in der Mitte.*

### Randhüter
**Wirkung:** Tick-Schaden ist am Feld**rand** stark erhöht, in der Mitte stark reduziert. Das Feld tötet außen, hält innen.
**Warum (im Auto-Modus):** Auto-Felder schreddern sonst in der Mitte, wo RR alle hinzieht — Gegner sterben gebündelt, bevor du Wert ziehst. Die Randbetonung macht den Umfang zur Klinge und die Mitte zum Wartezimmer.
**Neue Entscheidung:** Du willst Felder jetzt *groß und überlappend* fahren, damit viel Rand entsteht — Layout-Ziel kippt von „dichte Mitte" zu „maximaler Umfang".
**Board:** schreibt `feld` (Schaden-Gradient) · liest Distanz Gegner↔Feldzentrum · Hook `onFieldTick` · Risiko low

### Drehtür
**Wirkung:** RR (Zurückziehen) wird abgeschaltet; stattdessen dürfen Gegner das Feld frei durchqueren, kassieren aber beim **Verlassen** einen Abschieds-Schlag.
**Warum (im Auto-Modus):** Die Standard-Automation hält Gegner mit RR fest und zwingt dich, sie *im* Feld totzuwarten. Die Drehtür macht das Feld zur Maut-Schranke: Durchlauf erlaubt, Austritt kostet.
**Neue Entscheidung:** Du baust Felder jetzt als Durchgangs-Tore an Engstellen statt als Käfige — und nimmst in Kauf, dass nichts mehr gefangen bleibt.
**Board:** schreibt `feld` (RR aus, Exit-Burst) · liest Feld-Austritt · Hook `onFieldExit` · Risiko med

### Köderzone
**Wirkung:** Das *älteste* Feld (FIFO-Nächstes) hört auf, Schaden zu machen, und wird zur reinen Lockzone: es zieht Gegner an und hält sie, schadet aber nicht.
**Warum (im Auto-Modus):** Auto-RR zieht überall zur Mitte und verzettelt den Pull. Hier wird der Pull auf das Wegwerf-Feld konzentriert — es bündelt Gegner an einem Opferort, kurz bevor es per FIFO verschwindet.
**Neue Entscheidung:** Du timest deinen Finisher/deine großen Felder auf den Moment, in dem die Köderzone voll ist — und entscheidest bewusst, sie verfallen zu lassen.
**Board:** schreibt `feld` (oldest = Köder, kein DMG) · liest FIFO-Reihenfolge · Hook `onFieldRemoved` · Risiko med

### Quarantäne
**Wirkung:** Gegner im Feld werden zwar geslowt, nehmen aber **keinen** Tick-Schaden, solange ein anderer (frischerer) Feld-Slot noch leer ist. Erst wenn das Cap voll ist, „kippt" die Quarantäne und alle Felder werden scharf.
**Warum (im Auto-Modus):** Die Automation tötet sonst sofort und hält das Geflecht klein. Die Quarantäne sammelt Gegner lebend, bis dein volles Feld-Set steht — dann erst der Wirkungstreffer.
**Neue Entscheidung:** Du fährst bewusst auf ein *volles* FIFO-Cap hin, um den Quarantäne-Bruch als Burst auszulösen — Cap-Füllstand wird zur scharf gestellten Waffe.
**Board:** schreibt `feld` (DMG-Gate an Cap) · liest Anzahl belegter Feld-Slots · Hook `onFieldTick` · Risiko high

---

## ZUG 4 — Opfer / FIFO *(das Verdrängen bewusst nutzen: das älteste Feld als Ressource)*

*FIFO ist kein Bug — es ist eine wiederkehrende Detonationsquelle. Jedes neue Feld tötet ein altes; diese Kerne machen den Tod des ältesten Felds zum geplanten Ereignis.*

### Abschiedsknall
**Wirkung:** Wenn FIFO ein Feld verdrängt, explodiert das verschwindende Feld in einer Nova mit Schaden + Knockback an seinem letzten Ort.
**Warum (im Auto-Modus):** Auto-FIFO wirft sonst lautlos Felder weg — verlorener Wert. Der Kern verwandelt jede Auto-Verdrängung in einen kostenlosen Flächentreffer, ganz ohne Zutun.
**Neue Entscheidung:** Du steuerst, *wo* das älteste Feld liegt (durch deine frühere Fahrt), weil genau dort gleich die Nova hochgeht — du „pflanzt" Bomben mit Verzögerungszünder.
**Board:** schreibt `feld`; löst Nova aus · liest FIFO-Verdrängung · Hook `onFieldRemoved` · Risiko low

### Erbschaft
**Wirkung:** Stirbt ein Feld per FIFO, vererbt es seinen aufgebauten RRR-Ernte-Buff an das jüngste lebende Feld, statt ihn verfallen zu lassen.
**Warum (im Auto-Modus):** RRR-Buffs gehen sonst mit dem verdrängten Feld verloren — die Automation sammelt Ernte und schmeißt sie weg. Die Erbschaft macht den Buff persistent über die FIFO-Rotation hinweg.
**Neue Entscheidung:** Du fütterst gezielt *ein* altes Feld mit Kills (Ernte aufladen), um es dann bewusst per neuem Feld zu verdrängen und den Buff nach vorne zu reichen — eine Ernte-Staffel.
**Board:** schreibt `feld` (Buff-Transfer) · liest RRR-Ernte-Stacks + FIFO · Hook `onFieldRemoved` + `onKill` · Risiko med

### Phönixfeld
**Wirkung:** Jedes 5. per FIFO verdrängte Feld wird nicht gelöscht, sondern an der **aktuellen Panzerposition** neu gezündet (recycelt) — mit halber Restdauer.
**Warum (im Auto-Modus):** Auto-FIFO ist reiner Verlust; der Kern macht aus jedem fünften Tod eine Wiedergeburt unter dir, ohne dass du legen musst.
**Neue Entscheidung:** Du achtest auf den FIFO-Zähler und positionierst dich rechtzeitig dort, wo das Phönixfeld erscheinen soll — Timing des Stands statt Timing des Schusses.
**Board:** schreibt `feld` (recycled an Spieler) · liest FIFO-Zähler + Spielerposition · Hook `onFieldRemoved` · Risiko low

### Aschebett
**Wirkung:** An der Stelle eines per FIFO verschwundenen Felds bleibt eine kurzlebige „Asche" liegen: kein Tick-Schaden, aber starker Slow. Das Geflecht hinterlässt Bremsspuren.
**Warum (im Auto-Modus):** Verdrängte Auto-Felder hinterlassen sonst nichts; die Asche verlängert ihre Kontroll-Wirkung über den Tod hinaus, ohne einen Feld-Slot zu kosten.
**Neue Entscheidung:** Deine alte Fahrlinie wird zur Slow-Zone, *nachdem* die Felder rotiert sind — du planst Layouts über zwei Zeitschichten (jetzt Schaden, gleich Bremse).
**Board:** schreibt `feld`; hinterlässt Slow-Marker · liest FIFO-Verdrängung · Hook `onFieldRemoved` · Risiko low

### Opferanode
**Wirkung:** Du kannst (per Regel) das älteste Feld „opfern", bevor FIFO es nimmt: es kollabiert sofort und heilt/refuelt dich anteilig zu seiner Restdauer.
**Warum (im Auto-Modus):** Die Automation lässt Felder einfach auslaufen — Restwert ungenutzt. Die Opferanode wandelt verfallende Felder in Sustain/Fuel, ein ökonomischer Griff in die FIFO-Schlange.
**Neue Entscheidung:** Du entscheidest, ob ein altes Feld noch Schaden machen oder als Treibstoff verbrannt werden soll — Feld-Bestand wird zu einer Reserve, die du anzapfst.
**Board:** schreibt `feld` (manuell-getriggertes Opfer per Regel-Toggle) · liest Feld-Restdauer · Hook `onFieldRemoved` · Risiko med

---

## ZUG 5 — Herkunft / Gedächtnis *(das Geflecht erinnert sich: Felder tragen ihre Geschichte)*

*Ein Feld ist nicht nur eine Fläche — es hat ein Alter, einen Geburtsort, eine Kill-Bilanz. Diese Kerne machen die Vergangenheit des Geflechts mechanisch wirksam.*

### Altersstärke
**Wirkung:** Je länger ein Feld liegt, desto größer sein Radius und Tick-Schaden — bis kurz vor FIFO-Verdrängung, wo es am stärksten ist. Frische Felder sind schwach.
**Warum (im Auto-Modus):** Auto-Felder sind alle gleich; der Kern belohnt Felder, die du *nicht* sofort durch Nachlegen ersetzt. Reifung statt Rotation.
**Neue Entscheidung:** Du drosselst dein eigenes Nachlegen (fährst ruhiger / feuerst Felder seltener), um Felder altern zu lassen — direkter Konflikt mit hoher Kadenz, den du auflösen musst.
**Board:** schreibt `feld` (Alters-Skalierung) · liest Feld-Lebensalter · Hook `onFieldTick` · Risiko med

### Heimatfeld
**Wirkung:** Das **erste** Feld einer Welle wird zum „Anker": es verfällt nie durch FIFO und wirkt als Verstärker für alle anderen Felder in seiner Nähe (Verhärtungs-Logik).
**Warum (im Auto-Modus):** FIFO würde auch dein bestes Feld irgendwann fressen. Der Anker gibt dem Geflecht einen festen Pol, um den die Automation rotieren kann.
**Neue Entscheidung:** Du wählst durch deine *erste* Fahrposition pro Welle bewusst den Ankerort — eine einzige folgenschwere Standortentscheidung am Wellenanfang.
**Board:** schreibt `feld` (Anker, FIFO-immun) · liest Wellen-Start + Feld-Nachbarschaft · Hook `onFieldPlace` (erstes) · Risiko med

### Blutspur
**Wirkung:** Jedes Feld merkt sich, wie viele Kills in ihm passiert sind. Felder mit hoher Kill-Bilanz widerstehen FIFO länger (rutschen in der Schlange nach hinten); „leere" Felder werden zuerst verdrängt.
**Warum (im Auto-Modus):** Reines FIFO wirft auch hochproduktive Felder weg. Die Blutspur macht FIFO leistungsabhängig — die Automation behält, was tötet.
**Neue Entscheidung:** Du lenkst Gegner gezielt in *ein* Feld, um es „unsterblich" zu machen, und lässt unproduktive Felder bewusst verhungern — du züchtest ein Kill-Feld.
**Board:** schreibt `feld` (FIFO-Gewicht) · liest Kills-pro-Feld · Hook `onKill` (im Feld) + `onFieldRemoved` · Risiko med

### Echo der Strecke
**Wirkung:** Felder erscheinen leicht versetzt dort, wo du vor einigen Sekunden warst (verzögerter „Geist" deiner Route) — das Geflecht hinkt deiner Bewegung hinterher.
**Warum (im Auto-Modus):** Auto-Felder kleben am Jetzt-Standort; der Versatz legt Felder hinter dich, dorthin wo Verfolger gerade ankommen.
**Neue Entscheidung:** Du fährst als Köder voraus und legst durch das Echo eine Falle in deinen eigenen Bremsweg — Verfolger laufen in deine Vergangenheit.
**Board:** schreibt `feld` (zeitversetzt an alter Position) · liest Positions-Historie · Hook `onFieldPlace` (delayed) · Risiko med

---

## ZUG 6 — Readiness *(das Geflecht stellt den Finisher scharf: Board-Zustand → Schwelle)*

*Felder existieren nicht für sich — sie laden einen Zustand auf, der einen größeren Schlag freischaltet. Diese Kerne lesen das Feld-Geflecht und übersetzen es in Finisher-Readiness.*

### Belagerungsdruck
**Wirkung:** Jeder Gegner, der sich gerade in einem deiner Felder befindet, lädt eine „Druck"-Anzeige. Voll → der nächste Finisher/große Treffer wird arena-weit ausgelöst.
**Warum (im Auto-Modus):** Die Automation tickt sonst nur lokal; der Kern bündelt verstreutes Feld-Geschehen in eine einzige scharf gestellte Schwelle.
**Neue Entscheidung:** Du fährst Felder so, dass möglichst *viele Gegner gleichzeitig* drinstehen (breites, überlappendes Layout), um die Anzeige schnell zu füllen — Massen-Containment statt Einzeltötung.
**Board:** schreibt `feld`; lädt Finisher-Meter · liest Gegnerzahl-im-Feld · Hook `onFieldTick` + `onFinisherFire` · Risiko low

### Schwellenfeld
**Wirkung:** Sobald **alle** Feld-Slots belegt sind (FIFO-Cap voll) UND mindestens X Gegner gefangen sind, ist der Finisher sofort bereit, unabhängig vom normalen Cooldown.
**Warum (im Auto-Modus):** Auto-Platzierung läuft sonst „leer" weiter; der Kern macht den vollen Geflecht-Zustand selbst zur Zünd-Bedingung.
**Neue Entscheidung:** Du steuerst gezielt auf „Cap voll + Mitte voll" hin und hältst diesen Zustand — eine fragile Spitzen-Konfiguration, die du herstellst und dann abfeuerst.
**Board:** schreibt `feld`; setzt Finisher-Ready-Flag · liest Cap-Füllstand + Gegner-im-Feld · Hook `onFieldPlace` + `onFinisherFire` · Risiko med

### Resonanzgitter
**Wirkung:** Je mehr deiner Felder einander *berühren/überlappen* (verbundenes Geflecht), desto schneller lädt der Finisher. Verstreute Felder laden gar nicht.
**Warum (im Auto-Modus):** Auto-Felder fallen verstreut; der Kern belohnt explizit die **Beziehung** zwischen Feldern, nicht ihre Zahl.
**Neue Entscheidung:** Du fährst kompakt und überlappend statt großflächig zu streuen — Layout-Disziplin (Felder vernetzen) wird zur Readiness-Quelle.
**Board:** schreibt `feld`; lädt Finisher nach Konnektivität · liest Feld-Überlappungsgraph · Hook `onFieldPlace` + `onFinisherFire` · Risiko med

### Stillstandsglut
**Wirkung:** Ein Feld, in dem **lange kein Kill** passiert ist, glüht auf und macht den nächsten Finisher, der es trifft, deutlich stärker (gespeicherter, ungenutzter Schaden).
**Warum (im Auto-Modus):** Die Automation „verschwendet" ruhige Felder; der Kern speichert ihre Untätigkeit als Finisher-Bonus.
**Neue Entscheidung:** Du lässt ein Feld bewusst „kalt" (lockst Gegner weg), um es als Finisher-Verstärker aufzuladen — Geduld an einer Stelle zahlt sich beim Schlag aus.
**Board:** schreibt `feld` (Glut-Stacks) · liest Kill-Pause-im-Feld · Hook `onFinisherFire` + `onKill` · Risiko med

---

## ZUG 7 — Umdeutung *(das Feld ist nicht mehr Schadenszone: Gegnerrouten, Loot, Bewegung)*

*Die radikalsten Raum-Kerne ändern, was ein Feld überhaupt IST. Statt „Boden der Schaden macht" wird es zur Route, zum Magneten, zur beweglichen Masse.*

### Hirtenfeld
**Wirkung:** Felder machen keinen Schaden mehr, sondern stoßen Gegner sanft ab — sie werden zu Leitplanken, die den Schwarm in feldfreie Korridore lenken.
**Warum (im Auto-Modus):** Die Automation will fangen & schreddern; das Hirtenfeld dreht es zu Verkehrslenkung — du kanalisierst Gegner in die Feuerlinie deiner *anderen* Kerne.
**Neue Entscheidung:** Du baust mit Fahrlinien einen Trichter aus abstoßenden Feldern und lässt bewusst eine Lücke (die Tötungsgasse) — reines Geometrie-Denken statt Schaden.
**Board:** schreibt `feld` (Repulsor, kein DMG) · liest Gegner-Bewegungsvektor · Hook `onFieldTick` (Schubkraft) · Risiko high

### Wanderdüne
**Wirkung:** Felder bleiben nicht liegen, sondern driften langsam in Richtung der größten Gegner-Ansammlung — das Geflecht jagt den Schwarm.
**Warum (im Auto-Modus):** Statische Auto-Felder werden umgangen; die driftende Düne reagiert auf Gegnerdruck und sucht die Masse selbst auf.
**Neue Entscheidung:** Du positionierst Felder als „Startaufstellung" und überlässt das Nachführen der Drift — du wählst Startpunkte statt Endpunkte und liest, wohin der Schwarm zieht.
**Board:** schreibt `feld` (driftend) · liest Gegner-Schwerpunkt · Hook `onFieldTick` (Reposition) · Risiko med

### Sammelgrund
**Wirkung:** Felder ziehen keinen Schaden, sondern **Loot/EP/Drops** an und halten sie in der Feldmitte fest, bis du vorbeifährst. Das Geflecht wird zum Lager.
**Warum (im Auto-Modus):** Drops verteilen sich sonst über die ganze Strecke; der Kern nutzt die RR-Pull-Logik, um Beute zu bündeln, statt Gegner.
**Neue Entscheidung:** Du legst Felder entlang deiner geplanten Sammelrunde und entscheidest, ob ein Feld-Slot für Schaden oder für Loot-Bündelung „arbeitet" — Ökonomie gegen Kontrolle.
**Board:** schreibt `feld` (Loot-Pull) · liest Drop-Positionen · Hook `onFieldTick` + `onKill` (Drop-Erzeugung) · Risiko low

### Gezeitenfeld
**Wirkung:** Felder pulsieren rhythmisch zwischen „zieht an" (RR verstärkt) und „stößt ab" — Gegner werden im Takt zur Mitte gesogen und wieder ausgespien.
**Warum (im Auto-Modus):** Konstantes RR sammelt nur; der Wechsel erzeugt ein Auf-und-Ab, das Gegner immer wieder durch den schädlichen Rand schickt.
**Neue Entscheidung:** Du synchronisierst deinen Stand/deine großen Felder mit der Ausstoß-Phase, damit Gegner gerade dann an den Rand kommen, wenn du zuschlägst — Phasen-Lesen statt Reaktion.
**Board:** schreibt `feld` (Pull/Push-Zyklus) · liest Zyklus-Phase · Hook `onFieldTick` · Risiko med

### Niemandsland
**Wirkung:** Gegner *im* Feld können nicht mehr schießen (nur laufen), nehmen aber auch keinen Tick-Schaden. Das Feld entwaffnet, statt zu töten.
**Warum (im Auto-Modus):** Die Automation killt sonst und entfernt Bedrohung durch Tod; Niemandsland entfernt Bedrohung durch Entwaffnung — du wählst, wen du leben lässt.
**Neue Entscheidung:** Du legst Felder als Schutz-Korridore über gefährliche Schützen-Cluster und fährst gefahrlos hindurch — Defensiv-Geometrie statt Offensiv-Schaden.
**Board:** schreibt `feld` (Waffen-Disable, kein DMG) · liest Gegner-im-Feld · Hook `onFieldEnter` + `onFieldExit` · Risiko med

---

## ZUG 8 — Ökonomie / Tempo *(Fuel, Fusion, Ban/Deny, Drop: das Geflecht als Ressourcen-Motor)*

*Felder kosten und produzieren. Diese Kerne verdrahten das Geflecht mit der Lauf-Ökonomie — jedes Feld wird zur Münze in Fuel, Fusion oder Drop.*

### Treibstofffeld
**Wirkung:** Solange du dich in einem **eigenen** Feld aufhältst, regeneriert Fuel langsam; außerhalb nicht. Das Geflecht ist deine Tankstelle.
**Warum (im Auto-Modus):** Die Automation legt Felder ohnehin laufend; der Kern macht das Drinbleiben ökonomisch wertvoll, statt nur den Gegner zu betreffen.
**Neue Entscheidung:** Du musst zwischen „im Feld bleiben für Fuel" (statisch, gefährlich) und „mobil bleiben für Überleben" abwägen — Positionsdisziplin gegen Tankdruck.
**Board:** schreibt `feld` (Fuel-Regen-Zone) · liest Spieler-im-eigenen-Feld · Hook `onFieldEnter` + `onFieldExit` · Risiko med

### Erntepacht
**Wirkung:** Jeder Kill in einem Feld lädt die anstehende **Fusion** schneller reif (zusätzlich zur normalen Kill-Zählung). Feld-Kills sind doppelt wertvoll.
**Warum (im Auto-Modus):** Auto-Kills im Feld zählen sonst nur einfach; der Kern macht das Feld-Geflecht zum Fusions-Beschleuniger.
**Neue Entscheidung:** Du lenkst Gegner gezielt in Felder, bevor sie sterben (statt sie offen zu erlegen), um Fusionen früher zu zünden — Tötungsort wird zur Ökonomie-Entscheidung.
**Board:** schreibt `feld`; lädt Fusion · liest Kills-im-Feld · Hook `onKill` (im Feld) · Risiko low

### Pfändung
**Wirkung:** Ein per FIFO verdrängtes Feld lässt mit kleiner Chance einen Fuel-/Heil-Drop an seinem Ort zurück. Das Geflecht „verkauft" seine Toten.
**Warum (im Auto-Modus):** FIFO-Verdrängungen sind sonst reiner Verlust; der Kern macht den ständigen Auto-Durchsatz an Feldern zu einer Drop-Quelle.
**Neue Entscheidung:** Hohe Lege-Kadenz (viel FIFO-Rotation) wird plötzlich attraktiv — du fährst „verschwenderisch", um die Drop-Mühle am Laufen zu halten; gegenläufig zu reifenden Builds.
**Board:** schreibt `feld`; erzeugt Drop · liest FIFO-Verdrängung · Hook `onFieldRemoved` · Risiko low

### Wegezoll
**Wirkung:** Jedes Feld, durch das ein Gegner läuft (Enter), gibt dir einen winzigen Fuel-Tropfen — unabhängig davon, ob du tötest. Durchgangsverkehr bezahlt dich.
**Warum (im Auto-Modus):** Die Automation verdient sonst nur über Kills; der Wegezoll monetarisiert reines Containment, auch wenn nichts stirbt.
**Neue Entscheidung:** Du baust Felder bewusst auf hochfrequentierte Routen (statt auf Kill-Zonen) und profitierst vom Durchlauf — Choke-Platzierung wird zur Einnahmequelle.
**Board:** schreibt `feld`; Fuel-pro-Enter · liest Feld-Eintritte · Hook `onFieldEnter` · Risiko low

### Verschrottung
**Wirkung:** Du kannst (per Regel-Toggle) das gesamte Geflecht auf einmal „verschrotten": alle Felder kollabieren sofort, jedes als Mini-Nova, und du erhältst gebündelt Fuel + einen kurzen Lege-Tempo-Schub für den Wiederaufbau.
**Warum (im Auto-Modus):** Die Automation rotiert Felder stur weiter; die Verschrottung gibt dir einen bewussten „Reset-Knopf", um ein schlecht gewachsenes Layout in Ressourcen umzuwandeln.
**Neue Entscheidung:** Du entscheidest, wann ein Geflecht „zu schlecht platziert" ist und besser eingeschmolzen als gehalten wird — ein seltener, großer Ökonomie-Schnitt statt Dauerpflege.
**Board:** schreibt `feld` (Massen-Kollaps); löst Multi-Nova aus · liest alle Feld-Slots · Hook `onFieldRemoved` (×n) · Risiko high

---

## Anhang — Distinktheits-Check (worauf jeder Kern seine eigene Entscheidung hängt)

| # | Kern | Kern-Achse (was ihn einzig macht) |
|---|------|-----------------------------------|
| 1 | Bannmeile | Kein Feld am Spieler → feldfreie Blase |
| 2 | Schweigegebot | Lege-Stopp bei Elite → eingefrorenes Layout |
| 3 | Sperrgelände | Tile-Filter → Felder nur auf gutem Boden |
| 4 | Quotenregel | Rate-Limit → wenige langlebige Felder |
| 5 | Schleppspur | Felder entlang Fahrlinie |
| 6 | Eckenbauer | Snap an Chokes |
| 7 | Brückenschlag | Lückenfüllung zwischen Feldern |
| 8 | Wallmeister | Felder als orientierte Mauersegmente |
| 9 | Höhenlinie | Lege auf Trampelpfad-Heatmap |
| 10 | Randhüter | Schaden außen, Halten innen |
| 11 | Drehtür | RR aus, Strafe beim Austritt |
| 12 | Köderzone | Ältestes Feld = Lock ohne Schaden |
| 13 | Quarantäne | Schaden erst bei vollem Cap |
| 14 | Abschiedsknall | FIFO-Tod = Nova |
| 15 | Erbschaft | RRR-Buff-Transfer über FIFO |
| 16 | Phönixfeld | Jedes 5. Feld recycelt am Spieler |
| 17 | Aschebett | Slow-Spur nach FIFO-Tod |
| 18 | Opferanode | Altes Feld → Fuel/Heal opfern |
| 19 | Altersstärke | Reifung statt Rotation |
| 20 | Heimatfeld | Erstes Feld = FIFO-immuner Anker |
| 21 | Blutspur | Kill-Bilanz = FIFO-Gewicht |
| 22 | Echo der Strecke | Zeitversetzte Felder hinter dir |
| 23 | Belagerungsdruck | Gegner-im-Feld → Finisher-Meter |
| 24 | Schwellenfeld | Cap voll + Mitte voll → Finisher ready |
| 25 | Resonanzgitter | Feld-Konnektivität → Finisher-Speed |
| 26 | Stillstandsglut | Kill-Pause → Finisher-Verstärker |
| 27 | Hirtenfeld | Repulsor-Leitplanken statt Schaden |
| 28 | Wanderdüne | Felder driften zum Schwarm |
| 29 | Sammelgrund | Felder bündeln Loot statt Gegner |
| 30 | Gezeitenfeld | Pull/Push-Rhythmus durch den Rand |
| 31 | Niemandsland | Entwaffnen statt töten |
| 32 | Treibstofffeld | Im-Feld-Bleiben = Fuel-Regen |
| 33 | Erntepacht | Feld-Kills laden Fusion |
| 34 | Pfändung | FIFO-Tod = Drop |
| 35 | Wegezoll | Durchgang = Fuel |
| 36 | Verschrottung | Geflecht-Reset → Ressourcen-Burst |

**Gesamt: 36 distinkte Raum-Kerne** über 8 Design-Züge. Kein Kern ist ein reiner Zahlenbuff — jeder ändert FIFO-Logik, Feld-Ränder, Feld-Beziehungen, Feld-Bewegung, Gegnerrouten oder die Ökonomie-Verdrahtung und erzwingt eine neue Positions-, Regel-, Opfer- oder Ökonomie-Entscheidung. Kein Kern verlangt manuelles Zielen, Platzieren-als-Geschick oder Dodge-Timing.
