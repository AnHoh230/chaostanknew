# Kern-Katalog — Hybrid- & Meta-Kerne

> Der Panzer feuert von selbst — schnell, perfekt zielend. Kerne entscheiden nicht *ob getroffen* wird, sondern **was das Brett darf**: welche Zustände gekoppelt sind, wie die Geometrie liegt, wann ein Finisher reif ist und wohin die Ökonomie fließt.
> Hybrid-Kerne (Abschnitt 1) verschränken **zwei** Board-Zustände zu gemeinsamem BoardScore und Finisher-Readiness. Meta-Kerne (Abschnitt 2) greifen ins **System** — Finisher-Gefäß, Tempo, Ökonomie, Verhärtung.

**Board-Vokabular:** `mark` (Befehl/Designation) · `feld` (Raum/Zone) · `gift` (Zustand/Infektion) · `fuel` (Ökonomie) · `readiness` (Finisher-Reife) · `boardScore` (Summe passender Zustände auf Gegnern).
**Risiko** = wie sehr der Kern den Auto-Modus *einengt* (high = starke Gesetzgebung, kann sich verklemmen).

---

# Abschnitt 1 — Hybrid-Kerne

## Befehl + Raum — Architekt / Belagerung
*mark trifft feld: markierte Ziele und Feldgeometrie zahlen in denselben BoardScore. Du befiehlst Punkte, der Raum hält sie fest.*

### Rasterschluss
**Wirkung:** Markierte Gegner, die in einem deiner Felder stehen, werden „verschraubt" — solange sie das Feld nicht verlassen, zählt ihre Marke doppelt im BoardScore. Verlässt einer das Feld, fällt nur seine Marke auf normal zurück.
**Warum (im Auto-Modus):** Die Automation zielt ohnehin perfekt; entscheidend ist, ob Marke und Feld *deckungsgleich* liegen. Dieser Kern belohnt Überlappung, nicht Treffsicherheit.
**Neue Entscheidung:** Legst du Felder dort, wo deine Auto-Markierung sowieso hinläuft (sichere Stapelung), oder weiter vorn, um Nachrücker einzufangen (mehr Score, mehr Leerlauf)?
**Board:** liest `mark`+`feld`, schreibt `boardScore` · Hook `onFinisherReady` · Risiko med

### Bastions-Dekret
**Wirkung:** Das *kleinste* deiner aktiven Felder wird zur Bastion: Marken darin verfallen nicht und ein Finisher, der von hier zündet, behält das Feld als Gefäß zurück.
**Warum (im Auto-Modus):** Auto-Markierung streut über die ganze Front; dieser Kern macht eine einzige, enge Zone zum Anker, statt überall ein bisschen Druck zu haben.
**Neue Entscheidung:** Hältst du die Bastion klein (verfallsfreie Marken, aber wenig Volumen) oder lässt du sie durch andere Kerne wachsen und verlierst die Verfallsfreiheit?
**Board:** liest `feld`, schreibt `mark`(Verfallsstopp)+`readiness` · Hook `onFinisherFire` · Risiko med

### Brückenkopf
**Wirkung:** Zieht eine markierte Einheit beim nächsten Auto-Treffer in das nächstgelegene eigene Feld hinein (kleiner Pull). Funktioniert nur, wenn Marke und Feld beide existieren.
**Warum (im Auto-Modus):** Du korrigierst keine Schüsse — du korrigierst *Positionen*. Der Kern bringt verstreute Markierte in die Geometrie, die der BoardScore liest.
**Neue Entscheidung:** Markier-lastig bauen (viele Pulls, kleine Felder) oder feld-lastig (große Felder als Auffangbecken, sparsame Marken)?
**Board:** liest `mark`+`feld`, schreibt Position · Hook `onFinisherReady` · Risiko low

### Belagerungsplan
**Wirkung:** Je länger ein Feld steht, desto mehr Auto-Marken bekommt es pro Zyklus zugeteilt — bis zu einem Deckel. Frisch gelegte Felder markieren langsam, alte Felder fluten.
**Warum (im Auto-Modus):** Belohnt das *Stehenlassen* von Geometrie statt ständiges Neulegen. Die Automation markiert; der Kern entscheidet, wo das Markier-Budget hinfließt.
**Neue Entscheidung:** Wenige langlebige Belagerungsfelder (Reife) oder mobile Wegwerf-Felder für neue Routen (Flexibilität)?
**Board:** liest `feld`(Alter), schreibt `mark` · Hook `onFinisherReady` · Risiko med

