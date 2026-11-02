import { describe, expect, it } from "vitest";
import { makeCard } from "../src/lib/deck";
import hskJson from "../src/decks/hsk.json";
import { buildDeck, hskCards, type HskData } from "../src/lib/hsk";

const data: HskData = {
  source: "test",
  words: [
    ["的", "de", ["von"], 1, 1],
    ["苹果", "píng guǒ", ["Apfel"], 1, 2],
    ["电脑", "diàn nǎo", ["Computer"], 0, 1],
    ["阿拉伯语", "Ā lā bó yǔ", ["Arabisch"], 0, 7],
  ],
};

describe("hskCards", () => {
  it("selects words by version and level, keeping frequency rank", () => {
    expect(hskCards(data, "2", [1]).map((c) => c.hanzi)).toEqual(["的", "苹果"]);
    expect(hskCards(data, "3", [1]).map((c) => c.hanzi)).toEqual(["的", "电脑"]);
    expect(hskCards(data, "3", [2, 7]).map((c) => [c.hanzi, c.rank])).toEqual([
      ["苹果", 1],
      ["阿拉伯语", 3],
    ]);
  });
});

describe("buildDeck", () => {
  it("puts own words first and lets them replace HSK words", () => {
    const own = makeCard("苹果", "píng guǒ", ["der Apfel"]);
    const deck = buildDeck(hskCards(data, "2", [1]), [own]);
    expect(deck.map((c) => [c.hanzi, c.de[0], c.rank])).toEqual([
      ["苹果", "der Apfel", -1],
      ["的", "von", 0],
    ]);
  });
});

describe("generated hsk.json", () => {
  const real = hskJson as unknown as HskData;

  it("covers every level of both versions", () => {
    for (const level of [1, 2, 3, 4, 5, 6]) expect(hskCards(real, "2", [level]).length).toBeGreaterThan(100);
    for (const level of [1, 2, 3, 4, 5, 6, 7]) expect(hskCards(real, "3", [level]).length).toBeGreaterThan(100);
  });

  it("uses the everyday reading of polyphones", () => {
    const find = (h: string) => real.words.find((w) => w[0] === h)!;
    expect(find("看")[1]).toBe("kàn");
    expect(find("东西")[2]).toContain("Ding");
  });

  it("leaves out particles instead of borrowing another reading's meaning", () => {
    // HanDeDict only explains 的 (de); its other reading dì means "Ziel".
    for (const particle of ["的", "地", "着", "了"]) {
      expect(real.words.find((w) => w[0] === particle)).toBeUndefined();
    }
  });

  it("puts the meaning of the HSK word class first", () => {
    const find = (h: string) => real.words.find((w) => w[0] === h)!;
    expect(find("是")[2][0]).toBe("sein"); // verb, not the classical pronoun "dies"
    expect(find("要")[2][0]).toBe("wollen");
    expect(find("打")[2]).not.toContain("Dutzend");
    expect(find("更").slice(1, 3)).toEqual(["gèng", ["ferner", "mehr", "weiter", "noch"]]);
    expect(find("没")[1]).toBe("méi");
    expect(find("蓝")[2]).toEqual(["blau"]); // no surname "Lan"
  });
});
