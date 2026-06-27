# Spec 7 (code-abgeglichen) — Smart Hautabschluss & Signaturmodell

- **Datum:** 2026-06-27
- **Projekt:** ChaosTankNew
- **Status:** verbindliche Korrektur-Spec für Schichtabschluss/Verhärtung — **gegen den echten Code abgeglichen**
- **Vorlage:** „Spec 7 — Smart Hautabschluss & Signaturmodell" (Entwurf). Diese Fassung ersetzt die *angenommenen* Werte/Modelle durch die im Code vorhandenen.
- **Ersetzt:** „Verhärten = Aktion läuft automatisch" (Spec 0 §4) für die unteren Schichten.

---

## 0. Code-Abgleich — was gegenüber dem Entwurf korrigiert wurde

| Entwurf nahm an | Echter Code | Konsequenz |
|---|---|---|
| DoT-Reapply **resettet** Reife (Zeit-`maturityProgress`) | [`saeGift`](src/build/garten.ts:44) macht `potency += saat` (6), behält `tickCd` → **additiv, monoton, kein Reset** | Das „Reifungsdruck"-Modell existiert faktisch schon. Kein `maturityProgress`-Sekundenmodell bauen. |
| Reife ist Sekunden-Timer | Reife = `potency / erntePot` (Schwelle **36**); `reifeStufe` 0–3 | Alle Zustand-Regeln auf **Potenz** formulieren, nicht auf Sekunden. |
| „Die Ult" (1 pro Build) | **3 Pol-Ults pro Build** (`BEFEHL_ULTS`/`RAUM_ULTS`/`ULTS`) | Signiert wird die **gewählte** Pol-Ult; Auto nur im Ult-Fenster. |
| Talent = eigene signierbare Schicht | Im Code: **Ult + 5 Talente×3 = ein Skillbaum** (`skillbaumVoll`) | Schicht-Modell = Build / **Skillbaum (Ult+Talente)** / Finisher (3, nicht 4). |
| `RAUM_FIELD_ANCHOR_CAP = 3` | Feld-Cap = **`maxAmmo()`** (Basis 3 + Vorrat-Talent), FIFO in [`legeFeld`](src/build/raum.ts:58) | Cap dynamisch, nicht fix 3. |
| Finisher-Handoff = neue Banks/Queues | **`boardScore`** existiert ([finisher.ts](src/build/finisher.ts)) + `finisherRang` | Kein zweites Board-State-System; `boardScore` nutzen. |
| Finisher-Hardening/Dispatcher (neu) | `FINISHER_EFFECTIVE_USES_TO_HARDEN = 8`, `AUTO_FIRE_EVALUATION_SECONDS = 1` (existiert) | Werte stimmen schon — übernehmen. |
| Telemetrie (neu, Gate 8) | [`telemetry.ts`](src/build/telemetry.ts) existiert (EWMA + Meilensteine) | Erweitern, nicht neu bauen. |

**Wichtigste inhaltliche Korrektur:** Der „reift nie"-Bug kommt **nicht** vom Reset (den gibt's nicht), sondern davon, dass das alte Auto-Gift jeden Tick den *nächsten* Gegner nahm → die Seuche streut dünn, kein Gegner sammelt je 36 Potenz. Fix = **Zielauswahl** (nur Uninfizierte / Reife-näheste), nicht ein neues Reifemodell.

---

## 1. Grundentscheidung

> **Eine Haut schließt nicht durch Auto-Spam ab, sondern durch eine Signaturregel** — eine sichere Baseline, die das Spielprinzip weiterträgt, ohne Zustände zu resetten, zu überschreiben oder unlesbar zu machen.

Begründung steht in §0: blindes Auto-Ausführen müllt Raum zu, streut Zustand dünn, und Auto-Schießen ist nur im Ult-Fenster sinnvoll (es **gibt** dafür eine Ult: `kommando`/Generalstab).

---

## 2. Schichten (an den Code angeglichen)

