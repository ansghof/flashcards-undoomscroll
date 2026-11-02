import { activeDeck } from "./lib/active-deck";
import { ext } from "./lib/browser";
import type { Direction } from "./lib/check";
import { pickCard, type Pick } from "./lib/scheduler";
import { getCustomCards, getProgress, getSettings } from "./lib/store";

export interface PickRequest {
  type: "pick";
  avoid?: string;
}

// Card picking lives here so content scripts don't each load the HSK list.
async function pick({ avoid }: PickRequest): Promise<Pick> {
  const [settings, custom, progress] = await Promise.all([getSettings(), getCustomCards(), getProgress()]);
  const deck = await activeDeck(settings, custom);
  const dirs: Direction[] = settings.direction === "mixed" ? ["zh-de", "de-zh"] : [settings.direction];
  return pickCard(deck, dirs, progress, Date.now(), avoid);
}

ext.runtime.onMessage.addListener((message: unknown) => {
  if ((message as PickRequest | undefined)?.type === "pick") return pick(message as PickRequest);
  return undefined;
});