---

## Raum + Zustand — Alchemist / Verseuchtes Terrain
*feld trifft gift: Zonen werden zu Brutkammern, Boden trägt den Zustand. Du vergiftest nicht Ziele, du vergiftest Orte.*

### Brutkammer
**Wirkung:** Gegner in einem deiner Felder akkumulieren `gift` schneller; ein Feld, das genug vergiftete Insassen gesehen hat, „reift" und verstärkt seinen eigenen Gift-Aufbau dauerhaft.
**Warum (im Auto-Modus):** Auto-Feuer setzt den Zustand sowieso; der Kern macht *Aufenthaltsdauer im Feld* zur eigentlichen Schraube — eine Standort-Entscheidung, kein Ziel-Skill.
**Neue Entscheidung:** Enghalsige Felder an Choke-Points (hohe Durchsatz-Reifung) oder breite Felder im offenen Raum (mehr Insassen, langsamere Reife)?
**Board:** liest `feld`, schreibt `gift`+`feld`(Reifegrad) · Hook `onFinisherReady` · Risiko med

### Seuchenboden
**Wirkung:** Wenn ein vergifteter Gegner stirbt, bleibt an seiner Stelle eine kleine Gift-Pfütze als Mini-Feld zurück, die nachrückende Gegner ansteckt.
**Warum (im Auto-Modus):** Die Automation erzeugt die Kills; dieser Kern verwandelt jeden Tod in *bleibende Geländekontrolle*, ohne dass du eine Pfütze „setzen" musst.
**Neue Entscheidung:** Kämpfst du an einer Linie und lässt den Boden verseuchen (Defensiv-Teppich), oder bewegst du dich und lässt eine Giftspur hinter dir?
**Board:** liest `gift`, schreibt `feld`(Pfütze)+`gift` · Hook `onFinisherFire` · Risiko low

### Miasma-Druck
**Wirkung:** Überlappen sich zwei deiner Felder, verschmilzt die Überlappungszone zu konzentriertem Miasma mit doppeltem Gift-Tick und eigenem BoardScore-Beitrag.
**Warum (im Auto-Modus):** Reine Geometrie-Entscheidung. Du steuerst nicht den Schuss, sondern ob deine Zonen sich *küssen* — Überlappung wird zur Ressource.
**Neue Entscheidung:** Felder gezielt stapeln (kleine, brutale Kernzone) oder spreizen (Flächendeckung ohne Spitze)?
**Board:** liest `feld`+`gift`, schreibt `feld`(Überlappung)+`boardScore` · Hook `onFinisherReady` · Risiko med

### Gärungsherd
**Wirkung:** Ein Feld wandelt überschüssigen `gift` seiner Insassen in `fuel` um, sobald die Gift-Stacks einen Schwellenwert überschreiten — die Zone „erntet" ihren eigenen Verfall.
**Warum (im Auto-Modus):** Verkoppelt Zustands-Ökonomie mit Raum: Auto-Feuer überlädt Gegner mit Gift, der Kern recycelt den Überschuss in Tempo statt ihn zu verschwenden.
**Neue Entscheidung:** Felder als Schadensquelle nutzen oder bewusst als Fuel-Farmen überladen (langsamer Kill, mehr Ökonomie)?
**Board:** liest `feld`+`gift`, schreibt `fuel` · Hook `onFuelOverflow` · Risiko med

---

## Befehl + Zustand — Richter / Urteil
*mark trifft gift: Markierung beobachtet, der Zustand vollstreckt. Du führst Akte, die Ansteckung gehorcht der Marke.*

### Aktenzeichen
**Wirkung:** Jede Marke führt eine „Akte" über die Gift-Stacks ihres Trägers. Erreicht die Akte einen Schwellenwert, wird die Marke zur Urteils-Marke und zählt im BoardScore dreifach.
**Warum (im Auto-Modus):** Die Automation markiert und vergiftet parallel; der Kern misst, *welche* Markierten genug Zustand gesammelt haben — eine Lese-Mechanik, kein Eingriff ins Zielen.
**Neue Entscheidung:** Schnell viele Marken setzen (breite Aktenlage) oder wenige Ziele lange beobachten lassen (tiefe Akten, höhere Urteile)?
**Board:** liest `mark`+`gift`, schreibt `mark`(Urteil)+`boardScore` · Hook `onFinisherReady` · Risiko med