| Schicht | Code-Realität | Abschluss wird zu |
|---:|---|---|
| 1 | **Build + Skillbaum** — Stufe 0→3 (`ACTIVE_CORE`) **UND** gewählte Pol-Ult + 5 Talente×3 = **EINE Haut** (`skillbaumVoll`). Verhärtet erst, wenn ALLES voll ist — sonst tote Zeit beim Skillpunkte-Sammeln. | Build- + Talent-Signatur **+** Ult läuft selbst (bei Befehl: `kommando` = Auto-Schuss) |
| 2 | **Finisher** — `finisher.ts` (schmieden/feuern/`boardScore`/Verhärtung) | Board-State-Entladung mit Auto-Gate |

> **Wichtig (Nutzer-Korrektur):** Build und Skillbaum verhärten **gemeinsam** bei `skillbaumVoll()`, nicht der Build schon bei Stufe 3 — sonst läuft der Build auf Autopilot, während man noch Skillpunkte für die Ult sammelt = nichts zu tun. Und: der **Befehl-Build bekommt KEINEN eigenen Auto-Schuss**, weil die `kommando`-Ult genau das schon ist.

Kompass / Spieler-Evolution / Fusion bleiben die späteren Systeme (schon gebaut). Diese Spec sorgt für lesbare Zustände: **markiert** (`buffs 'markiert'`), **im Feld** (`e.feld.gefangen`), **verseucht/reif** (`e.gift.potency` ≷ `erntePot`).

---

## 3. Harte Invariante: Automatik nur wenn sicher (unverändert — das ist korrekt)

Erlaubt nur, wenn **idempotent / monoton / gecappt / getaktet / intent-schonend**. Verboten: DoT-Reife senken, Feldpositionen blind überschreiben, Spieler-Zielwahl dauernd ersetzen, pro Frame feuern/legen/detonieren, unbegrenzt spawnen, alte Schichten wieder APM-pflichtig machen.

```txt
Kann eine Auto-Regel einen Zustand resetten/verschlechtern/verdrängen/unlesbar machen → keine gültige Signatur.
```

---

## 4. Datenmodell

```ts
export type BuildId = 'befehl' | 'raum' | 'zustand';     // == Pol (buildModell.ts)
export type LayerId = 'build' | 'skillbaum' | 'finisher'; // an den Code angeglichen (Ult+Talente gebündelt)
export type LayerStatus = 'locked' | 'active' | 'progressFull' | 'masteryPassed' | 'signed';

export interface SignatureState {
  build: BuildId;
  layer: LayerId;
  status: LayerStatus;
  mastery: Record<string, number>; // gemessene Spielnachweise (s. §6)
  signedAtSeconds?: number;
}
```

Signaturregeln müssen in Tests beweisen, dass sie keine verbotenen Nebenwirkungen (§3) erzeugen.

---

## 5. Generischer Abschluss — drei Gates

- **Gate A — Progress voll:** Build = `evo.unlockedStagesByChannel[ACTIVE_CORE] >= 3`; Skillbaum = `skillbaumVoll()`; Finisher = `FINISHER_EFFECTIVE_USES_TO_HARDEN` (8).
- **Gate B — Meisterprüfung:** Spielnachweis (s. §6) — **neu, kein Code-Äquivalent, tunbar**.
- **Gate C — Signatur aktiviert:** sichere Regel an (§6/§7/§8).

```txt
progressFull + masteryPassed + signatureActivated = signed → erst dann Überlauf weiter
```

> **OFFENE ENTSCHEIDUNG (Doppel-Gate):** Gate A (Impulse, Spec 5) **und** Gate B (Meisterprüfung) zusammen können die Progression stark bremsen. Default-Vorschlag: Gate B ist **weich** (zählt mit, blockiert den Überlauf aber nur, wenn `MASTERY_GATE_HARD = true`). Start: `MASTERY_GATE_HARD = false` → Verhalten wie heute, Mastery wird nur **gemessen** (Telemetrie), bis du sie scharf schalten willst.

---

## 6. Schicht 1 — Build-Signaturen (echte Mechanik)

### 6.1 Befehl — Zielprotokoll
**Kernverb:** markieren → priorisieren → vollstrecken. Real: `MAX_MARKS = 3`, `MARK_VERWUNDBAR = 1.6`, `BB_CAP = 3`, `BUFF_TIME = 10`, Auto-Mark ab BB (`autoMarkEins`), `befehlSchuss` auf eine Marke ist **munitions-neutral** (refundet bei Kill).

