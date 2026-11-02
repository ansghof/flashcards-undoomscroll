import { makeCard, type Card } from "./deck";

const CJK = /[㐀-鿿豈-﫿]/;

export interface ImportResult {
  cards: Card[];
  /** Line numbers (1-based) that couldn't be read. */
  skipped: number[];
}

/** One CSV/TSV line; tabs win over commas (Anki exports use tabs). Handles "quoted, fields". */
function splitLine(line: string): string[] {
  const sep = line.includes("\t") ? "\t" : ",";
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field.trim() === "") {
      quoted = true;
      field = "";
    } else if (c === sep) {
      fields.push(field);
      field = "";
    } else field += c;
  }
  fields.push(field);
  return fields;
}

/** Anki fields may carry HTML. */
function clean(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "; ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitAnswers(s: string): string[] {
  return s
    .split(/[;/,]/)
    .map((a) => a.trim())
    .filter(Boolean);
}

/**
 * Reads "hanzi, pinyin, deutsch" or "hanzi, deutsch" per line (CSV or TSV,
 * also Anki's plain-text export). German alternatives are separated by ; / or ,
 * inside their field. A header line and #-comments are ignored.
 */
export function parseWordList(text: string): ImportResult {
  const cards: Card[] = [];
  const skipped: number[] = [];
  let first = true;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const fields = splitLine(line).map(clean);
    const header = first && !CJK.test(fields[0]);
    first = false;
    if (header) return;

    const [hanzi, pinyin, de] = fields.length >= 3 ? fields : [fields[0], "", fields[1] ?? ""];
    const answers = splitAnswers(de);
    if (!CJK.test(hanzi) || answers.length === 0) {
      skipped.push(i + 1);
      return;
    }
    cards.push(makeCard(hanzi.replace(/\s+/g, ""), pinyin, answers));
  });
  return { cards, skipped };
}

function csvField(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(cards: Card[]): string {
  const rows = cards.map((c) => [c.hanzi, c.pinyin, c.de.join("; ")].map(csvField).join(","));
  return ["hanzi,pinyin,deutsch", ...rows].join("\n") + "\n";
}

/** Adds or replaces (same hanzi) cards, keeping the existing order. */
export function mergeCards(existing: Card[], incoming: Card[]): Card[] {
  const byHanzi = new Map(existing.map((c) => [c.hanzi, c]));
  for (const c of incoming) byHanzi.set(c.hanzi, c);
  return [...byHanzi.values()];
}
