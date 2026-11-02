import { describe, expect, it } from "vitest";
import type { Card } from "../src/lib/deck";
import { BOX_INTERVALS, grade, pickCard, progressKey, type ProgressMap } from "../src/lib/scheduler";

const cards: Card[] = ["a", "b", "c"].map((id) => ({ id, hanzi: id, pinyin: id, de: [id] }));
const NOW = 1_000_000;

describe("grade", () => {
  it("moves up on correct, stays on hinted, drops to 1 on wrong", () => {
    expect(grade({ box: 2, due: 0 }, "correct", NOW)).toEqual({ box: 3, due: NOW + BOX_INTERVALS[3] });
    expect(grade({ box: 2, due: 0 }, "hinted", NOW)).toEqual({ box: 2, due: NOW + BOX_INTERVALS[2] });
    expect(grade({ box: 4, due: 0 }, "wrong", NOW)).toEqual({ box: 1, due: NOW });
  });

  it("treats unseen cards as box 1 and caps at box 5", () => {
    expect(grade(undefined, "correct", NOW).box).toBe(2);
    expect(grade({ box: 5, due: 0 }, "correct", NOW).box).toBe(5);
  });
});

describe("pickCard", () => {
  it("prefers due cards in the lowest box", () => {
    const progress: ProgressMap = {
      [progressKey("a", "zh-de")]: { box: 3, due: 0 },
      [progressKey("b", "zh-de")]: { box: 1, due: 0 },
      [progressKey("c", "zh-de")]: { box: 2, due: 0 },
    };
    expect(pickCard(cards, ["zh-de"], progress, NOW).card.id).toBe("b");
  });

  it("skips cards that aren't due", () => {
    const progress: ProgressMap = {
      [progressKey("a", "zh-de")]: { box: 2, due: NOW + 1 },
      [progressKey("b", "zh-de")]: { box: 4, due: NOW - 1 },
      [progressKey("c", "zh-de")]: { box: 2, due: NOW + 1 },
    };
    expect(pickCard(cards, ["zh-de"], progress, NOW).card.id).toBe("b");
  });

  it("falls back to the earliest due card when nothing is due", () => {
    const progress: ProgressMap = {
      [progressKey("a", "zh-de")]: { box: 2, due: NOW + 30 },
      [progressKey("b", "zh-de")]: { box: 2, due: NOW + 10 },
      [progressKey("c", "zh-de")]: { box: 2, due: NOW + 20 },
    };
    expect(pickCard(cards, ["zh-de"], progress, NOW).card.id).toBe("b");
  });

  it("never repeats the previous card", () => {
    const progress: ProgressMap = { [progressKey("b", "zh-de")]: { box: 1, due: 0 } };
    for (let i = 0; i < 20; i++) {
      const pick = pickCard([cards[1], cards[2]], ["zh-de"], progress, NOW, progressKey("b", "zh-de"));
      expect(pick.card.id).toBe("c");
    }
  });

  it("tracks directions separately", () => {
    const pick = pickCard([cards[0]], ["zh-de", "de-zh"], {}, NOW, progressKey("a", "zh-de"));
    expect(pick.key).toBe("a:de-zh");
  });
});