### Gelenkte Ansteckung
**Wirkung:** Gift springt von einem sterbenden Gegner bevorzugt auf *markierte* Nachbarn über, statt zufällig. Ohne Marke in Reichweite versickert es normal.
**Warum (im Auto-Modus):** Du diktierst die *Richtung* der Seuche per Markier-Regel. Die Automation infiziert und tötet — der Kern lenkt nur den Sprung.
**Neue Entscheidung:** Markierst du Frontziele (Seuche rollt nach vorn) oder Hinterland (Ansteckung greift tief in die Welle)?
**Board:** liest `mark`+`gift`, schreibt `gift` · Hook `onFinisherFire` · Risiko low

### Vollstreckungsbefehl
**Wirkung:** Eine Marke auf einem Gegner mit maximalen Gift-Stacks verwandelt dessen restlichen Verfall sofort in einen einzigen harten Tick (Reife-Einlösung) und macht die Readiness frei.
**Warum (im Auto-Modus):** Der Kern entscheidet *wann* gesammelter Zustand kassiert wird — über die Markier-Regel, nicht über Timing-Klicks. Auto-Feuer baut, Marke löst ein.
**Neue Entscheidung:** Gift erst voll aufstapeln lassen (späte, große Einlösung) oder früh markieren für schnelleren Durchsatz?
**Board:** liest `mark`+`gift`, schreibt `readiness` · Hook `onFinisherReady` · Risiko med

### Kronzeuge
**Wirkung:** Stirbt ein markierter, vergifteter Gegner, „sagt er aus": alle anderen markierten Ziele erben einen Teil seiner Gift-Stacks. Belohnt es, Marke und Gift gebündelt zu halten.
**Warum (im Auto-Modus):** Verteilung von Zustand über die Markier-Liste — eine Buchhaltungs-Regel. Die Automation liefert Kills; der Kern macht jeden Kronzeugen-Tod zum Verstärker des Rests.
**Neue Entscheidung:** Konzentrierst du Marken auf wenige tief vergiftete Ziele (starke Aussagen) oder breit (mehr Erben, dünnere Stacks)?
**Board:** liest `mark`+`gift`, schreibt `gift` · Hook `onFinisherFire` · Risiko med

---

# Abschnitt 2 — Meta- / Finisher- / Ökonomie-Kerne

## Finisher-Gefäß — was nach der Zündung bleibt
*Der Finisher feuert automatisch bei Readiness. Diese Kerne bestimmen, welchen Board-Zustand er als Rückstand hinterlässt — austauschbar nach Build.*

### Stempelschlag (Gefäß: Marken)
**Wirkung:** Nach jeder Finisher-Zündung werden alle Überlebenden im Wirkbereich automatisch frisch markiert. Das Brett ist sofort wieder „beschriftet".
**Warum (im Auto-Modus):** Verhindert den Leerlauf nach dem Finisher: statt bei null Marken neu aufzubauen, startet der nächste Zyklus mit voller Markier-Lage.
**Neue Entscheidung:** Lohnt der Marken-Rückstand für deinen Build (B-lastig) oder willst du das Gefäß tauschen, weil du auf Feld/Gift skalierst?
**Board:** liest `readiness`, schreibt `mark` · Hook `onFinisherFire` · Risiko low

### Kraterrecht (Gefäß: Feld)
**Wirkung:** Der Finisher hinterlässt an seinem Epizentrum ein frisches, kurzlebiges Feld. Die Zündung *baut Geometrie*, statt sie zu verbrauchen.
**Warum (im Auto-Modus):** Architekt-Builds verlieren beim Zünden ihre Felder; dieser Rückstand füttert die nächste BoardScore-Welle sofort mit Raum.
**Neue Entscheidung:** Finisher als Feld-Generator nutzen (R-Build) — oder Gefäß tauschen, wenn dein Score von Marken/Gift kommt?
**Board:** liest `readiness`, schreibt `feld` · Hook `onFinisherFire` · Risiko low

