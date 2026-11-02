// Builds src/decks/hsk.json from two open datasets:
//   - HSK word lists + pinyin: drkameleon/complete-hsk-vocabulary (MIT)
//   - German glosses: HanDeDict (CC BY-SA 2.0)
// Downloads are cached in .cache/. Run: npm run decks
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const SOURCES = {
  hsk: "https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json",
  handedict: "https://raw.githubusercontent.com/gugray/HanDeDict/master/handedict.u8",
};
const MAX_SENSES = 4;
const MAX_ANSWERS = 6;
/** Readings the heuristics below get wrong (checked by hand for HSK 1–3). */
const READING_OVERRIDES = { 没: "mei2", 角: "jiao3", 难: "nan2" };

async function cached(name, url) {
  mkdirSync(".cache", { recursive: true });
  const path = `.cache/${name}`;
  if (!existsSync(path)) {
    console.log(`downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return readFileSync(path, "utf8");
}

/** Pinyin key for matching: lowercase, no spaces, ü as v, neutral tone dropped. */
function pinyinKey(s) {
  return s.toLowerCase().replace(/u:|ü/g, "v").replace(/[\s05]/g, "");
}

function acceptable(t) {
  return (
    t.length > 0 &&
    t.length <= 32 &&
    t.split(" ").length <= 4 &&
    !/[\d=:?!"„“…~]/.test(t) &&
    !/[㐀-鿿]/.test(t) &&
    !/^(ZEW|Radikal|Abk|Name|Familienname|Nachname|vgl|siehe|Variante|Suffix|Präfix|Partikel|Kurzform)/i.test(t)
  );
}

/** "sehen; schauen (V); Bsp.: 看书 -- ein Buch lesen" -> ["sehen", "schauen"] */
function glossesOf(sense) {
  let s = sense.split(/;\s*Bsp\.:/)[0];
  for (let i = 0; i < 3; i++) s = s.replace(/\([^()]*\)/g, "");
  s = s.replace(/\[[^\]]*\]/g, "");
  return s
    .split(/[;,]/)
    .map((t) => t.replace(/\s+/g, " ").trim().replace(/ (Adj|Adv|V|S)$/, ""))
    .filter(acceptable);
}

// HSK parts of speech (ICTCLAS letters) -> HanDeDict sense tags. Lenient,
// because the two classify differently: HanDeDict tags 怎么 "wie", 这里 "hier"
// and 所以 "deshalb" as (Adv), and German often renders Chinese adverbs as
// verbs (必须 "müssen"). Compound codes (vn, ad, mq) take every letter's tags.
const LETTER_TAGS = {
  v: ["V"], n: ["S"], s: ["S", "Adv"], t: ["S", "Adv"], f: ["S", "Adv", "P"],
  a: ["Adj", "Adv"], b: ["Adj"], d: ["Adv", "Adj", "V"],
  r: ["Pron", "A", "Adv", "Adj", "S"], m: ["Num", "Adj", "Pron"], q: ["Zähl", "S"],
  p: ["P", "Präp", "Konj"], c: ["Konj", "Adv", "P"], e: ["Int"], y: ["Int"],
};
const KNOWN_TAGS = new Set(Object.values(LETTER_TAGS).flat());

function posTags(code) {
  return [...new Set([...code].flatMap((c) => LETTER_TAGS[c] ?? []))];
}

/** Word-class tags of a sense: "halten, greifen (V)" -> ["V"]; "Erde (S, Agrar)" -> ["S"]. */
function tagsOf(sense) {
  const head = sense.split(/;\s*Bsp\.:/)[0];
  return [...head.matchAll(/\(([^()]*)\)/g)]
    .flatMap((m) => m[1].split(",").map((t) => t.trim()))
    .filter((t) => KNOWN_TAGS.has(t));
}

/**
 * Senses in HSK part-of-speech order: 是 is a verb in HSK, so "sein (V)"
 * comes before the classical pronoun "dies (A)". Senses tagged with a word
 * class HSK doesn't list are dropped (打 "Dutzend", 被 "Bettdecke");
 * untagged senses stay, after the matching ones.
 */
function scoredSenses(senses, pos) {
  const wanted = pos.map(posTags);
  return senses
    .map((sense, i) => {
      const tags = tagsOf(sense);
      if (tags.length === 0) return { sense, score: 100, i };
      // Earlier HSK word class first, and within it the most direct tag (Adv for an adverb before V).
      let score = -1;
      wanted.forEach((w, p) => {
        const t = w.findIndex((tag) => tags.includes(tag));
        if (t !== -1 && score === -1) score = p * 10 + t;
      });
      return { sense, score, i };
    })
    .filter((s) => s.score !== -1 || pos.length === 0)
    .sort((a, b) => a.score - b.score || a.i - b.i);
}

function rankSenses(senses, pos) {
  return scoredSenses(senses, pos).map((s) => s.sense);
}

/** Best (lowest) score of a sense that yields answers; Infinity if none does. */
function fit(senses, pos) {
  return scoredSenses(senses, pos).find((s) => glossesOf(s.sense).length > 0)?.score ?? Infinity;
}

function parseHanDeDict(text) {
  const bySimplified = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("#")) continue; // older revisions of an entry
    const m = /^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/\s*$/.exec(line);
    if (!m) continue;
    const [, , simplified, pinyin, body] = m;
    const entries = bySimplified.get(simplified) ?? [];
    entries.push({ pinyin: pinyinKey(pinyin), senses: body.split("/") });
    bySimplified.set(simplified, entries);
  }
  return bySimplified;
}

function minLevel(tags, prefix) {
  const levels = tags.filter((t) => t.startsWith(prefix)).map((t) => Number(t.slice(prefix.length)));
  return levels.length ? Math.min(...levels) : 0;
}

const hsk = JSON.parse(await cached("complete.json", SOURCES.hsk));
const dict = parseHanDeDict(await cached("handedict.u8", SOURCES.handedict));

const words = [];
const missing = { 2: 0, 3: 0 };
for (const w of hsk) {
  // old-N: HSK 2.0; newest-N: HSK 3.0 as of the 2026 syllabus (7 = levels 7–9).
  const l2 = minLevel(w.level, "old-");
  const l3 = minLevel(w.level, "newest-");
  if (!l2 && !l3) continue;
  // Structural particles (的, 地, 得, 着, 过) have no German equivalent, and
  // their other readings (的 dì "Ziel") would teach the wrong word.
  if (w.pos[0] === "u") {
    if (l2) missing[2]++;
    if (l3) missing[3]++;
    continue;
  }

  // Polyphones (看 kān/kàn, 更 gēng/gèng): the dataset lists readings
  // alphabetically, so prefer a reading with a usable sense of the HSK word
  // class, then the richest entry — the everyday reading has by far the most
  // senses and examples.
  const readings = w.forms.filter((f) => /^[a-zü]/.test(f.transcriptions.pinyin)); // capitalised = surname
  const all = (dict.get(w.simplified) ?? []).map((entry) => ({
    entry,
    form: readings.find((f) => pinyinKey(f.transcriptions.numeric) === entry.pinyin),
    fit: fit(entry.senses, w.pos),
    size: entry.senses.join("/").length,
  }));
  const matched = all.filter((c) => c.form);
  const override = READING_OVERRIDES[w.simplified];
  const candidates = (matched.length ? matched : all).sort(
    (a, b) =>
      (b.entry.pinyin === override) - (a.entry.pinyin === override) ||
      (a.fit === b.fit ? 0 : a.fit < b.fit ? -1 : 1) ||
      b.size - a.size,
  );
  const form = candidates[0]?.form ?? readings[0] ?? w.forms[0];

  // Glosses only from the chosen reading. A particle like 的 (de) has nothing
  // but explanations there; falling back to another reading would teach 的 as
  // dì "Ziel", so such words are left out instead.
  const reading = candidates[0]?.entry.pinyin;
  // Surname senses ("Xiang", "Lan") are just the pinyin capitalised.
  const surname = reading?.replace(/\d/g, "");
  const answers = [];
  for (const { entry } of candidates.filter((c) => c.entry.pinyin === reading)) {
    for (const sense of rankSenses(entry.senses, w.pos).slice(0, MAX_SENSES)) {
      for (const g of glossesOf(sense)) {
        if (g.toLowerCase() === surname) continue;
        if (answers.length < MAX_ANSWERS && !answers.some((a) => a.toLowerCase() === g.toLowerCase())) {
          answers.push(g);
        }
      }
    }
  }
  if (!answers.length) {
    if (l2) missing[2]++;
    if (l3) missing[3]++;
    continue;
  }
  words.push({ h: w.simplified, p: form.transcriptions.pinyin, d: answers, l2, l3, f: w.frequency });
}

words.sort((a, b) => a.f - b.f);
const out = {
  source: "HSK lists: complete-hsk-vocabulary (MIT). German: HanDeDict (CC BY-SA 2.0).",
  words: words.map(({ h, p, d, l2, l3 }) => [h, p, d, l2, l3]),
};
mkdirSync("src/decks", { recursive: true });
writeFileSync("src/decks/hsk.json", JSON.stringify(out));

const count = (v, l) => words.filter((w) => w[`l${v}`] === l).length;
console.log(`${words.length} words written; without German gloss: HSK2 ${missing[2]}, HSK3 ${missing[3]}`);
console.log("HSK 2.0 per level:", [1, 2, 3, 4, 5, 6].map((l) => count(2, l)).join(" "));
console.log("HSK 3.0 per level:", [1, 2, 3, 4, 5, 6, 7].map((l) => count(3, l)).join(" "));
