# Kommando-Build — Mechanik & Skillbaum-Vorlage (für GPT)

**Zweck dieser Datei:** GPT soll aus (A) dem bestehenden Garten-Skillbaum als Strukturvorlage und (B) der vollständigen Kommando-Build-Mechanik einen **Talentbaum für den Kommando-Build** ableiten. Die drei Ults stehen schon fest (Teil C) — gesucht sind die **passiven Talente darunter**.

Spiel: ChaosTankNew, ein 3D-Panzer-Arena-Survival (Babylon.js). Drei Kompass-Pole = drei Builds: **Befehl** (Kommandant/Sniper), **Raum** (AoE), **Zustand** (Gift/DoT, „Garten"). Dieser Text behandelt den **Befehl/Kommando-Build**.

---

## TEIL A — Referenz: bestehender Garten-Skillbaum (Struktur-Vorlage)

So ist der Garten-Baum aufgebaut — **dieselbe Struktur** soll der Kommando-Baum bekommen.

### Modell
- Man schaltet den Baum frei, sobald der Build seine 3. Stufe erreicht. Danach werden weitere Fortschritts-Impulse zu **Skillpunkten** (1 Punkt je `PUNKT_KOSTEN = 50` Impuls).
- **Erster Punkt:** man wählt **eine von 3 Pol-Ults** (aktivierte Fähigkeit auf Taste Q: `dauer` s aktiv, dann `cd` s Cooldown).
- **Danach:** flache **Wert-Talente**, je `TALENT_MAX = 3` Ränge, 1 Punkt pro Rang. Talente sind reine Zahlen-Verbesserungen der Build-Mechanik.

### Die 3 Garten-Ults (je Pol einer)
| Pol | Name | Dauer/CD | Effekt |
|---|---|---|---|
| Zustand | Nährboden | 6 / 12 | Aktiv: jede Ernte heilt dich (`HEAL_PRO_ERNTE = 4` HP). |
| Befehl | Gnadenstoß | 5 / 12 | Aktiv: Angesteckte unter `EXECUTE_FRAC = 25 %` HP sterben sofort. |
| Raum | Ausbruch | 5 / 14 | Aktiv: jede Ernte steckt den Umkreis an (`AUSBRUCH_RADIUS = 60`, `+AUSBRUCH_FIEBER = 2` Erntefieber). |

### Die 5 Garten-Talente (je 3 Ränge)
| Talent | Effekt | Wert pro Rang |
|---|---|---|
| Saatstärke | +Start-Potenz pro Infektion | `+2` Saat |
| Reifedruck | Gift reift schneller (Schwelle ↓) | `−4` erntePot |
| Köchelschaden | +Schaden des unreifen Gifts | `+2` tickDmg |
| Drosselung | Gegner stärker verlangsamt | `+0.12` Slow |
| Reifschaden | +tödlicher Schaden des reifen Gifts | `+3` reifDmg |

**Merkmal:** Jedes Talent dreht **genau eine Drehschraube** der Build-Mechanik hoch. Das ist das Muster, das der Kommando-Baum nachbilden soll.

---

## TEIL B — Kommando-Build: vollständige Mechanik

### Grundidee
Der Kommandant ist der **Präzisions-/Reihenfolge-Pol**. Statt Fläche oder Seuche: man **markiert** Ziele und **exekutiert sie in Reihenfolge**. Sauberes, diszipliniertes Spiel baut einen **grenzenlosen Schadens-Aufbau** auf — Fehler brechen ihn ab. „Number go up" durch Können.

### Steuerung & Grundwaffe
- **Rechtsklick (gehalten) = Scope**: Zielmodus + Zeitlupe (Slomo). Beim Kommando-Build **fährt** man im Scope weiter (man steht nicht).
- **Linksklick = Schießen / Markieren** (je nach Modus).
- **Panzer-Grundwerte:** Tempo `12`, HP `160`, Grundschaden `damage = 36` (fix, kein Loot-Wachstum).
- **Schuss-Schaden:** `damage(36) × sniperDmgMul(2) = 72` Grundschuss; auf markierte Ziele zusätzlich `× MARK_VERWUNDBAR(1.6) = 115`, **plus** Aufbau-Bonus (s.u.).
- **Munition:** `AMMO_MAX = 3`. **Markieren kostet 1 Munition**, ein erfolgreich exekutiertes Ziel **gibt die Munition zurück**. Leer → **R** nachladen (`RELOAD_TIME = 2.2 s`, Tempo-Schub `× 1.7` währenddessen). Nachladen verwirft die aktuellen Markierungen.
- **Feuertakt:** `BEFEHL_FIRE_BASE = 0.14 s` zwischen Schüssen.
- **Slomo-Budget:** `SLOMO_TIME = 3 s`, Welt läuft im Scope auf `× SLOMO_SCALE(0.2)`. Außerhalb des Scopes füllt sich das Budget mit `× SLOMO_REGEN(0.5)` wieder auf.
- **Sniper-Reichweite:** `sniperRange = 95`.

### Die drei Build-Stufen (schalten über den Kompass frei)
| Stufe | Name | Was sie kann |
|---|---|---|
| St 0 | Grundschuss | direkter Treffer aufs Cursor-Ziel, noch kein Markieren |
| **B** (St 1) | Markieren | im Scope markieren → Ziel wird **verwundbar** (`× 1.6` Schaden) + **langsam** (`MARK_SLOW = 0.45` Tempo-Multiplikator, `MARK_BUFF_DUR = 30 s`). Munitionsfrei exekutieren. **Keine** Reihenfolge, kein Counter — reiner Debuff. |
| **BB** (St 2) | Aufbau | **Reihenfolge** zählt + **Schadens-Aufbau** beginnt (s.u.). Kaskaden-Tempo, Auto-Markierer, Ketten-Timer. |
| **BBB** (St 3) | Grenzenlos | Aufbau **ohne Deckel** + **permanenter** Schadens-Sockel. |

### Markieren & Reihenfolge (ab BB)
- Man markiert bis zu `MAX_MARKS = 3` Ziele. Jede Marke bekommt eine **Order** (1, 2, 3) = die Reihenfolge, in der sie abzuschießen sind.
- **Streng der Reihe nach:** Das „aktuelle" Ziel (Order = nextOrder) darf beliebig oft beschossen werden. Ein Treffer auf ein **höheres** markiertes Ziel (Vorgriff, z. B. 2 vor 1) **bricht die Kette** → alle Marken verfallen, neu setzen.
- Ein Treffer auf ein **unmarkiertes** Ziel während laufender Kette **bricht ebenfalls** (Disziplin).
- Markierte sterben **nie instant** — immer über (erhöhten) Schaden.

### Schadens-Aufbau (das Herz, ab BB)
- Jeder in-Reihe-Kill erhöht die **Kette** (`kette`). Nach der ersten vollen 3er-Reihe zählt jeder weitere Kill eine **Aufbau-Stufe** hoch: `aufbauStufe = max(0, kette − 3)`. Also Kette 4 = Stufe 1, 5 = 2, 6 = 3, …
- Jede Stufe gibt **additiven Schaden**: `+ schadenStufe × BEFEHL_DMG_PRO_STUFE(10)` pro Schuss. (Bewusst **additiv**, nicht ×Grundschaden — Größenordnung am Gift kalibriert, damit niedrige Stufen nicht sofort alles one-hitten.)
- **Anzeige:** zwei getrennte HUD-Blöcke — **A** = laufender Aufbau (gelb, an der Kette), **B** = gehaltener Buff (orange/grün).

### Der gehaltene Buff — Unterschied BB vs BBB
- **BB:** Aufbau ist bei `BB_CAP = 3` **gedeckelt**. Erreicht man +3, **rastet** der Bonus als **Buff B** ein (`BUFF_TIME = 10 s` Countdown), der **auch ohne Markierung weiterwirkt**. Der Buff **läuft aus**, wenn man ihn nicht erneuert → man muss ihn aktiv neu erspielen (manuell 3 setzen + bis +3 durchziehen). **Vergänglicher Buff unter Druck — der Clou von BB.**
- **BBB:** **kein Deckel.** Der Aufbau wächst grenzenlos (+4, +5, …) und der gehaltene Bonus **verfällt nie** (permanenter Sockel, Gift-Prinzip: man wird praktisch immer stärker). Reißt die Kette ab, bleibt der erspielte Schaden — man wirft nur die 1-2-3 neu an.

### Auto-Markierer (ab BB)
- Nach der manuellen ersten Reihe zieht ein Automat **einzeln** das nächste Ziel nach (immer nur eine Auto-Marke; fortlaufende Anzeige-Nr 4, 5, 6, …; das nächste erst nach Tod des vorigen).
- Wählt nur **sichtbare** Gegner im Bild (Bildrand-gefiltert), den **nächsten zum Panzer** in Reichweite. Kein Ziel da → wartet, markiert sobald eines reinfährt.
- BB: stoppt am Cap (Kette 6). BBB: läuft grenzenlos.

### Ketten-Timer
- `COMBO_TIME = 10 s`: refresht bei jedem in-Reihe-Kill. Läuft er ohne Kill ab, **reißt die laufende Kette** (der gehaltene Buff/Sockel bleibt). Zwingt zu kontinuierlichem Killen.

### Kaskaden-Tempo (ab BB)
- Jeder Ketten-Kill staffelt das Fahrtempo hoch: `× (1 + min(KASKADE_SPEED_MAX(0.6), kette × KASKADE_SPEED_PRO_KETTE(0.06)))`. Gedeckelt bei +60 %.

### Liste aller Drehschrauben (Talent-Kandidaten)
Diese Werte steuern den Build — **jeder ist ein potenzielles Talent**:

| Schraube | aktueller Wert | Wirkung |
|---|---|---|
| `BEFEHL_DMG_PRO_STUFE` | 10 | Schaden je Aufbau-Stufe → **Kern-Skalierung** |
| `sniperDmgMul` | 2 | Grund-Schadensfaktor des Schusses |
| `MARK_VERWUNDBAR` | 1.6 | Schadensfaktor auf markierte Ziele |
| `MARK_SLOW` | 0.45 | wie stark Markierte verlangsamt werden |
| `BB_CAP` | 3 | BB-Aufbau-Deckel (BBB ignoriert) |
| `BUFF_TIME` | 10 | Countdown des gehaltenen Buffs (BB) |
| `COMBO_TIME` | 10 | Ketten-Timer (Abriss-Fenster) |
| `BEFEHL_FIRE_BASE` | 0.14 | Feuertakt (kleiner = schneller) |
| `KASKADE_SPEED_PRO_KETTE` / `_MAX` | 0.06 / 0.6 | Tempo-Bonus je Kette / Deckel |
| `AMMO_MAX` | 3 | Markier-/Schuss-Magazin |
| `RELOAD_TIME` | 2.2 | Nachlade-Dauer |
| `SLOMO_TIME` / `SLOMO_REGEN` | 3 / 0.5 | Slomo-Budget / Auffüllrate |
| `MAX_MARKS` | 3 | gleichzeitige Markierungen |
| `sniperRange` | 95 | Reichweite |

---

## TEIL C — Die drei Pol-Ults (stehen fest, Q-Taste, je 20 s aktiv / 30 s CD)

| Pol | Name | Effekt |
|---|---|---|
| **Befehl** | ⚔ **Generalstab** | 20 s **Auto-Exekution**: markiert + schießt automatisch eins nach dem anderen (wie der Auto-Markierer, auch ab Counter 0). Alles zählt als selbst gemacht (Kette/Aufbau laufen normal). Jederzeit auslösbar. |
| **Raum** | ▦ **Sperrfeuer** | 20 s **Flächen-Markierung**: alle Ziele in Sicht sind sofort markiert (parallel, **kein** Counter). Man knallt frei alles ab mit Markier-Schaden, **ohne** Reihenfolge-Bruch. Gegensatz zu Generalstab: alle gleichzeitig statt sequenziell. |
| **Zustand** | ☣ **Verfall** | 20 s **Seuche**: markierte Ziele werden in einen **DoT** umgewandelt, der **Slomo hält durchgehend**, unbegrenztes Markieren. Beim Ablauf **explodieren** alle Infizierten + man heilt `SEUCHE_LIFESTEAL = 1 %` des in der Ult ausgeteilten Schadens. |

---

## TEIL D — Auftrag an GPT

Leite einen **Talentbaum für den Kommando-Build** ab, analog zur Garten-Struktur (Teil A):
- **3 Ults stehen** (Teil C) — du baust nur die **passiven Wert-Talente** darunter.
- Orientiere dich am Garten-Muster: **flache Talente, je 3 Ränge, jedes dreht eine Drehschraube** (Teil B, „Liste aller Drehschrauben").
- Gib pro Talent: **Name, Beschreibung (Spieler-Sprache), betroffene Schraube, Wert pro Rang.**
- Denke an die **Build-Identität**: Präzision, Reihenfolge-Disziplin, grenzenloser Aufbau, vergänglicher BB-Buff vs. permanenter BBB-Sockel, Risiko/Belohnung. Talente sollten verschiedene **Spielstile** stützen (z. B. aggressiver Aufbau, sicherer Buff-Halt, Tempo/Mobilität, Munition/Slomo-Ökonomie).
- Optional: schlage vor, ob einzelne Talente an eine **Pol-Wahl** gekoppelt sein sollten (wie im Garten: erst Ult, dann Talente).

**Wichtig:** keine ×Grundschaden-Explosionen vorschlagen — die Kern-Skalierung ist bewusst **additiv** (`BEFEHL_DMG_PRO_STUFE`). Talente dürfen sie erhöhen, aber im selben additiven Rahmen.
