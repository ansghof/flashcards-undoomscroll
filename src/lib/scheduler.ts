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

/** Leitner boxes 1–5; index = box. Box 1 is always due. */
export const BOX_INTERVALS = [0, 0, 10 * MINUTE, HOUR, DAY, 3 * DAY];
export const MAX_BOX = 5;

export function progressKey(cardId: string, dir: Direction): string {
  return `${cardId}:${dir}`;
}

export interface Pick {
  card: Card;
  dir: Direction;
  key: string;
}

/**
 * Due cards first, lowest box first, random within that box. Unseen cards
 * count as box 1. `avoid` keeps the same card from coming up twice in a row.
 */
export function pickCard(
  cards: Card[],
  dirs: Direction[],
  progress: ProgressMap,
  now: number,
  avoid?: string,
  rand: () => number = Math.random,
): Pick {
  let all: (Pick & Progress)[] = [];
  for (const card of cards) {
    for (const dir of dirs) {
      const key = progressKey(card.id, dir);
      const p = progress[key] ?? { box: 1, due: 0 };
      all.push({ card, dir, key, ...p });
    }
  }
  if (all.length > 1) all = all.filter((c) => c.key !== avoid);

  const due = all.filter((c) => c.due <= now);
  if (due.length === 0) {
    return all.reduce((a, b) => (b.due < a.due ? b : a));
  }
  const lowest = Math.min(...due.map((c) => c.box));
  const pool = due.filter((c) => c.box === lowest);
  return pool[Math.floor(rand() * pool.length)];
}

export function grade(prev: Progress | undefined, outcome: Outcome, now: number): Progress {
  const box = prev?.box ?? 1;
  const next = outcome === "wrong" ? 1 : outcome === "hinted" ? box : Math.min(MAX_BOX, box + 1);
  return { box: next, due: now + BOX_INTERVALS[next] };
}
