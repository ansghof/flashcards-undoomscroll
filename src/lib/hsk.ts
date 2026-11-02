import type { Card } from "./deck";

export type HskVersion = "2" | "3";

/** [hanzi, pinyin, German answers, HSK 2.0 level, HSK 3.0 level]; level 0 = not in that version. */
export type HskRow = [string, string, string[], number, number];

export interface HskData {
  source: string;
  /** Sorted by word frequency, most common first. */
  words: HskRow[];
}

export interface LevelInfo {
  level: number;
  label: string;
}

export const HSK_LEVELS: Record<HskVersion, LevelInfo[]> = {
  "2": [1, 2, 3, 4, 5, 6].map((level) => ({ level, label: String(level) })),
  // The 2026 syllabus lumps the advanced levels together.
  "3": [...[1, 2, 3, 4, 5, 6].map((level) => ({ level, label: String(level) })), { level: 7, label: "7–9" }],
};

export function levelOf(row: HskRow, version: HskVersion): number {
  return version === "2" ? row[3] : row[4];
}

export function hskCards(data: HskData, version: HskVersion, levels: number[]): Card[] {
  const cards: Card[] = [];
  data.words.forEach((row, rank) => {
    if (levels.includes(levelOf(row, version))) {
      cards.push({ id: row[0], hanzi: row[0], pinyin: row[1], de: row[2], rank });
    }
  });
  return cards;
}

/** Own words come first and replace an HSK card with the same hanzi. */
export function buildDeck(hsk: Card[], custom: Card[]): Card[] {
  const own = new Set(custom.map((c) => c.hanzi));
  return [...custom.map((c) => ({ ...c, rank: -1 })), ...hsk.filter((c) => !own.has(c.hanzi))];
}
