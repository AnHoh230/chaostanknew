# Spec 1 — Kompass-Konsole & Ladungen

- **Datum:** 2026-06-27
- **Projekt:** ChaosTankNew
- **Status:** Entwurf zum Review. Entscheidungen (§5) sind begründete Vorschläge — überschreibbar.
- **Hängt an:** [Spec 0 — Fundament](2026-06-27-permanente-evolution-fundament-design.md)
- **Liefert an:** Spec 2 (Finisher) und Spec 3 (Spieler-Evolution).

---

## 1. Wozu diese Spec

Spec 0 hat den Kompass als **roten Faden / die Maschine** bestimmt: 3 Pole = 3 „Items",
**Ladungen = ihre Level**, gemaxte Pol-Paare erzeugen Finisher + Evolutionstyp. Diese Spec definiert
**die Maschine selbst**: wann die Konsole freischaltet, wie der Spieler Impulse lenkt, wie Ladungen
entstehen, was „gemaxt" heißt, und welche Schnittstellen Spec 2/3 davon lesen.

Diese Spec deckt **nur das Erzeugen + Halten** der Ladungen ab. *Was* die Ladungen auslösen
(Finisher) ist Spec 2; *was* aus dem Spieler wird (Evolution) ist Spec 3.

---

## 2. Was die Konsole ist

Nach **vollem Skillbaum** (Ende Phase 2) hat der Impuls-Strom (Kills) kein Maul mehr — Build-Kanal
und Skillbaum sind satt. Genau dann schaltet die **Kompass-Konsole** frei und fängt diesen Überlauf
auf.

Die Konsole zeigt drei Pole zur Auswahl — die Tasten, die der Nutzer genannt hat:

```
[1] Befehl     [2] Raum     [3] Zustand
 ▓▓▓░░ ●●○○○    ░░░░░ ○○○○○    ▓▓▓▓░ ●●●●○
```

- **Du wählst per `1`/`2`/`3` den aktiven Pol.** Der Überlauf-Impuls fließt in **genau diesen** Pol.
- Jeder Pol hat eine **Ladungs-Leiste** (Fortschritt, `▓`) und gesammelte **Ladungen** (Pips, `●`).
- Volle Leiste → **+1 Ladung** dieses Pols, Leiste beginnt von vorn (teurer, siehe §4).

Das ist der „herrichten"-Akt auf Makro-Ebene: du *entscheidest pro Run*, wohin deine Kills zahlen —
und steuerst damit, welche Finisher/Evolution du ansteuerst.

---

## 3. Das Ladungs-Modell

