export interface Card {
  /** The hanzi; progress is stored per id, so own words and HSK words share it. */
  id: string;
  hanzi: string;
  /** Display-only hint, never accepted as an answer. May be empty for own words. */
  pinyin: string;
  /** Accepted German answers; the first one is shown as "the" answer. */
  de: string[];
  /** Order in which new cards are introduced (lower first); own words are -1. */
  rank?: number;
}

export function makeCard(hanzi: string, pinyin: string, de: string[]): Card {
  return { id: hanzi, hanzi, pinyin, de };
}
