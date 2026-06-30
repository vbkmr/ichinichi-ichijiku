// 一日一字（く） — daily kanji-group widget (Scriptable)
// Paste into a new Scriptable script, add a Scriptable home-screen widget, point it at
// this script, and set "When Interacting → Open URL" so a tap opens the site on the
// day's card. Shows one radical/phonetic group per day; a tap deep-links to it.
const BASE = "https://vbkmr.github.io/ichinichi-ichijiku";

const list = await new Request(`${BASE}/data/index.json`).loadJSON();
list.sort((a, b) => a.id.localeCompare(b.id)); // same fixed order as the site
const epochDay = Math.floor(Date.now() / 86400000); // changes once per day
const i = epochDay % list.length; // one card per day
const w = list[i];

const widget = new ListWidget();
widget.backgroundColor = new Color("#11213f"); // 紺 (dark card)
widget.setPadding(20, 20, 20, 20);

const eyebrow = widget.addText("一日一字");
eyebrow.font = new Font("Menlo", 11);
eyebrow.textColor = new Color("#f8b500"); // 山吹色

widget.addSpacer();

const word = widget.addText(w.word);
word.font = new Font("HiraMinProN-W6", 40); // 明朝 — Hiragino Mincho (on iOS)
word.textColor = new Color("#f0e8d6"); // 練色
word.minimumScaleFactor = 0.4;
word.lineLimit = 1;

widget.addSpacer(6);
const reading = widget.addText(w.reading || "");
reading.font = new Font("Menlo", 13);
reading.textColor = new Color("#f5b1aa"); // 珊瑚色
reading.minimumScaleFactor = 0.4; // long readings (カク／ラク／ロ／リャク) shrink, don't overflow
reading.lineLimit = 1;

// type + reliability/position marker — text + colour, never colour alone
const TIER = {
  "rock-solid": ["🟢", "#aacf53"],
  "strong-rogue": ["🟡", "#f8b500"],
  "cluster": ["🔵", "#5bb7c0"],
  "unreliable": ["🔴", "#f0937a"],
};
let markText, markColor;
if (w.type === "phonetic") {
  const t = TIER[w.reliability] || ["", "#a9adb0"];
  markText = `${t[0]} 形声 ${w.reliability || ""}`.trim();
  markColor = t[1];
} else {
  markText = `部首 · ${w.position || ""}`.trim();
  markColor = "#5bb7c0"; // 浅葱色
}
widget.addSpacer(6);
const mark = widget.addText(markText);
mark.font = new Font("Menlo", 10.5);
mark.textColor = new Color(markColor);
mark.minimumScaleFactor = 0.5;
mark.lineLimit = 1;

widget.addSpacer();
const foot = widget.addText(`第 ${i + 1} 日`);
foot.font = new Font("Menlo", 10.5);
foot.textColor = new Color("#a9adb0"); // 銀鼠

widget.url = `${BASE}/#${w.id}`; // tap opens the site on this card
widget.refreshAfterDate = new Date(Date.now() + 3600 * 1000); // ~hourly
Script.setWidget(widget);
Script.complete();