- **3 Pole = 3 Items:** Befehl / Raum / Zustand. Jeder hat eine Ladungs-Zahl (sein „Level").
- **Ladung = Level-Schritt.** Mehr Ladungen in einem Pol = dieser Pol „stärker ausgebaut".
- **Gemaxt:** ein Pol bei `POL_MAX_LADUNGEN` ist *gemaxt* — der **Meilenstein**, den Spec 2/3 lesen
  (gemaxtes Pol-PAAR → Finisher geschmiedet + Evotyp gesetzt; alle drei → Systemform).
- **Ladungen sind Treibstoff** (Begründung Nutzer: „je nach Ladung kann der Finisher feuern"): der
  Meilenstein *schmiedet* den Finisher einmalig; danach *verbrennt* das Feuern Ladungen der nötigen
  Pole. Wie viel je Schuss = Spec 2. Spec 1 stellt nur das Primitiv `verbrauche()` bereit.
- **Run-permanent, kein Decay.** Im Run gesammelt bleibt gesammelt (außer durch Finisher-Verbrauch).

---

## 4. Die Ökonomie (Erzeugen)

1. **Quelle:** derselbe Impuls-Strom wie bisher (Kills). Vor Freischaltung füttert er Build-Kanal +
   Skillbaum (unverändert). Nach Freischaltung → Konsole, in den **aktiven** Pol.
2. **Leiste füllen:** `speiseImpuls(menge)` schiebt `menge` in die Leiste des aktiven Pols.
3. **Ladung verdienen:** erreicht die Leiste die Kosten → `+1 Ladung`, Überschuss bleibt in der
   Leiste stehen (kein Verlust).
4. **Steigende Kosten:** jede weitere Ladung desselben Pols kostet mehr
   (`kosten = BASIS × WACHSTUM^vorhandeneLadungen`). Bremst das Tempo nach hinten → Pacing-Regler.
5. **Pol-Wechsel:** `wählePol(1/2/3)` leitet den Strom um; **Teilfortschritt jedes Pols bleibt
   erhalten** (du kannst splitten, indem du wechselst — aber nie zwei gleichzeitig füllen).
6. **Deckel:** bei `POL_MAX_LADUNGEN` nimmt der Pol keine Impulse mehr an (Überlauf könnte später in
   Fusion fließen — Spec 4); bis dahin: Hinweis „Pol gemaxt, wechsle".

**Startwerte (zum Tunen, kein Gesetz):** `BASIS = 10`, `WACHSTUM = 1.25`, `POL_MAX_LADUNGEN = 5`.
→ ein Pol komplett zu maxen kostet ~82 Impuls-Punkte, ein Pol-PAAR ~164. Bei grob 1 Impuls/Kill
landet ein Paar im einstelligen Minutenbereich — passt zur 5–10-min-Phase. **Im Playtest justieren.**

---

## 5. Entscheidungen (Vorschläge — sag, wenn anders)

| # | Entscheidung | Begründung |
|---|---|---|
| D1 | **Ein aktiver Pol zur Zeit** (1/2/3 wählt, Überlauf fließt dorthin) | deine „1 2 3"-Konsole; macht das Lenken zur echten Entscheidung |
| D2 | **1 Ladung pro voller Leiste, Kosten steigen je Ladung** | Pacing-Bremse nach hinten ohne harte Wand |
| D3 | **Pol-Max (Start 5) = der Meilenstein** für Finisher/Evotyp | klare Schwelle, die Spec 2/3 lesen |
| D4 | **Ladungen = Treibstoff** (Meilenstein schmiedet einmalig, Feuern verbraucht) | dein „je nach Ladung kann der Finisher feuern" |
| D5 | **Run-permanent, kein Decay** | Ladungen sind Fortschritt, kein Verfallsdruck |
| D6 | **Freischaltung = Skillbaum voll** (Phase 2 fertig) | Verdauungskette aus Spec 0 |
| D7 | **Quelle = Impuls-Überlauf** (Kills nach Build+Baum-voll) | nutzt den vorhandenen Strom, keine neue Währung |

---

## 6. Bedienung / HUD

- **Tasten `1`/`2`/`3`** wählen den aktiven Pol (aktiver Pol hervorgehoben).
- Pro Pol: **Leiste** (Fortschritt zur nächsten Ladung) + **Pips** (Ladungen / `POL_MAX_LADUNGEN`).
- Konsole erscheint erst nach Freischaltung (vorher unsichtbar, kein UI-Lärm).
- Feedback bei „+1 Ladung" (kleiner Float/Ton), bei „Pol gemaxt" deutlicher Marker (das ist der
  Moment, in dem Spec 2 evtl. einen Finisher schmiedet).

---

## 7. Verhärtung des Kompasses (später, optional)

Spec 0 sagt: gemeisterte Schichten verhärten. Der Kompass kann das auch: Ist Phase 3 (Finisher)
durch, könnte das **Lenken automatisieren** (Impulse verteilen sich selbst auf die noch nicht
gemaxten Pole). Dann wandert die Hand zur nächsten Schicht. **Nicht Teil dieser Spec** — Notiz für
Spec 3/Phasen-Verhärtung.

---

## 8. Schnittstellen

**Die Konsole liest:** den Impuls-Überlauf (Quelle: das bestehende Impuls-/Kanal-System in
`src/evolution/channels.ts`; genaue Anzapfung klärt der Umsetzungsplan).

**Spec 2 / Spec 3 lesen von der Konsole:**

- `istPolGemaxt(pol)` / `gemaxtePole()` → welche Pol-Paare sind reif (Finisher schmieden, Evotyp).
- `ladungen[pol]` → aktueller Treibstoff.
- `verbrauche(pol, menge)` → Finisher-Feuern zieht Ladungen ab (Spec 2 bestimmt `menge`).

---

## 9. Pure-Modul-Skizze (`src/build/kompass.ts`, TDD)

Design-Ebene, nicht final — RED→GREEN beim Bauen. Pol-Typ kommt aus `buildModell.ts`.

```ts
export interface KompassState {
  freigeschaltet: boolean;
  aktiverPol: Pol;                       // 'befehl' | 'raum' | 'zustand'
  fortschritt: Record<Pol, number>;      // Teilfüllung der Leiste je Pol
  ladungen: Record<Pol, number>;         // verdiente Ladungen je Pol
}

export const KOMPASS_BASIS = 10;
export const KOMPASS_WACHSTUM = 1.25;
export const POL_MAX_LADUNGEN = 5;

export function createKompassState(): KompassState;
export function kompassFreischalten(s): void;             // Skillbaum voll
export function waehlePol(s, pol): void;                  // 1/2/3
export function polKosten(s, pol): number;                // BASIS × WACHSTUM^ladungen
export function speiseImpuls(s, menge): boolean;          // füllt aktiven Pol; true wenn +1 Ladung
export function istPolGemaxt(s, pol): boolean;            // ladungen >= POL_MAX_LADUNGEN
export function gemaxtePole(s): Pol[];                    // für Spec 2/3
export function verbrauche(s, pol, menge): boolean;       // Finisher zieht Treibstoff (Spec 2)
```

**Testfälle (Auszug):** vor Freischaltung nimmt `speiseImpuls` nichts an; eine volle Leiste gibt
genau 1 Ladung + behält Überschuss; Kosten steigen je Ladung; `wählePol` bewahrt Teilfortschritt;
bei `POL_MAX_LADUNGEN` keine weitere Annahme; `gemaxtePole` listet genau die gemaxten;
`verbrauche` zieht ab und scheitert bei zu wenig Ladung.

---

## 10. Offene Punkte (in Spec 2 zu klären)

- Verbrauchsmenge je Finisher-Feuern (`verbrauche`-`menge`) und ob ein Schwellen- statt
  Verbrauchsmodell für einzelne Finisher sinnvoller ist.
- Ob der Pol-Deckel-Überlauf (gemaxt + weiter Impulse) verfällt oder für Fusion (Spec 4) gepuffert
  wird.
- Auto-Lenken bei Kompass-Verhärtung (§7) — Detail in Spec 3.

---

## 11. Randbedingungen

Erbt Spec 0 §10: Kommander = Klasse; Stage 0 bleibt; TDD (`kompass.ts` + `kompass.test.ts`);
Verifikation via `tsc` + `vitest`, keine Browser-Selbstverifikation; Gelöschtes bleibt gelöscht.
