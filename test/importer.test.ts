import { describe, expect, it } from "vitest";
import { mergeCards, parseWordList, toCsv } from "../src/lib/importer";
import { makeCard } from "../src/lib/deck";

describe("parseWordList", () => {
  it("reads CSV with header, pinyin and several German answers", () => {
    const { cards, skipped } = parseWordList("hanzi,pinyin,deutsch\n苹果,píng guǒ,Apfel; der Apfel\n");
    expect(skipped).toEqual([]);
    expect(cards).toEqual([makeCard("苹果", "píng guǒ", ["Apfel", "der Apfel"])]);
  });

  it("reads two-column lines without pinyin", () => {
    const { cards } = parseWordList("喜欢,mögen / gern haben");
    expect(cards[0]).toMatchObject({ hanzi: "喜欢", pinyin: "", de: ["mögen", "gern haben"] });
  });

  it("reads Anki TSV exports with comments and HTML", () => {
    const text = "#separator:tab\n#html:true\n谢谢\txiè xie\tdanke<br>vielen Dank\n";
    expect(parseWordList(text).cards[0]).toMatchObject({ hanzi: "谢谢", de: ["danke", "vielen Dank"] });
  });

  it("handles quoted fields with commas", () => {
    const { cards } = parseWordList('看,kàn,"sehen, schauen"');
    expect(cards[0].de).toEqual(["sehen", "schauen"]);
  });

  it("skips lines without hanzi or German and reports their line numbers", () => {
    const { cards, skipped } = parseWordList("苹果,píng guǒ,Apfel\nhello,world,x\n水,shuǐ,\n");
    expect(cards).toHaveLength(1);
    expect(skipped).toEqual([2, 3]);
  });

  it("round-trips through toCsv", () => {
    const cards = [makeCard("看", "kàn", ["sehen", "schauen"]), makeCard("说", "", ['"sagen"'])];
    expect(parseWordList(toCsv(cards)).cards).toEqual(cards);
  });
});

describe("mergeCards", () => {
  it("replaces words with the same hanzi and appends new ones", () => {
    const merged = mergeCards(
      [makeCard("水", "shuǐ", ["Wasser"]), makeCard("茶", "chá", ["Tee"])],
      [makeCard("水", "shuǐ", ["das Wasser"]), makeCard("猫", "māo", ["Katze"])],
    );
    expect(merged.map((c) => c.de[0])).toEqual(["das Wasser", "Tee", "Katze"]);
  });
});
