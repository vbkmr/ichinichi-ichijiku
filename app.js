// 一日一字（く） — site logic. Inherited from ichinichi-ichigo, adapted for a merged
// radical + phonetic pool.
// • A widget deep-link (/#<id>) shows that exact card and keeps it on refresh — so the
//   widget's daily card and the site stay in sync.
// • A plain visit shows a random card; a double-tap (or a refresh) shows a new one.
// • Single tap reveals/folds the breakdown.
const $ = (s) => document.querySelector(s);
const sortById = (a, b) => a.id.localeCompare(b.id);
const HINT_CLOSED = "tap to reveal · double-tap for a new 字";
const HINT_OPEN = "tap again to fold";

const TIER_BADGE = {
  "rock-solid": ["🟢", "rock-solid", "badge--rock-solid"],
  "strong-rogue": ["🟡", "strong-rogue", "badge--strong-rogue"],
  "cluster": ["🔵", "cluster", "badge--cluster"],
  "unreliable": ["🔴", "unreliable", "badge--unreliable"],
};

(async () => {
  const word = $("#word"), panel = $("#panel"), reading = $("#reading"),
    question = $("#question"), kind = $("#kind"),
    hint = $("#hint"), progress = $("#progress");

  let index;
  try {
    index = (await (await fetch("data/index.json")).json()).sort(sortById);
  } catch {
    word.textContent = "…";
    hint.textContent = "couldn't load the card list";
    return;
  }
  if (!index.length) {
    word.textContent = "字";
    hint.textContent = "no cards yet";
    return;
  }

  // ── daily streak (localStorage only; never affects the daily pick) ──
  const STREAK_KEY = "ichijiku.streak";
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const daysApart = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
  const streak = (() => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STREAK_KEY)); } catch { /* ignore */ }
    const today = todayStr();
    if (!s || !s.last) s = { last: today, count: 1 };
    else {
      const d = daysApart(s.last, today);
      if (d === 1) { s.count += 1; s.last = today; }       // visited yesterday → extend
      else if (d > 1) { s.count = 1; s.last = today; }      // gap → reset
      else s.last = today;                                  // same day / clock skew → keep
    }
    try { localStorage.setItem(STREAK_KEY, JSON.stringify(s)); } catch { /* ignore */ }
    return s.count;
  })();
  function renderProgress() {
    if (progress) progress.textContent = `🔥 ${streak} 日連続`;
  }

  let full = null;
  let current = null;

  const randomIndex = (exclude) => {
    if (index.length === 1) return 0;
    let i;
    do {
      i = Math.floor(Math.random() * index.length);
    } while (i === exclude);
    return i;
  };

  const promptFor = (e) =>
    e.type === "radical" ? "この部首の意味は？" : "どんな読み？";

  function fold() {
    panel.classList.add("hidden");
    word.setAttribute("aria-expanded", "false");
    question.classList.remove("hidden");
    // phonetic cards quiz the reading, so keep it hidden on the folded face
    reading.hidden = current.type === "phonetic";
    hint.textContent = HINT_CLOSED;
  }

  function show(entry) {
    current = entry;
    word.textContent = entry.word;
    word.setAttribute(
      "aria-label",
      (entry.type === "radical" ? "Radical " : "Phonetic component ") + entry.word + ", tap to reveal",
    );
    reading.textContent = entry.reading || "";
    kind.textContent = entry.type === "radical" ? "今日の部首" : "今日の形声";
    kind.className = entry.type === "radical" ? "kind--radical" : "kind--phonetic";
    question.textContent = promptFor(entry);
    document.title = `${entry.word} — 一日一字（く）`;
    fold();
  }

  function badgeRow(rec) {
    const row = document.createElement("div");
    row.className = "badge-row";
    if (rec.type === "phonetic" && TIER_BADGE[rec.reliability]) {
      const [emoji, label, cls] = TIER_BADGE[rec.reliability];
      const b = document.createElement("span");
      b.className = "badge " + cls;
      b.setAttribute("lang", "en");
      b.textContent = `${emoji} ${label}`;
      row.appendChild(b);
    }
    if (rec.type === "radical" && rec.position) {
      const b = document.createElement("span");
      b.className = "badge-pos";
      b.textContent = "部首 · " + (rec.position.name || rec.position);
      row.appendChild(b);
    }
    if (rec.lookAlike) {
      const c = document.createElement("span");
      c.className = "chip chip--look-alike";
      c.setAttribute("lang", "en");
      c.textContent = "⚠️ look-alike";
      row.appendChild(c);
    }
    return row.children.length ? row : null;
  }

  function cardLinks(rec) {
    const links = document.createElement("div");
    links.className = "card-links";
    const q = encodeURIComponent(rec.lookup || rec.word);
    const rows = [];
    if (rec.type === "radical") {
      rows.push(["📖 " + (rec.base || rec.word) + " on Jisho", `https://jisho.org/search/${q}`]);
      rows.push(["🧩 radicals on Jisho", `https://jisho.org/search/${encodeURIComponent("#kanji " + rec.word)}`]);
    } else {
      rows.push(["📖 " + ((rec.example && rec.example.word) || rec.word) + " on Jisho", `https://jisho.org/search/${q}`]);
      rows.push(["🔊 pronunciation (Forvo)", `https://forvo.com/word/${q}/#ja`]);
    }
    for (const [label, url] of rows) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", label.replace(/^[^\sA-Za-z]+\s*/, "") + " (opens in a new tab)");
      a.innerHTML = `<span>${label} ↗</span>`;
      links.appendChild(a);
    }
    return links;
  }

  async function reveal() {
    if (!panel.classList.contains("hidden")) {
      fold();
      return;
    }
    if (!full) {
      try {
        full = await (await fetch("data/kanji.json")).json();
      } catch {
        full = [];
      }
    }
    const w = full.find((e) => e.id === current.id) || current;
    const md = w.explanation || "*まだ説明がありません。*";
    // Sanitize before it touches the DOM. If a CDN/SRI failure left marked/DOMPurify
    // undefined, degrade to safe text instead of throwing or injecting raw markup.
    if (typeof DOMPurify !== "undefined" && typeof marked !== "undefined") {
      panel.innerHTML = DOMPurify.sanitize(marked.parse(md));
    } else {
      panel.textContent = md;
    }
    // wrap wide tables so they scroll inside the card instead of widening the page
    panel.querySelectorAll("table").forEach((t) => {
      const wrap = document.createElement("div");
      wrap.className = "table-wrap";
      t.replaceWith(wrap);
      wrap.appendChild(t);
    });
    const badges = badgeRow(w);
    if (badges) panel.insertBefore(badges, panel.firstChild);
    panel.appendChild(cardLinks(w));
    panel.classList.remove("hidden");
    word.setAttribute("aria-expanded", "true");
    question.classList.add("hidden");
    reading.hidden = false; // reveal the reading (the answer) on tap
    hint.textContent = HINT_OPEN;
  }

  const shuffle = () => show(index[randomIndex(index.indexOf(current))]);

  // initial card: widget deep-link is stable, a plain visit is random
  const start = index.find((e) => e.id === location.hash.slice(1));
  show(start || index[randomIndex(-1)]);
  renderProgress();
  if (new URLSearchParams(location.search).has("open")) queueMicrotask(reveal);

  // disambiguate single tap (reveal) from double tap (new card)
  let clickTimer = null;
  word.addEventListener("click", () => {
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      shuffle();
    } else {
      clickTimer = setTimeout(() => {
        clickTimer = null;
        reveal();
      }, 240);
    }
  });
})();
