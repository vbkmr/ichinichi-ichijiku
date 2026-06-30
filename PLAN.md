# 一日一字（く） · ichinichi-ichijiku — Project Plan

**One kanji-group a day.** A static GitHub Pages site + an iOS Scriptable home-screen
widget that surfaces one Japanese **kanji radical group (部首)** or **phonetic group
(形声)** per day. Tap the daily glyph to reveal its breakdown. This is a sibling of
[ichinichi-ichigo](https://github.com/vbkmr/ichinichi-ichigo) (one *word* a day) and
deliberately mirrors that project's theme, architecture, interaction model, and security
posture.

- **Repo:** https://github.com/vbkmr/ichinichi-ichijiku  *(created, public)*
- **Site (after Pages enable):** https://vbkmr.github.io/ichinichi-ichijiku
- **Data:** 34 radical groups + 61 phonetic groups = **95 cards → a 95-day cycle**
- **Status:** plan under review. **Already shipped to the repo:** `README.md` (H1 with the
  fig brand mark), `assets/fig.svg` (fig icon on solid 紺 bg), `analytics.js` (GA4, ID
  `G-CJ7YBPYZ2F`). **Not yet built:** `index.html`, `style.css`, `app.js`, `data/*.json`,
  `widget/`; GitHub Pages not yet enabled.

> The name plays on **一字一句** (*ichiji-ikku*, "every single word, to the letter"):
> 一日一**字**（句）.

---

## 1. What we mirror from ichinichi-ichigo

The original is a no-framework, root-served static site:

```
index.html  style.css  app.js  analytics.js  README.md
data/index.json   ← LIGHT list  [{id, word, reading, meaning}], sorted by id
data/goi.json     ← FULL records [{…, explanation}]  (explanation = GFM markdown)
widget/ichinichi-ichigo.js   ← Scriptable widget
```

Key mechanisms we reuse **unchanged**:

- **紺 (indigo) theme** — the exact `:root` palette and the two fonts:
  Shippori Mincho (serif, the big glyph) + JetBrains Mono (labels/reading/meta).
- **Two-tier data**: a light `index.json` for first paint + widget; a heavy full file
  fetched lazily only on first reveal.
- **Tap-to-reveal panel**: `marked.parse(explanation)` → `DOMPurify.sanitize` →
  `innerHTML`, under a **strict CSP** (no `unsafe-inline`) with marked + DOMPurify
  pinned from jsDelivr with **SRI**. (The live ichigo `index.html` pins
  `marked@18.0.5` + `dompurify@3.4.11` with real `sha384-…` hashes — we copy those
  exact lines.)
- **Deterministic daily pick + deep-link sync**: list is sorted by `id`; the widget
  computes `i = epochDay % N` and links to `/#<id>`; the site reads the hash and shows
  that exact card. Single-tap reveal/fold, double-tap shuffle, `第 N 日` footer.

### Daily site⇄widget sync (sequence)

```
┌────────┐                         ┌──────────────────┐         ┌──────────────┐
│ iOS    │  load data/index.json   │ GitHub Pages     │         │ Browser/site │
│ widget │ ──────────────────────► │ (static files)   │         │  app.js      │
└────────┘                         └──────────────────┘         └──────────────┘
    │  sort by id (same order site uses)                              │
    │  i = floor(Date.now()/86400000) % N                             │
    │  render glyph + reading + 第(i+1)日                             │
    │  widget.url = BASE + "/#" + list[i].id                          │
    │                                                                 │
    │ ── user taps widget ──►  opens BASE/#<id> ─────────────────────►│
    │                                                  app.js reads location.hash
    │                                                  show(card with that id)  ← SAME card
```

Both sides independently read ids from the **same committed, id-sorted file** and never
recompute hashes at runtime — so the order can't drift between them.

---

## 2. Repo scaffold (files to create)

```
ichinichi-ichijiku/
├── index.html                 # hero + CSP + SEO/OG/Twitter meta (adapted)
├── style.css                  # ichigo theme verbatim + ~40 lines of new badge/chip CSS
├── app.js                     # ichigo logic + 2 small type-aware branches
├── analytics.js               # ✓ pushed — GA4 loader, MEASUREMENT_ID = "G-CJ7YBPYZ2F"
├── README.md                  # ✓ H1+brand pushed — TODO: screenshots, widget setup, privacy
├── DEVELOPERS.md              # how to edit CSVs + re-run the build (sync invariant)
├── .gitignore
├── data/
│   ├── index.json             # GENERATED — light list (committed)
│   └── kanji.json             # GENERATED — full records incl. explanation (committed)
├── widget/
│   └── ichinichi-ichijiku.js  # Scriptable widget (adapted)
├── tools/                     # author inputs + build (NOT served by Pages logic; see note)
│   ├── build.py               # CSV → JSON (Python 3 stdlib, zero deps)
│   ├── explain.py             # build_explanation(rec) → markdown
│   ├── kanji-radical-flashcards.csv      # moved here from repo root
│   ├── kanji-phonetic-flashcards.csv     # moved here from repo root
│   └── kanji-phonetic-families-cheatsheet.md   # reference, not shipped as a card
└── assets/
    ├── fig.svg                # ✓ pushed — brand mark (fig on solid 紺 bg)
    ├── fig.png                # TODO — rasterized fig for favicon / OG image / widget
    └── *.png                  # TODO — site screenshots for the README
```

> Moving the CSVs/cheatsheet under `tools/` keeps the raw source out of the site root.
> (Pages still serves the whole repo, but the site never links to `tools/`.)

---

## 3. The normative data contract (single source of truth)

The design fan-out produced **five area designs that disagreed** on every load-bearing
contract. The plan pins **one** value for each; these are frozen and referenced by the
build, app.js, the widget, and the templates.

| Contract | Frozen value |
|---|---|
| **id seed** | `id = sha1(f"{type}:{rawGlyph}")[:8]` — `rawGlyph` = the **raw** CSV `radical`/`phonetic` column (`亻`, `阝(左)`). No name, no tab/pipe. *(Verified: reproduces published ids, 0 collisions / 95.)* |
| **Full file name** | `data/kanji.json` |
| **Light file name** | `data/index.json` |
| **Light schema** | `{ id, type, word, reading, meaning, level, reliability, position, lookAlike }` — superset of ichigo's 4 fields so the widget + collapsed-face badges render from `index.json` alone. |
| **Display glyph (`word`)** | The **clean single glyph** — strip `(左)/(右)` annotations. `word` is intentionally **non-unique** (both 阝 share `阝`); all code keys on `id`. |
| **Look-alike chip** | Driven **only** by `tags.includes("look-alike")` (复啇畐 + 4 radicals). *Never* by `⚠️`-in-`back` (that misfires on 21 rows). |
| **Caution `note`** | Separate free-text field parsed from the `back` prose tail (carries ⚠️ look-alike / positional / fire-vs-water cautions); rendered as an info line, independent of the chip. |
| **`reliability` enum** | `rock-solid · strong-rogue · cluster · unreliable` (CSV tag `blacklist` → normalize to `unreliable`). `""` for radicals. |
| **Build runtime** | **Python 3 stdlib** — `tools/build.py` + `tools/explain.py`. *(Owner may opt for Node; see decisions.)* |

### `data/index.json` — light record (every key always present)

```jsonc
{
  "id":          "69bce705",
  "type":        "radical",                 // "radical" | "phonetic"
  "word":        "亻",                       // clean hero glyph
  "reading":     "にんべん",                 // radical → kana name; phonetic → lent on'yomi (ハク, ジ／シ)
  "meaning":     "person / human action",   // radical → English gloss; phonetic → tier line (see §3.1)
  "level":       "N5",
  "reliability": "",                         // phonetics only; "" for radicals
  "position":    "hen",                      // radicals only; "" for phonetics
  "lookAlike":   false
}
```

### `data/kanji.json` — full record (panel source of truth)

Common fields: `{ id, type, word, reading, meaning, level, tags[], lookAlike, note,
lookup, explanation }`.

- **`lookup`** = a *pronounceable* string for external links (a bare radical 亻 is not a
  word): radical → parent `base` kanji; phonetic → the showcase `example.word`.
- **`explanation`** = the pre-built GFM markdown rendered in the panel (see §5).

Radical-only fields:
```jsonc
{ "base": "示", "name": "しめすへん",
  "position": { "name": "hen", "side": "left" },
  "examples": [ { "kanji": "神社", "kana": "じんじゃ", "gloss": "shrine" }, … ] }
```
Phonetic-only fields:
```jsonc
{ "onyomi": ["ジ","シ"], "reliability": "strong-rogue",
  "family":  [ { "kanji": "持" }, { "kanji": "時" }, … ],   // glyphs (+ gloss for rock-solid; see decisions)
  "rogues":  [ { "kanji": "待", "reading": "タイ" }, { "kanji": "特", "reading": "トク" } ],
  "spread":  [ { "reading": "ボ", "members": ["墓","暮","慕","募"] }, … ],  // cluster/unreliable only
  "example": { "word": "時間", "reading": "じかん", "meaning": "time" } }
```

### 3.1 The five required reveal fields → where each comes from

| Required reveal | Radical card | Phonetic card |
|---|---|---|
| meaning of the radical | `meaning` (CSV `meaning`) | — |
| words the radical is used in | `examples[]` table | — |
| meaning of the phonetic group | — | **see Decision B** (reading + tier behaviour + example, *or* authored gloss) |
| how the pronunciation is | — | `onyomi` / `reading` + reliability tier |
| similar phonetic groupings | — | `family[]` (+ `spread[]` for cluster/unreliable, `rogues[]` for strong-rogue) |

---

## 4. Build pipeline — `tools/build.py`

A zero-dependency Python 3 stdlib script (chosen because the quoted `back` column has
embedded commas that `csv.DictReader` handles for free; `hashlib.sha1(...).hexdigest()[:8]`
is byte-identical to Node's `createHash('sha1')…slice(0,8)`).

**Responsibilities**
1. Read both CSVs as `utf-8-sig` (strips Excel BOM); assert headers match.
2. Parse the messy fields:
   - `example_words` `休む(やすむ rest)・…` → `[{kanji,kana,gloss}]` via regex; **full-width parens normalized**.
   - `family` `泊・拍・…` → glyph list; for **rock-solid** also parse member glosses from `back` (`泊(lodge)`).
   - `reading` / `rogue` split on `／` **and** `/`, rejoined canonically with `／`.
   - `tags` split on `;`; `blacklist` → `unreliable`.
   - `position` `hen (left)` → `{name, side}`.
   - `note` = prose tail after the word/family list (keeps ⚠️ cautions; chip stays tag-driven).
3. Derive `word` = `rawGlyph` with `(左)/(右)` stripped; keep `rawGlyph` only as the hash seed.
4. For the **2 tofu glyphs** (⻊→足, ⺮→竹): set hero `word` = `base`, combining form goes to the subtitle/explanation.
5. Assign `id`, assert **uniqueness** (fail loud on collision).
6. `rec["explanation"] = build_explanation(rec)` (delegated to `tools/explain.py`).
7. Sort by `id`; write `data/kanji.json` (full) and `data/index.json` (light projection),
   `ensure_ascii=False, indent=2` for readable diffs.
8. **Validation asserts** (fail the build, don't ship bad data):
   - every light record has all 9 keys, none `undefined`;
   - for cluster/unreliable: `union(spread.members) == set(family)` *(this catches 各 dropping 閣)*;
   - look-alike tag rows have a `note`.

**Re-run loop** (documented in DEVELOPERS.md):
```bash
python3 tools/build.py            # → data/kanji.json + data/index.json
git diff data/                    # only edited/added cards change (stable ids)
git add tools/*.csv data/ && git commit -m "Refresh cards" && git push
```
Idempotent: ids depend only on `type`+glyph, output is sorted by id, no clocks/RNG/network.
A `--check` mode (build in memory, exit 1 on diff) can guard CI.

---

## 5. Explanation markdown templates — `tools/explain.py`

Pre-rendered at build time into `explanation`; the panel renders it with the **same**
marked→DOMPurify path and the **existing** `.panel` CSS (`##`→Mincho H2, `###`→mono teal
labels, `**bold**`→green, tables→gold headers). **No blockquotes** (ichigo's CSS has no
`blockquote` rule). One fixed H2 form: `## {word} — {reading}`. English glosses wrapped in
`<span lang="en">…</span>` so iOS TTS switches voices (DOMPurify keeps `lang`).

**Radical** (rendered example, 礻):
```md
## 礻 — しめすへん

- **Type**: 部首 radical · hen (left)
- **Meaning**: divine / ritual
- **Standalone form**: 示
- **JLPT**: N3

### Words that use 礻
| Word | Reading | Meaning |
|---|---|---|
| 神社 | じんじゃ | shrine |
| 祝う | いわう | celebrate |
| 礼 | れい | courtesy |
| 福 | ふく | fortune |

### ⚠️ Look-alike
One dot — don't confuse with 衤 (ころもへん).
```

**Phonetic** (rendered example, 寺 · strong-rogue):
```md
## 寺 — ジ／シ  🟡

- **Type**: 形声 phonetic (sound component)
- **Lends the reading**: ジ／シ
- **Reliability**: 🟡 Strong — reliable except 1–2 rogues
- **JLPT**: N4

### Family — kanji that take this sound
持・時・侍・詩

### ⚠️ Rogues (don't take the reading)
| Kanji | Reading |
|---|---|
| 待 | タイ |
| 特 | トク |

### Example
時間 (じかん) — time
```

Cluster/unreliable cards render a **Reading → Members** table from `spread[]` instead of a
flat family line, with the tier headline making the "don't predict" semantics explicit
(🔴 unreliable: "scatters — learn each per word").

---

## 6. Site — index.html / style.css / app.js

- **index.html**: ichigo structure with a glyph hero. New: an eyebrow `#kind` segment
  (`今日の部首` / `今日の形声`, teal for 部首 / gold for 形声) and a JS-built `.badge-row`
  (reliability badge + look-alike chip). Adapted `<title>`/OG/Twitter/canonical/
  `theme-color` for the new path. **CSP unchanged** (badges are JS-created elements, never
  inline styles → sanitizer/CSP-safe).
- **style.css**: the ichigo `:root` + `.word/.reading/.panel/.meta` + animations **verbatim**,
  plus ~40 lines for `.badge`, `.chip`, `.badge-pos` mapped to existing tokens:
  rock-solid→`--green`, strong-rogue→`--gold`, cluster→`--teal`, unreliable→`--lit`,
  look-alike→`--lit` chip. Every badge carries **icon + text** (never colour alone);
  neutral-chip border brightened to meet the 3:1 UI-contrast minimum.
- **app.js**: ichigo logic almost verbatim. The only type-aware branches:
  (1) set `#kind` + build the `.badge-row` from the light record's `type`/`reliability`/
  `position`/`lookAlike`; (2) a per-type `card-links` footer — radical → Jisho (the
  `base` kanji) + a radical reference; phonetic → Jisho + Forvo on the **example word**
  (`lookup`), with the bare component as a best-effort secondary link.
  Add a `typeof DOMPurify` guard so a CDN/SRI failure degrades to escaped text instead of
  throwing on first tap.

### Accessibility (resolved gaps)
- A **focusable "別の字へ" shuffle button** is **required** (not optional) so a new card is
  reachable by keyboard/AT; double-tap stays as a pointer enhancement. Move focus to `#word`
  after a shuffle so AT announces the change.
- `aria-expanded` on the glyph button; `:focus-visible` ring; `lang="ja"` root with
  `lang="en"` spans on glosses; `prefers-reduced-motion` already disables animations.
- Reliability conveyed by **emoji + text label**, never a bare dot.

---

## 7. Scriptable widget — `widget/ichinichi-ichijiku.js`

Same shape as ichigo's widget: `loadJSON(index.json)` → sort by id → `i = epochDay % N` →
render in the 紺 theme → `widget.url = BASE + "/#" + w.id` → refresh ~hourly. Deltas:

- Eyebrow: text `一日一字` (no fig *emoji* exists — the fig is an SVG/PNG asset, not a
  glyph); optionally load `assets/fig.png` as a small top image for the mark.
- Glyph: `w.word` (HiraMinProN-W6 ~40, `minimumScaleFactor` 0.4, `lineLimit` 1).
- Subtitle: `w.reading` (Menlo 13, rose) — **add `minimumScaleFactor`/`lineLimit`** so long
  readings like `カク／ラク／ロ／リャク` don't overflow.
- A small marker line: `🟢 rock-solid` (phonetic) or `部首 · hen` (radical), from the light
  fields — text + icon, never colour alone.
- Foot: `第 (i+1) 日` (gray Menlo 10.5).

---

## 8. Branding & naming

- Repo `ichinichi-ichijiku`; title **一日一字（く）**; URL `…/ichinichi-ichijiku`.
- **Brand mark — RESOLVED: a fig** (`assets/fig.svg`, a cut-fig icon on a solid 紺
  `#11213f` background), honoring いちじく＝無花果(fig), the fruit-pun cousin of ichigo's 🍓.
  Already in the README H1.
- **Where it appears:** README H1 (✓) · site eyebrow as an inline
  `<img src="assets/fig.svg" width="18">` before `一日一字` · `<title>`/`document.title`
  text-only (`一日一字（く） — One kanji a day`) · favicon + OG/Twitter `image` from a
  rasterized `assets/fig.png` · widget eyebrow text `一日一字` (optionally a small
  `assets/fig.png`, since Scriptable can't render SVG).
- Eyebrow kind segment: `今日の部首` (teal) / `今日の形声` (gold).

---

## 9. Deployment

1. Scaffold files → commit → push to `main` (repo already exists, public).
2. GitHub **Settings → Pages → Deploy from branch → `main` / root**.
3. Verify https://vbkmr.github.io/ichinichi-ichijiku loads, a card reveals, deep-link
   `/#<id>` pins a card, `?open` auto-reveals.
4. Paste `widget/ichinichi-ichijiku.js` into Scriptable, set **When Interacting → Open URL**.
5. `analytics.js`: GA4 loader copied from ichigo; **`MEASUREMENT_ID = "G-CJ7YBPYZ2F"`**
   (set). Goes live once `index.html` references it under the GA-permitting CSP; stays
   dormant on localhost. The CSP **must** include the GA allowances (copied from ichigo):
   `script-src … https://www.googletagmanager.com`, `connect-src … https://*.google-analytics.com
   https://*.analytics.google.com https://www.googletagmanager.com`, and
   `img-src … https://*.google-analytics.com https://*.googletagmanager.com`.
6. README mirrors ichigo (intro, screenshots, widget setup, **privacy note**: the repo +
   site are public, so every field in `data/kanji.json` is publicly readable).

> **External-service note:** GA4 and the jsDelivr CDN are the only third-party calls, and
> both are already used by ichigo — no new external service is introduced.

---

## 10. Verified facts (sanity-checked against the real CSVs)

- 95 cards (34 radical + 61 phonetic); `sha1("{type}:{glyph}")[:8]` → **0 collisions**;
  reproduces 亻→`69bce705`, 白→`93c39b00`, 寺→`3310cdc4`.
- Only `阝(左)/阝(右)` carry parens (distinct ids `e8b9b7c1`/`598841e1`).
- `⚠️`-in-`back` ≠ look-alike on **21 rows** → chip must use the tag.
- Tofu glyphs: exactly ⻊ (→足) and ⺮ (→竹).
- `各` spread in prose drops 閣 that `family` keeps → spread authored + asserted.

---

## 11. Open decisions (my recommendation in **bold**; confirm or override)

*Resolved:* brand mark = **fig** (`assets/fig.svg`) · Google Analytics = **`G-CJ7YBPYZ2F`**
(`analytics.js` pushed). A multi-lens review of this plan is running; I'll fold its verified
suggestions in and finalize B/C/D when it lands.
- **B — "Meaning of the phonetic group"**: phonetic components carry *sound, not meaning*.
  Either **(B1, recommended)** redefine the reveal as *the on'yomi it lends + its
  reliability behaviour + family + example* (no extra authoring), or **(B2)** author a
  short semantic gloss for each of the 61 phonetics (richer, ~61 lines of new content).
- **C — Family/spread richness**: **(C1, recommended)** author a `spread` column for the 8
  cluster/unreliable rows + parse rock-solid member glosses from `back` (richest panels,
  small authoring), or **(C2)** ship glyph-only families + tier semantics (simplest now).
- **D — Build runtime**: Python 3 stdlib (recommended) vs Node `.mjs` (one runtime across
  both repos, needs a small hand-rolled CSV parser).

---

## 12. Implementation phases

0. **Repo + brand + GA — ✓ done**: public repo; README H1 with the fig mark; `assets/fig.svg`;
   `analytics.js` (`G-CJ7YBPYZ2F`).
1. **Build pipeline** — `tools/build.py` + `tools/explain.py`; move CSVs into `tools/`;
   generate `data/{index,kanji}.json`; all asserts pass.
2. **Site** — `index.html` + `style.css` (theme verbatim + badges) + `app.js` (2 branches +
   required shuffle button + DOMPurify guard).
3. **Widget** — `widget/ichinichi-ichijiku.js`.
4. **Meta/deploy** — `analytics.js`, `README.md`, `DEVELOPERS.md`, `.gitignore`; enable
   Pages; verify sync + deep-link + reveal; capture screenshots.

---

## 13. Learning-design enhancements (suggested — beyond the brief)

The brief delivers passive daily *exposure*. These additions turn it into a *study tool*
while keeping the no-framework / deterministic-daily / widget-sync constraints intact.
Ranked by learning-impact ÷ effort. **Bold # = recommended for v1.**

| # | Enhancement | Why it helps learning | Cost / touches |
|---|---|---|---|
| **1** | **Active recall** — the collapsed card is already a prompt (the CSV `front` is "亻 → ?"). Show the glyph + a typed question ("what does this radical mean?" / "what reading does this lend?"), think, *then* tap to reveal. | Retrieval practice is the biggest driver of retention; tap-to-reveal already supports it — we just frame it as a self-test. | v1, ~free. Uses existing `front`. No data change. |
| **2** | **形声 framing + radical↔phonetic links** — teach the rule *kanji = radical(meaning) + phonetic(sound)*; on a phonetic card frame members as "same sound 白=ハク, radical shifts meaning" (泊 氵→lodge · 拍 扌→beat); link a member's radical to its radical card when we have one. | The project's *unique* payoff: turns 95 isolated facts into one connected reading system + a transferable decoding skill. Also the cleanest answer to Decision B. | v1 = framing text + a README "how to read an unknown kanji" guide (free). v2 = per-member decomposition needs an external component set (KRADFILE/KanjiVG) → **may need External Service Review** (bundled static file, not an API). |
| **3** | **Audio** — a 🔊 button speaking the reading / example via the browser `speechSynthesis` (ja-JP); keep the Forvo link for human audio. | Couples on'yomi to sound for auditory memory — the whole point of phonetic groups. | v1, cheap, CSP-safe (no network). Degrade if no ja voice. |
| **4** | **Rogue-as-hook** — strong-rogue cards spotlight the 1–2 ⚠️ exceptions as *the* thing to remember; optional micro-quiz ("which one does NOT take ジ/シ?"). | The exception is the memory anchor (per the cheatsheet); foregrounding it is high-yield. | v1, data present (`rogues[]`). |
| 5 | **Self-rating + spaced review** — after reveal, "✓ knew it / ↻ review" store per-card stats in `localStorage`; an optional `?study` mode biases the shuffle toward not-known / due cards (Leitner-lite). | Spacing + active recall = durable memory; lets keen learners drill past one-a-day. | v2. `localStorage` only — **daily card + widget sync untouched**; no backend/framework. |
| 6 | **Progress + streak** — "🔥 N-day streak" and "X / 95 groups seen" meter. | Motivates the daily habit the whole app is built on. | v2, `localStorage` only. |
| 7 | **Look-alike pair view** — confusables side-by-side (礻/衤, 囗/口, 复/復/複/腹) with the distinguishing stroke highlighted. | Targets the exact visual-confusion errors learners make. | v2, mostly from `note`; the paired glyph is small authoring. |
| 8 | **Transfer test** — on a phonetic card, show an *unseen* kanji using that phonetic and ask the learner to predict its reading before revealing. | Practising on novel items proves the rule generalised, not memorised. | v2, needs a few held-back test kanji per phonetic. |
| 9 | **Goal-directed paths** — optional "rock-solid first" / "N5→N1" ordering, *separate* from the deterministic daily order (which stays for variety + sync). | Lets learners study by ROI or exam level. | v2, `?tier`/`?level` filter; must not alter the daily/widget pick. |

**Recommended v1 bundle:** #1 active recall, #2 形声 framing + README strategy guide,
#3 audio, #4 rogue-as-hook — all cheap, no data-model or sync risk, and squarely on the
kanji-learning objective. Everything else is a clean v2 once the core ships.

> **Constraints honoured:** none of the v1 items add a framework, change the deterministic
> daily pick, or break site⇄widget sync. The only items needing new *data* are #2-v2
> (external decomposition set — flag for External Service Review), #7 (a paired glyph), and
> #8 (held-back test kanji).