### Restseuche (Gefäß: Infektion)
**Wirkung:** Nach der Zündung tragen alle Überlebenden im Bereich Anfangs-Gift-Stacks. Der Finisher *infiziert*, statt nur zu detonieren.
**Warum (im Auto-Modus):** Alchemist-/Richter-Builds müssten sonst jeden Gegner neu hochstapeln; der Rückstand hält das Brett dauerhaft im Gift-Zustand.
**Neue Entscheidung:** Infektions-Rückstand passt zu Z-lastigem Score — oder tauschst du das Gefäß, weil du Marken/Feld als BoardScore-Quelle fährst?
**Board:** liest `readiness`, schreibt `gift` · Hook `onFinisherFire` · Risiko low

### Stiltreue Zündung
**Wirkung:** Der Finisher feuert im Stil deines dominanten Pols: Anker-Zündung (R, am stärksten Feld), Reife-Zündung (Z, am höchsten Gift-Ziel) oder Befehls-Zündung (B, am wertvollsten Markierten). Wechselt automatisch mit deinem Build-Schwerpunkt.
**Warum (im Auto-Modus):** Macht den Finisher build-treu, ohne dass du ein Gefäß manuell wählst — das System liest deinen Schwerpunkt und richtet die Zündung danach aus.
**Neue Entscheidung:** Bewusst einpolig bauen für eine reine Zündung — oder hybrid bleiben und die wechselnde Zündung als Flexibilität nehmen?
**Board:** liest `boardScore`(Pol-Verteilung)+`readiness`, schreibt je nach Pol · Hook `onFinisherFire` · Risiko med

---

## Readiness-Pflege — Reife konservieren & diagnostizieren
*Diese Kerne verwalten den Zustand *kurz vor* der Zündung — und melden, wenn der Abzug leer ist.*

### Schwelbrand
**Wirkung:** Der für die Readiness relevante Board-Zustand (mark/feld/gift, je nach Build) verfällt langsamer, je näher der BoardScore an der Zündschwelle liegt. Direkt unter der Schwelle steht die Zeit fast still.
**Warum (im Auto-Modus):** Verhindert, dass eine fast-reife Zündung kurz vor Schluss zerfällt, nur weil die Automation gerade ihr Ziel wechselt — Reife wird nicht verschenkt.
**Neue Entscheidung:** Riskanter knapp-unter-Schwelle „parken" für gestapelte Zündungen — oder sicher sofort auslösen lassen?
**Board:** liest `readiness`+`boardScore`, schreibt Verfallsrate von `mark`|`feld`|`gift` · Hook `onFinisherReady` · Risiko med

### Pulverkammer
**Wirkung:** Überschüssiger BoardScore über der Zündschwelle verfällt nicht, sondern wird als zweite, aufgeladene Zündung gespeichert (max. 1 Rücklage). Die nächste Readiness feuert dann doppelt.
**Warum (im Auto-Modus):** Bei dichten Wellen produziert die Automation mehr Score, als eine Zündung verbraucht; der Kern bunkert den Überschuss statt ihn zu kappen.
**Neue Entscheidung:** Auf Burst-Wellen warten, um die Doppelzündung zu laden — oder gleichmäßig durchzünden und nie bunkern?
**Board:** liest `boardScore`+`readiness`, schreibt `readiness`(Rücklage) · Hook `onFinisherReady` · Risiko high

### Leerer Abzug
**Wirkung:** Feuert ein Finisher mit (fast) leerem BoardScore — also ohne passende Zustände auf Gegnern —, meldet der Kern „Leerer Abzug", unterdrückt die Verschwendungs-Zündung und hält die Readiness, bis das Brett wieder beschrieben ist.
**Warum (im Auto-Modus):** Diagnose-Kern: die Automation würde sonst stur ins Leere zünden. Er macht sichtbar, dass dein Build keinen Zustand aufs Brett bringt, und spart die Ladung.
**Neue Entscheidung:** Die Warnung als Signal nehmen, einen Zustands-Kern nachzurüsten — oder den Halt abschalten, wenn du bewusst auf Leerzündungen als Notnagel setzt?
**Board:** liest `boardScore`+`readiness`, schreibt `readiness`(Halt) · Hook `onFinisherFire` · Risiko med