**Signatur (sicher):** Marken werden zu Prioritätszielen; Re-Mark **verlängert/verstärkt** (Cap), überschreibt die Zielhistorie nicht; spätere Schüsse/Ults bevorzugen Marken. **Kein** eigenständiges Dauerfeuer (das macht nur die Ult `kommando`).
```ts
export const BEFEHL_SIG_PRIORITY_MEMORY_S = 4.0;
export const BEFEHL_SIG_MAX_PRIORITY_TARGETS = MAX_MARKS; // = 3, nicht 5
```

**Meisterprüfung (neu, tunbar):** `BEFEHL_MASTERY_MARKED_KILLS = 16`, `BEFEHL_MASTERY_MIN_MARK_AGE_S = 0.75` (Sofort-Mark im Todesmoment zählt nicht).

### 6.2 Raum — Feldanker
**Kernverb:** Orte über Felder kontrollieren. Real (`DEFAULT_RAUM`): `radius 3`, `tickEvery 0.5`, `ticksZumTod 4`, `slow 0.8`, `wachstumProBuff 0.05`, `wachstumCap 60`. Cap = **`maxAmmo()`** (FIFO).

**Signatur (sicher):** **kein** neues Feld legen, solange Cap erreicht. Statt dessen alle `RAUM_SIG_PULSE_S` ein **bestehendes** Feld stärken (Dauer/Radius bis Cap, leichter Pull). Nur wenn unter Cap **und** klarer Trigger (Cluster ≥6 / Elite / letzter manueller Punkt) → ein Feld.
```ts
export const RAUM_SIG_PULSE_S = 4.0;
export const RAUM_SIG_RADIUS_BONUS_PER_PULSE = 0.04; // bis wachstumCap-Logik
export const RAUM_SIG_MIN_CLUSTER = 6;
```

**Meisterprüfung:** `RAUM_MASTERY_FIELD_KILLS = 16`, `RAUM_MASTERY_MIN_FIELD_AGE_S = 1.0`.

### 6.3 Zustand — Reifungsdruck (**am Code, nicht am Sekundenmodell**)
**Kernverb:** infizieren → reifen lassen → reifen Zustand nutzen. Real (`DEFAULT_GARTEN`): `saat 6`, `reife 1.15`/Tick, `tickEvery 0.5`, `erntePot 36`, `tickDmg 1`, `reifDmg 9`, `dmgProFieber 2`, `ansteckRadius 30`. **`saeGift` ist additiv → schon monoton.**

**Harte Regel (schon erfüllt, als Test absichern):**
```txt
saeGift senkt potency nie. (potency_neu = potency_alt + saat)  ✔ bereits so
```
**Signatur (der EIGENTLICHE Fix = Zielauswahl):**
```txt
Auto/Smart-Infektion zielt auf den NÄCHSTEN UNinfizierten (potency==0) Gegner,
NICHT auf den schon Infizierten → jeder Herd sammelt bis erntePot und reift.
Bereits infiziert: nicht nachsäen (lass ihn reifen); optional „Druck" = potency-Overshoot über erntePot.
```
```ts
export const ZUSTAND_SIG_TARGET = 'naechster-uninfizierter';
export const ZUSTAND_PRESSURE_CAP_POTENCY = erntePot * 1.5; // 54: Overshoot-Deckel statt Reset
```
**Meisterprüfung:** `ZUSTAND_MASTERY_MATURE_KILLS = 16` (am Gift gestorbene Reife), `ZUSTAND_MASTERY_MIN_GIFT_AGE_S = 1.0`.
**Test:** ein Gift mit `potency 30` ist nach erneutem `saeGift` bei `36` (≥), **nie** bei `< 30`.

---

## 7. Schicht 2 — Skillbaum (Ult + Talente, EIN Tree)

Abschluss = `skillbaumVoll()` (Ult gewählt **und** alle Talente auf `*_TALENT_MAX = 3`). Real: je Build **5 Talente × 3 Ränge** (15 Punkte), `PUNKT_KOSTEN` aus skilltree.

**Echte Talent-Ids (keine erfundenen Tiers):**
- **Befehl:** `disziplin · dauer · beute · cooldown · pol` (`BEFEHL_TALENTS`)
- **Raum:** `dauer · cooldown · beute · schaden · munition` (`RAUM_TALENTS`)
- **Zustand:** `saat · reife · koechel · drossel · reifschaden` (`TALENTS`)

