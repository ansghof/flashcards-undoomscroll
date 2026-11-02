import type Browser from "webextension-polyfill";

// Firefox provides `browser`; Chrome's MV3 `chrome` is promise-based and
// close enough for the APIs used here.
const g = globalThis as unknown as { browser?: Browser.Browser; chrome?: Browser.Browser };
export const ext: Browser.Browser = (g.browser ?? g.chrome)!;
