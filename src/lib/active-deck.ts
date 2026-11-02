import { ext } from "./browser";
import type { Card } from "./deck";
import { buildDeck, hskCards, type HskData } from "./hsk";
import type { Settings } from "./store";

let hsk: Promise<HskData> | null = null;

/** The HSK word list (~600 KB), loaded once per extension page/background lifetime. */
export function loadHsk(): Promise<HskData> {
  hsk ??= fetch(ext.runtime.getURL("decks/hsk.json")).then((r) => r.json() as Promise<HskData>);
  return hsk;
}

/** Cards to ask with these settings; falls back to HSK level 1 so there is always something. */
export async function activeDeck(settings: Settings, custom: Card[]): Promise<Card[]> {
  const data = await loadHsk();
  const deck = buildDeck(
    hskCards(data, settings.hskVersion, settings.hskLevels),
    settings.customEnabled ? custom : [],
  );
  return deck.length > 0 ? deck : hskCards(data, settings.hskVersion, [1]);
}