---

## Ökonomie & Tempo — Fuel, Drop, Reife
*Greift in die Wirtschaft hinter den Kernen ein: Treibstoff, Kern-Drops, Level- und Fusionsgeschwindigkeit.*

### Raffinerie
**Wirkung:** Eingesammeltes `fuel` wird veredelt: über einem Vorrats-Schwellenwert zählt jede weitere Einheit doppelt, darunter normal. Volltanken wird wertvoller als ständiges Anstückeln.
**Warum (im Auto-Modus):** Lenkt deine Fuel-Politik, ohne ins Kampfgeschehen zu greifen — eine reine Vorrats-Entscheidung über dem Auto-Feuer.
**Neue Entscheidung:** Vorrat hochhalten für den Veredelungs-Bonus (Polster, aber gebundenes Fuel) oder aggressiv ausgeben (Tempo, kein Bonus)?
**Board:** liest `fuel`, schreibt `fuel`(Veredelung) · Hook `onFuelOverflow` · Risiko low

### Überlauf-Ventil
**Wirkung:** Statt verschwendet zu werden, wandelt sich Fuel über dem Maximum automatisch in einen sofortigen BoardScore-Schub auf bereits vorhandene Zustände um.
**Warum (im Auto-Modus):** Macht aus verschenktem Überlauf Brett-Druck. Die Automation tankt; der Kern sorgt, dass nichts oben rausläuft, ohne Wirkung zu hinterlassen.
**Neue Entscheidung:** Fuel-Cap niedrig fahren und bewusst überlaufen lassen (Dauer-Schübe) — oder Cap voll nutzen für große Einzelausgaben?
**Board:** liest `fuel`, schreibt `boardScore` · Hook `onFuelOverflow` · Risiko med

### Beuterecht
**Wirkung:** Kills auf Gegnern, die *mehrere* Board-Zustände gleichzeitig tragen (z. B. mark+gift), erhöhen die Kern-Drop-Chance der nächsten Welle. Sauberes Brett zahlt sich in Auswahl aus.
**Warum (im Auto-Modus):** Belohnt Hybrid-Druck strukturell: nicht mehr Schaden, sondern bessere Kern-Versorgung als Folge von gekoppelten Zuständen.
**Neue Entscheidung:** Auf Mehrfach-Zustände hin bauen, um Drops zu farmen (langsamer, reicher) — oder schnell killen mit Einzelzustand (ärmere Auswahl)?
**Board:** liest `mark`+`feld`+`gift`(Überlapp), schreibt Drop-Rate · Hook `onFinisherFire` · Risiko med

### Magnetstollen
**Wirkung:** Kern-Drops werden zum dominanten Pol deines Builds hin gelenkt: Wenn du R-lastig bist, droppen bevorzugt raum-affine Kerne usw. Reduziert Fehl-Drops, verstärkt aber Monokultur.
**Warum (im Auto-Modus):** Eine Versorgungs-Regel, keine Kampf-Mechanik — sie formt, *welche* Kerne du überhaupt zu sehen bekommst.
**Neue Entscheidung:** Pol vertiefen (verlässliche Synergie, Klumpenrisiko) — oder den Kern weglassen, um breiter zu sammeln und Hybride zu ermöglichen?
**Board:** liest `boardScore`(Pol-Verteilung), schreibt Drop-Lenkung · Hook `onFinisherReady` · Risiko high

### Schleifstein
**Wirkung:** Kerne im Slot, deren zugehöriger Board-Zustand *gerade aktiv auf dem Brett liegt*, leveln schneller. Wer seinen Zustand spielt, reift seine Kerne.
**Warum (im Auto-Modus):** Verkoppelt Level-Tempo mit Brett-Pflege statt mit roher Kill-Zahl — du beschleunigst, indem du Zustände konsequent hältst.
**Neue Entscheidung:** Schmal auf einen Zustand fokussieren (schnelle Reife dieser Kerne) — oder breit spielen und langsamer leveln?
**Board:** liest `mark`|`feld`|`gift`(aktiv), schreibt Kern-XP · Hook `onFinisherFire` · Risiko low

