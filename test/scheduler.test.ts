import { describe, expect, it } from "vitest";
import type { Card } from "../src/lib/deck";
import { BOX_INTERVALS, grade, pickCard, progressKey, type ProgressMap } from "../src/lib/scheduler";

const cards: Card[] = ["a", "b", "c", "d", "e", "f", "g"].map((id, rank) => ({
  id,
  hanzi: id,
  pinyin: id,
  de: [id],
  rank,
}));
const NOW = 1_000_000;
const seen = (ids: string[], box: number, due: number): ProgressMap =>
  Object.fromEntries(ids.map((id) => [progressKey(id, "zh-de"), { box, due }]));

describe("grade", () => {
  it("moves up on correct, stays on hinted, drops to 1 on wrong", () => {
    expect(grade({ box: 2, due: 0 }, "correct", NOW)).toEqual({ box: 3, due: NOW + BOX_INTERVALS[3] });
    expect(grade({ box: 2, due: 0 }, "hinted", NOW)).toEqual({ box: 2, due: NOW + BOX_INTERVALS[2] });
    expect(grade({ box: 4, due: 0 }, "wrong", NOW)).toEqual({ box: 1, due: NOW + BOX_INTERVALS[1] });
  });

  it("treats unseen cards as box 1 and caps at box 5", () => {
    expect(grade(undefined, "correct", NOW).box).toBe(2);
    expect(grade({ box: 5, due: 0 }, "correct", NOW).box).toBe(5);
  });
});

describe("pickCard", () => {
  it("prefers due reviews in the lowest box", () => {
    const progress = { ...seen(["a"], 3, 0), ...seen(["b"], 1, 0), ...seen(["c"], 2, 0) };
    // rand 0.9 > NEW_CARD_SHARE: take a review.
    expect(pickCard(cards.slice(0, 3), ["zh-de"], progress, NOW, undefined, () => 0.9).card.id).toBe("b");
  });

  it("brings missed cards back before new ones most of the time", () => {
    const progress = seen(["d"], 1, NOW);
    expect(pickCard(cards, ["zh-de"], progress, NOW, undefined, () => 0.9).card.id).toBe("d");
  });

  it("introduces new cards in rank order, from the most common few", () => {
    const progress = seen(["a"], 1, 0);
    // rand 0.1 < NEW_CARD_SHARE: take a new card; 0.1 * window of 5 -> first unseen.
    expect(pickCard(cards, ["zh-de"], progress, NOW, undefined, () => 0.1).card.id).toBe("b");
    const late = pickCard(cards, ["zh-de"], progress, NOW, undefined, () => 0.299);
    expect(["b", "c", "d", "e", "f"]).toContain(late.card.id);
  });

  it("takes new cards when nothing is due", () => {
    const progress = seen(["a", "b"], 3, NOW + 1);
    expect(pickCard(cards, ["zh-de"], progress, NOW, undefined, () => 0).card.id).toBe("c");
  });

  it("falls back to the card due soonest when nothing is due or new", () => {
    const progress = { ...seen(["a"], 2, NOW + 30), ...seen(["b"], 2, NOW + 10), ...seen(["c"], 2, NOW + 20) };
    expect(pickCard(cards.slice(0, 3), ["zh-de"], progress, NOW).card.id).toBe("b");
  });

  it("never repeats the previous card unless it's the only one", () => {
    const progress = seen(["b"], 1, 0);
    const pair = [cards[1], cards[2]];
    for (let i = 0; i < 20; i++) {
      expect(pickCard(pair, ["zh-de"], progress, NOW, progressKey("b", "zh-de")).card.id).toBe("c");
    }
    expect(pickCard([cards[1]], ["zh-de"], progress, NOW, progressKey("b", "zh-de")).card.id).toBe("b");
  });

  it("tracks directions separately", () => {
    const pick = pickCard([cards[0]], ["zh-de", "de-zh"], {}, NOW, progressKey("a", "zh-de"));
    expect(pick.key).toBe("a:de-zh");
  });
});
