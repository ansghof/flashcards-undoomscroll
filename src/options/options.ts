import { loadHsk } from "../lib/active-deck";
import { makeCard, type Card } from "../lib/deck";
import { HSK_LEVELS, levelOf, type HskData, type HskVersion } from "../lib/hsk";
import { mergeCards, parseWordList, splitAnswers, toCsv } from "../lib/importer";
import { getCustomCards, getSettings, setCustomCards, updateSettings, type Settings } from "../lib/store";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const versionSelect = $<HTMLSelectElement>("hsk-version");
const levelsBox = $<HTMLDivElement>("levels");
const hanziInput = $<HTMLInputElement>("hanzi");
const pinyinInput = $<HTMLInputElement>("pinyin");
const germanInput = $<HTMLInputElement>("german");
const saveButton = $<HTMLButtonElement>("save");
const cancelButton = $<HTMLButtonElement>("cancel");
const formNote = $<HTMLSpanElement>("form-note");
const filterInput = $<HTMLInputElement>("filter");
const fileInput = $<HTMLInputElement>("import-file");

let hsk: HskData;
let settings: Settings;
let custom: Card[] = [];
/** Hanzi of the word being edited, if any. */
let editing: string | null = null;

function say(text: string): void {
  $("status").textContent = text;
}

// ---- HSK ----

function renderLevels(): void {
  const version = settings.hskVersion;
  const counts = new Map<number, number>();
  for (const row of hsk.words) {
    const level = levelOf(row, version);
    if (level) counts.set(level, (counts.get(level) ?? 0) + 1);
  }

  levelsBox.replaceChildren(
    ...HSK_LEVELS[version].map(({ level, label }) => {
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = settings.hskLevels.includes(level);
      box.addEventListener("change", async () => {
        const others = settings.hskLevels.filter((l) => l !== level);
        settings = await updateSettings({
          hskLevels: box.checked ? [...others, level].sort((a, b) => a - b) : others,
        });
        renderHskSummary();
      });
      const chip = document.createElement("label");
      chip.className = "level";
      const count = document.createElement("small");
      count.textContent = `${counts.get(level) ?? 0}`;
      chip.append(box, `Stufe ${label}`, count);
      return chip;
    }),
  );
  renderHskSummary();
}

function renderHskSummary(): void {
  const n = hsk.words.filter((row) => settings.hskLevels.includes(levelOf(row, settings.hskVersion))).length;
  const own = settings.customEnabled ? custom.length : 0;
  $("hsk-summary").textContent =
    n + own === 0
      ? "Nichts ausgewählt – es wird Stufe 1 abgefragt."
      : `${n} HSK-Wörter${own ? ` und ${own} eigene` : ""} werden abgefragt.`;
}

versionSelect.addEventListener("change", async () => {
  // Levels don't carry over between versions; start the new one at level 1.
  settings = await updateSettings({ hskVersion: versionSelect.value as HskVersion, hskLevels: [1] });
  renderLevels();
});

$<HTMLInputElement>("custom-enabled").addEventListener("change", async (e) => {
  settings = await updateSettings({ customEnabled: (e.target as HTMLInputElement).checked });
  renderHskSummary();
});

// ---- Own words ----

function renderWords(): void {
  const q = filterInput.value.trim().toLowerCase();
  const shown = custom.filter(
    (c) => !q || c.hanzi.includes(q) || c.pinyin.toLowerCase().includes(q) || c.de.some((d) => d.toLowerCase().includes(q)),
  );

  $("words").replaceChildren(
    ...shown.map((card) => {
      const tr = document.createElement("tr");
      const cell = (className: string, text: string, lang?: string) => {
        const td = document.createElement("td");
        td.className = className;
        td.textContent = text;
        if (lang) td.lang = lang;
        return td;
      };
      const edit = document.createElement("button");
      edit.className = "link";
      edit.textContent = "Bearbeiten";
      edit.addEventListener("click", () => startEdit(card));
      const remove = document.createElement("button");
      remove.className = "link";
      remove.textContent = "Löschen";
      remove.addEventListener("click", () => void removeWord(card.hanzi));
      const actions = document.createElement("td");
      actions.className = "actions-cell";
      actions.append(edit, remove);
      tr.append(cell("hanzi", card.hanzi, "zh-Hans"), cell("pinyin", card.pinyin), cell("de", card.de.join("; ")), actions);
      return tr;
    }),
  );
  $("empty").hidden = custom.length > 0;
  $("clear").hidden = custom.length === 0;
  renderHskSummary();
}