### Brennofen
**Wirkung:** Wenn zwei fusionsreife Pol-Partner gleichzeitig im Slot liegen, beschleunigt der Kern ihre verbleibende Reife bis zur Fusion deutlich — verbraucht dafür beim Auslösen einen Teil deines Fuel-Vorrats.
**Warum (im Auto-Modus):** Steuert das *Tempo* zum Dual-Kern, eine Bau- und Ökonomie-Entscheidung, völlig losgelöst vom Zielen.
**Neue Entscheidung:** Fuel für schnellere Fusion verbrennen (früher Dual-Kern, freier Slot) — oder Fuel sparen und die Fusion natürlich reifen lassen?
**Board:** liest Fusions-Reife+`fuel`, schreibt Reife-Tempo · Hook `onFuelOverflow` · Risiko med

### Banngewölbe
**Wirkung:** Sammelt bei jeder Finisher-Zündung eine Ban-/Deny-Ladung an. Volle Ladung erlaubt es, beim nächsten Kern-Angebot eine unerwünschte Option auszuschließen, sodass eine bessere nachrückt.
**Warum (im Auto-Modus):** Reine Draft-Ökonomie: die Automation liefert Zündungen, der Kern wandelt sie in Auswahl-Kontrolle um.
**Neue Entscheidung:** Ladungen für gezielte Bans horten (Kuratierung) — oder ignorieren und die Slots dem Zufall überlassen?
**Board:** liest `readiness`, schreibt Ban-Ladung · Hook `onFinisherFire` · Risiko low

---

## Verhärtung & Haut — Automation nach dem Erstarren
*Verhärtete Finisher feuern automatisch. Diese Kerne regeln, wie sich die Automation *nach* der Verhärtung verhält.*

### Mastery-Korsett
**Wirkung:** Nach der Verhärtung beschränkt sich die Automation auf Aktionen, die deinem gemeisterten Pol-Paar entsprechen (Architekt/Alchemist/Richter). Pol-fremde Auto-Aktionen werden unterdrückt.
**Warum (im Auto-Modus):** Schärft die verhärtete Automation auf deinen Grundtyp — sie verzettelt sich nicht mehr mit Zuständen, die dein Build gar nicht liest.
**Neue Entscheidung:** Verhärtung früh anstreben für ein sauberes, fokussiertes Korsett — oder hybrid/flexibel bleiben und auf die Einengung verzichten?
**Board:** liest Mastery-Paar, schreibt erlaubte Auto-Aktionen · Hook `onHardened` · Risiko high

### Nachhall
**Wirkung:** Nach der Verhärtung wiederholt die Automation in Leerlauf-Momenten die *Absicht* der letzten bedeutsamen Aktion (zuletzt gesetztes Feld / letzte Markier-Welle / letzter Gift-Stoß), statt stumpf das nächstbeste Ziel zu nehmen.
**Warum (im Auto-Modus):** Gibt der verhärteten Automation ein Gedächtnis für deinen Plan — sie führt deine letzte Geste weiter, anstatt blind zu reagieren.
**Neue Entscheidung:** Bewusst eine starke „Leit-Aktion" setzen, die der Nachhall wiederholt — oder reaktiv spielen und den Echo-Effekt kaum nutzen?
**Board:** liest letzte Aktion (`mark`|`feld`|`gift`), schreibt wiederholte Absicht · Hook `onHardened` · Risiko med

### Systembruch-Siegel
**Wirkung:** Sind alle drei Pol-Paare gemeistert, schaltet die Verhärtung in die Systemform: die Automation darf gekoppelte Drei-Zustands-Aktionen ausführen (mark+feld+gift zugleich), die einzelne Grundtypen nicht erreichen.
**Warum (im Auto-Modus):** Die finale Gesetzgebung — sie hebt die Pol-Beschränkung auf und lässt die Automation das volle Brett gleichzeitig bedienen.
**Neue Entscheidung:** Alle drei Paare hochziehen für die Systemform (lange Investition, höchste Decke) — oder bei einem spezialisierten Grundtyp bleiben (früher stark, niedrigere Decke)?
**Board:** liest alle drei Mastery-Paare, schreibt Drei-Zustands-Auto-Aktionen · Hook `onHardened` · Risiko high
