import { describe, expect, it } from "vitest";
import { checkAnswer, checkCopy, expectedAnswer } from "../src/lib/check";
import type { Card } from "../src/lib/deck";

const apfel: Card = { id: "pingguo", hanzi: "苹果", pinyin: "píng guǒ", de: ["der Apfel"] };
const arzt: Card = { id: "yisheng", hanzi: "医生", pinyin: "yī shēng", de: ["der Arzt", "die Ärztin"] };

describe("checkAnswer zh-de", () => {
  it("accepts the answer regardless of case and whitespace", () => {
    expect(checkAnswer(apfel, "zh-de", "  der  apfel ", true)).toBe(true);
  });

  it("accepts any listed answer", () => {
    expect(checkAnswer(arzt, "zh-de", "die Ärztin", true)).toBe(true);
  });

  it("lenient: article optional and umlauts may be spelled out", () => {
    expect(checkAnswer(apfel, "zh-de", "Apfel", false)).toBe(true);
    expect(checkAnswer(arzt, "zh-de", "Aerztin", false)).toBe(true);
  });

  it("strict: article and umlauts required", () => {
    expect(checkAnswer(apfel, "zh-de", "Apfel", true)).toBe(false);
    expect(checkAnswer(arzt, "zh-de", "die Aerztin", true)).toBe(false);
  });

  it("rejects wrong and empty answers", () => {
    expect(checkAnswer(apfel, "zh-de", "Birne", false)).toBe(false);
    expect(checkAnswer(apfel, "zh-de", "   ", false)).toBe(false);
  });
});

describe("checkAnswer de-zh", () => {
  it("accepts hanzi, ignoring spaces and punctuation", () => {
    expect(checkAnswer(apfel, "de-zh", " 苹 果。", true)).toBe(true);
  });

  it("never accepts pinyin", () => {
    expect(checkAnswer(apfel, "de-zh", "píng guǒ", false)).toBe(false);
    expect(checkAnswer(apfel, "de-zh", "pingguo", false)).toBe(false);
  });

  it("rejects wrong characters", () => {
    expect(checkAnswer(apfel, "de-zh", "平果", false)).toBe(false);
  });
});

describe("checkCopy", () => {
  it("requires the exact shown form, forgiving only case and whitespace", () => {
    const expected = expectedAnswer(apfel, "zh-de");
    expect(expected).toBe("der Apfel");
    expect(checkCopy(expected, "Der Apfel ", "zh-de")).toBe(true);
    expect(checkCopy(expected, "Apfel", "zh-de")).toBe(false);
    expect(checkCopy("die Ärztin", "die Aerztin", "zh-de")).toBe(false);
  });

  it("compares hanzi", () => {
    expect(checkCopy("苹果", "苹果", "de-zh")).toBe(true);
    expect(checkCopy("苹果", "苹", "de-zh")).toBe(false);
  });
});