**Talent-Signatur (Schärfung, sicher) — je Build EIN Zusatzeffekt bei vollem Baum:**
- **Befehl — Befehlsnetz:** stirbt ein markierter Gegner, bekommen bis 2 nahe **markierte** (keine neuen Marken!) Befehlsdruck + kleiner Splash.
- **Raum — Stabile Front:** ≥2 nahe Felder gelten als Front → Gegner dazwischen leicht zusätzlich verlangsamt; **keine** neuen Felder.
- **Zustand — Kritische Masse:** stirbt ein **reifer** (`potency≥erntePot`) Gegner, springt Gift auf bis 2 nahe; beim Ziel gilt `potency_neu = max(potency_alt, einkommend)` (nie schlechter).
```ts
export const SIG_LINK_RANGE = 6;          // Welt-Einheiten (nicht 240px)
export const SIG_MAX_LINKS = 2;
```

---

## 8. Schicht 2b — Ult-Protokoll (3 Pol-Ults je Build, real)

Abschluss = Teil von `skillbaumVoll` (Ult gewählt). „Wirksam genutzt" zählt für Mastery, nicht zum Auto-Zünden.
```ts
export const ULT_EFFECTIVE_USES = 6;
export const ULT_MIN_EFFECT_SCORE = 8;
```

**Die echten Ults (alle `taste Q`):**
| Build | Ult-Ids (Pol) | Dauer/CD | Auto-fähig? |
|---|---|---|---|
| Befehl | `kommando` (B) · `streuung` (R) · `seuche` (Z) | 20 / 30 | **`kommando`** mark+exekutiert auto *im Fenster* (existiert bereits) |
| Raum | `umlagerung` (B) · `grossfeld` (R) · `verseuchung` (Z) | 20 / 30 | Feldverlagerung/-größe — **keine** neuen Felder spammen |
| Zustand | `naehrboden` (Z) · `gnadenstoss` (B) · `ausbruch` (R) | 6/12 · 5/12 · 5/14 | Reifeschub/Ernte — **senkt nie** potency |

**MVP-Regel:** Auto-Zünden der Ult **nicht** automatisch — nur Auto-Aim/Zielpriorität *innerhalb* der manuell aktivierten Ult. `kommando` ist die Ausnahme (sein Effekt *ist* Auto-Schuss, aber zeitlich auf 20 s + CD 30 begrenzt).
Talent-Kopplung real: `DAUER_PRO_RANG 5`, `CD_PRO_RANG 5` (Befehl), analog `RAUM_*`/Zustand.

---

## 9. Schicht 3 — Finisher (nutzt `boardScore`, keine neuen Banks)

Schon gebaut: schmieden (Bauplan + Pol-Paar gemaxt), `boardScore` liest mark/feld/gift, Verhärtung nach **8** wirksamen Zündungen, **1-s-Dispatcher** (max 1 Finisher/Tick), `finisherRang` (je `FINISHER_RANG_PRO = 4`).

**Handoff = der existierende `boardScore`**, nicht neue Reifebank/Kollapsladung/Queue:
- Befehl liefert markierte Gegner → BoardScore `mark`.
- Raum liefert Gegner in Feldern → BoardScore `feld`.
- Zustand liefert verseuchte → BoardScore `gift` (gedeckelt `BOARD_POISON_STACK_CAP = 8`).

**Regel (gilt schon):** kein Frame-Feuer; nur Dispatcher; keine neuen Felder/Marken/Gift NUR wegen Finisher-Bereitschaft (→ betrifft den aktuellen Build-Färb-Effekt in `zuendeFinisher`, der ein Feld legt — **muss unter §3 gecappt/getriggert werden**).

---

## 10. Paare/Evolution unter dem Modell (real, schon teils gebaut)
- **Architekt (B+R):** Marken ziehen **vorhandene** Feldanker, keine neuen; Prio Elite>Gruppe>letzter Punkt.
- **Alchemist (R+Z):** Felder infizieren **Uninfizierte** (`potency==0`); Infizierte nur reifer; `potency` nie gesenkt.
- **Richter (B+Z):** markiert+verseuchte = Knoten; Kette nur bei Tod/Trigger/Finisher-Gate, Budget `RICHTER_CHAIN_MAX_STEPS = 5`, Reife-Transfer per `max()`.

