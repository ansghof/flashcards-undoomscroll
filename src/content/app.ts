import { ext } from "../lib/browser";
import { checkAnswer, checkCopy, expectedAnswer, type Direction } from "../lib/check";
import { CARDS, type Card } from "../lib/deck";
import { pickCard } from "../lib/scheduler";
import { getProgress, getSettings, recordOutcome, withDefaults, type Settings } from "../lib/store";
import { PageLock } from "./lock";
import { ScrollMeter } from "./meter";
import { Modal, type Prompt } from "./modal";

function buildPrompt(card: Card, dir: Direction, strict: boolean): Prompt {
  const expected = expectedAnswer(card, dir);
  const toGerman = dir === "zh-de";
  return {
    instruction: toGerman ? "Was heißt das auf Deutsch?" : "Wie schreibt man das auf Chinesisch?",
    prompt: toGerman ? card.hanzi : card.de.join(" / "),
    promptLang: toGerman ? "zh-Hans" : "de",
    expected,
    expectedLang: toGerman ? "de" : "zh-Hans",
    pinyin: card.pinyin,
    // Pinyin of the answer is what you'd type into the IME, so it's a real hint.
    hintCounts: !toGerman,
    check: (input) => checkAnswer(card, dir, input, strict),
    checkCopy: (input) => checkCopy(expected, input, dir),
  };
}

export async function start(siteId: string): Promise<void> {
  let settings: Settings = await getSettings();
  ext.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.settings) settings = withDefaults(changes.settings.newValue as Partial<Settings>);
  });

  let modal: Modal | null = null;
  let lastKey: string | undefined;
  const isOwn = (e: Event) => modal !== null && e.composedPath().includes(modal.host);

  const lock = new PageLock(isOwn, () => modal?.focus());
  const meter = new ScrollMeter(() => settings.factor, trigger, isOwn);

  async function trigger(): Promise<void> {
    if (meter.locked || settings.disabledSites.includes(siteId)) return;
    meter.locked = true;
    lock.engage();
    try {
      const dirs: Direction[] = settings.direction === "mixed" ? ["zh-de", "de-zh"] : [settings.direction];
      const pick = pickCard(CARDS, dirs, await getProgress(), Date.now(), lastKey);
      lastKey = pick.key;
      modal = new Modal(buildPrompt(pick.card, pick.dir, settings.strict));
      const outcome = await modal.open();
      await recordOutcome(pick.key, outcome);
    } finally {
      modal = null;
      lock.release();
      meter.locked = false;
      meter.reset();
    }
  }
}
