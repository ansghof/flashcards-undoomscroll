import type { Card } from "./deck";
import type { Direction } from "./check";

export type Outcome = "correct" | "hinted" | "wrong";

export interface Progress {
  box: number;
  due: number;
}

export type ProgressMap = Record<string, Progress>;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Leitner boxes 1–5; index = box. A missed card (box 1) waits a minute, so it can't loop. */
export const BOX_INTERVALS = [0, MINUTE, 10 * MINUTE, HOUR, DAY, 3 * DAY];
export const MAX_BOX = 5;

export function progressKey(cardId: string, dir: Direction): string {
  return `${cardId}:${dir}`;
}

export interface Pick {
  card: Card;
  dir: Direction;
  key: string;
}

/** Share of prompts that introduce a new card while reviews are due. */
export const NEW_CARD_SHARE = 0.3;
/** New cards are drawn at random from this many of the most common unseen ones. */
const NEW_CARD_WINDOW = 5;

/**
 * Due reviews first (lowest box first, random within the box), mixed with
 * new cards in rank order (own words, then the most frequent HSK words).
 * With nothing due and nothing new, the card due soonest. `avoid` keeps the
 * same card from coming up twice in a row.
 */
export function pickCard(
  cards: Card[],
  dirs: Direction[],
  progress: ProgressMap,
  now: number,
  avoid?: string,
  rand: () => number = Math.random,
): Pick {
  const seen: (Pick & Progress)[] = [];
  const unseen: Pick[] = [];
  for (const card of cards) {
    for (const dir of dirs) {
      const key = progressKey(card.id, dir);
      if (key === avoid) continue;
      const p = progress[key];
      if (p) seen.push({ card, dir, key, ...p });
      else unseen.push({ card, dir, key });
    }
  }
  if (seen.length === 0 && unseen.length === 0) {
    // Only the avoided card exists.
    const card = cards.find((c) => dirs.some((d) => progressKey(c.id, d) === avoid))!;
    const dir = dirs.find((d) => progressKey(card.id, d) === avoid)!;
    return { card, dir, key: avoid! };
  }

  const due = seen.filter((c) => c.due <= now);
  const takeNew = unseen.length > 0 && (due.length === 0 || rand() < NEW_CARD_SHARE);
  if (takeNew) {
    const window = unseen.sort((a, b) => (a.card.rank ?? 0) - (b.card.rank ?? 0)).slice(0, NEW_CARD_WINDOW);
    return strip(window[Math.floor(rand() * window.length)]);
  }
  if (due.length === 0) return strip(seen.reduce((a, b) => (b.due < a.due ? b : a)));
  const lowest = Math.min(...due.map((c) => c.box));
  const pool = due.filter((c) => c.box === lowest);
  return strip(pool[Math.floor(rand() * pool.length)]);
}

function strip({ card, dir, key }: Pick): Pick {
  return { card, dir, key };
}

export function grade(prev: Progress | undefined, outcome: Outcome, now: number): Progress {
  const box = prev?.box ?? 1;
  const next = outcome === "wrong" ? 1 : outcome === "hinted" ? box : Math.min(MAX_BOX, box + 1);
  return { box: next, due: now + BOX_INTERVALS[next] };
}
