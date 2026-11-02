import type { Card } from "./deck";

export type Direction = "zh-de" | "de-zh";

const ARTICLE = /^(der|die|das)\s+/;
const UMLAUTS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

function base(s: string): string {
  return s.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeGerman(s: string, strict: boolean): string {
  let t = base(s).replace(/[.!?,;:]+$/, "");
  if (!strict) {
    t = t.replace(ARTICLE, "").replace(/[äöüß]/g, (c) => UMLAUTS[c]);
  }
  return t;
}

/** Hanzi compare: whitespace and punctuation don't matter, characters do. */
export function normalizeHanzi(s: string): string {
  return s.normalize("NFC").replace(/[\s\p{P}]/gu, "");
}

/** The form shown as "the" answer, which must be copied after a miss. */
export function expectedAnswer(card: Card, dir: Direction): string {
  return dir === "zh-de" ? card.de[0] : card.hanzi;
}

export function checkAnswer(card: Card, dir: Direction, input: string, strict: boolean): boolean {
  if (dir === "de-zh") {
    const answer = normalizeHanzi(input);
    return answer !== "" && answer === normalizeHanzi(card.hanzi);
  }
  const answer = normalizeGerman(input, strict);
  return answer !== "" && card.de.some((d) => normalizeGerman(d, strict) === answer);
}

/**
 * Copy check for the 3× penalty: exactly the shown form, article included.
 * Only case and surrounding/double whitespace are forgiven, because mobile
 * keyboards don't capitalise reliably.
 */
export function checkCopy(expected: string, input: string, dir: Direction): boolean {
  if (dir === "de-zh") return normalizeHanzi(input) === normalizeHanzi(expected);
  return base(input) === base(expected);
}