async function saveCustom(cards: Card[]): Promise<void> {
  custom = cards;
  await setCustomCards(custom);
  renderWords();
}

function resetForm(): void {
  editing = null;
  hanziInput.value = pinyinInput.value = germanInput.value = "";
  saveButton.textContent = "Hinzufügen";
  cancelButton.hidden = true;
  formNote.textContent = "";
}

function startEdit(card: Card): void {
  editing = card.hanzi;
  hanziInput.value = card.hanzi;
  pinyinInput.value = card.pinyin;
  germanInput.value = card.de.join("; ");
  saveButton.textContent = "Speichern";
  cancelButton.hidden = false;
  formNote.textContent = "";
  hanziInput.focus();
}

async function removeWord(hanzi: string): Promise<void> {
  await saveCustom(custom.filter((c) => c.hanzi !== hanzi));
  if (editing === hanzi) resetForm();
  say(`${hanzi} gelöscht.`);
}

// Known HSK words fill in pinyin and German, which stay editable.
hanziInput.addEventListener("change", () => {
  const hanzi = hanziInput.value.replace(/\s+/g, "");
  const row = hsk.words.find((r) => r[0] === hanzi);
  if (!row || pinyinInput.value || germanInput.value) return;
  pinyinInput.value = row[1];
  germanInput.value = row[2].join("; ");
  formNote.textContent = "Aus der HSK-Liste ergänzt – gern anpassen.";
});

$<HTMLFormElement>("word-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const hanzi = hanziInput.value.replace(/\s+/g, "");
  const answers = splitAnswers(germanInput.value);
  if (!/[㐀-鿿]/.test(hanzi)) {
    formNote.textContent = "Bitte chinesische Schriftzeichen eingeben.";
    return;
  }
  if (answers.length === 0) {
    formNote.textContent = "Bitte mindestens eine deutsche Bedeutung eingeben.";
    return;
  }
  const card = makeCard(hanzi, pinyinInput.value.trim(), answers);
  const rest = editing && editing !== hanzi ? custom.filter((c) => c.hanzi !== editing) : custom;
  const existed = custom.some((c) => c.hanzi === hanzi);
  await saveCustom(mergeCards(rest, [card]));
  say(editing ? `${hanzi} gespeichert.` : existed ? `${hanzi} aktualisiert.` : `${hanzi} hinzugefügt.`);
  resetForm();
  hanziInput.focus();
});

cancelButton.addEventListener("click", resetForm);
filterInput.addEventListener("input", renderWords);

$("import").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (!file) return;
  const { cards, skipped } = parseWordList(await file.text());
  await saveCustom(mergeCards(custom, cards));
  const lines = skipped.length > 5 ? `${skipped.slice(0, 5).join(", ")} …` : skipped.join(", ");
  say(
    `${cards.length} Wörter importiert.` +
      (skipped.length ? ` ${skipped.length} Zeilen übersprungen (Zeile ${lines}).` : ""),
  );
});

$("export").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([toCsv(custom)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "undoomscroll-woerter.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$("clear").addEventListener("click", async () => {
  if (!confirm(`Alle ${custom.length} eigenen Wörter löschen? Exportiere sie vorher, wenn du sie behalten willst.`)) return;
  await saveCustom([]);
  resetForm();
  say("Alle eigenen Wörter gelöscht.");
});

async function init(): Promise<void> {
  [hsk, settings, custom] = await Promise.all([loadHsk(), getSettings(), getCustomCards()]);
  versionSelect.value = settings.hskVersion;
  $<HTMLInputElement>("custom-enabled").checked = settings.customEnabled;
  renderLevels();
  renderWords();
}

void init();