> Hinweis: die heutige Fusion-Cross-Herrichtung + das Edikt rufen `saeGift`/`herrichte` ungetaktet — unter §3 auf „nur Uninfizierte, getaktet, gecappt" umstellen.

---

## 11. Implementierungsplan (an den Code angepasst)

- **Gate 0 — blinde Automatik absichern:** das aktuelle Auto-B (`phasen.verhaertet.build` → Auto-Schuss/Feld/Gift), die Fusion-/Edikt-`herrichte`-Aufrufe und das Finisher-Feld-Färben hinter §3-Regeln bringen oder abschalten. DoD: Raum spammt keine Felder, Zustand säet nur Uninfizierte, Befehl-Auto nur in `kommando`.
- **Gate 1 — `signatureModel.ts`** (BuildId/LayerId/LayerStatus/SignatureState + Statusübergänge, TDD).
- **Gate 2 — `effectSemantics.ts`**: sichere Apply-Regeln für **mark/feld/gift** (gift bereits monoton — als Test fixieren; feld: kein Spawn bei Cap; mark: Prio nicht chaotisch). TDD.
- **Gate 3 — `buildSignatures.ts`**: Zielprotokoll / Feldanker / Reifungsdruck mit den **echten** Werten oben. TDD (zählt nur echte markierte Kills / Gegner-Sekunden in Feldern / am Gift gereifte).
- **Gate 4 — Talent-Schärfung** (Befehlsnetz / Stabile Front / Kritische Masse), gekoppelt an `skillbaumVoll`.
- **Gate 5 — Ult-Protokolle**: Auto-Aim in der manuellen Ult; `kommando` bleibt Auto im Fenster; Zustand-Ult senkt nie potency.
- **Gate 6 — Finisher-Handoff = `boardScore`** (nichts Neues bauen; nur den Feld-Färb-Effekt cappen).
- **Gate 7 — Überlauf-Gate** an `signed` (mit `MASTERY_GATE_HARD`-Schalter aus §5).
- **Gate 8 — Telemetrie** in `telemetry.ts` ergänzen: Zeit bis signed je Schicht, verhinderte Reife-Resets (sollte 0 sein), Feld-Spawns→Verstärkung umgewandelt, Befehl-Auto ohne Ziel, **erreicht je Gegner `erntePot`?** (misst den echten Zustand-Bug).

---

## 12. Definition of Done
1. Keine globale blinde Abschluss-Automatik. 2. Build-Signatur je Build. 3. Talent-Schärfung je Build. 4. Ult-Protokoll je gewählter Pol-Ult. 5. Finisher liest `boardScore` (kein zweites System). 6. `saeGift` senkt potency nie (Test). 7. Felder nie über `maxAmmo()` gespawnt. 8. Befehl-Auto nur in `kommando`. 9. Jede Auto-Regel getaktet/gecappt/triggerbasiert. 10. Überlauf erst nach `signed` (Hard-Gate optional). 11. `tsc` grün. 12. `vitest` grün. 13. Telemetrie zeigt Abschlusszeiten + den echten Zustand-Reife-Verlauf.

---

## 13. Claude-Regeln (unverändert gültig)
Idempotent/monoton/gecappt · `potency` nie senken · Felder nie ohne Cap · Befehl nie ohne Zielprio schießen · Signatur verstärkt, ersetzt nicht · keine neue Hauptmechanik wo ein Zustand reicht · erst Pure-Logik testen · keine Browser-Selbstverifikation · vorhandene Ult einer der 3 Kategorien zuordnen · **Spielerabsicht > Signatur > Automatik**.

---

## 14. Kurzform
```txt
Befehl  → Zielprotokoll (Auto nur in der Ult 'kommando').
Raum    → Feldanker (verstärken statt spammen, Cap = maxAmmo()).
Zustand → Reifungsdruck: saeGift ist schon monoton; Fix = nur UNINFIZIERTE anzielen.
Skillbaum → Ult-Protokoll + Talent-Schärfung (EIN Tree, skillbaumVoll).
Finisher → boardScore-Entladung mit 1s-Dispatcher (existiert).
```
