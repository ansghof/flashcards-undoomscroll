# undoomscroll — Concept

A browser add-on that interrupts doomscrolling on social media with vocabulary
flashcards (German ↔ Simplified Chinese). You cannot keep scrolling until you
answer — and if you answer wrong, you type the correct answer three times.

## 1. Targets

| Platform | Status | Notes |
|---|---|---|
| Firefox desktop | primary | Manifest V3 |
| Firefox for Android | primary | same build, flagged via `gecko_android`; see §8 |
| Chrome / Edge / Opera | secondary | same source, second build target (service worker) |
| Safari | out of scope | would need an Xcode wrapper |

One codebase: TypeScript bundled with **esbuild** (`build.mjs`) and a hand-written
manifest, `web-ext` for running/linting. (WXT was the original plan; plain
esbuild has fewer moving parts. The Chrome build will need a small manifest
transform: PNG icons, `service_worker` if a background script is ever added.)
Code uses `browser.*` and falls back to `chrome.*`.

Manifest essentials:

```jsonc
{
  "manifest_version": 3,
  "name": "undoomscroll",
  "permissions": ["storage", "scripting"],
  "optional_host_permissions": ["*://*.youtube.com/*", "*://*.reddit.com/*", "..."],
  "browser_specific_settings": {
    "gecko": { "id": "undoomscroll@ansghof", "strict_min_version": "140.0" },
    "gecko_android": { "strict_min_version": "142.0" }
  }
}
```

Minimums are 140 / 142 because AMO requires `data_collection_permissions`,
which those versions introduced. The MVP needs no background script.

## 2. Core loop

1. The user opens a supported site and scrolls.
2. **The first scroll triggers the first prompt immediately.** After that, a
   prompt appears every screen length of scrolling (`window.innerHeight × factor`,
   default factor 1.0).
3. A modal covers the page and the page is locked.
4. **Correct answer** → modal closes, meter resets, scrolling continues.
5. **Wrong answer** → the correct answer is shown; the user must type it
   **3 times** (counter 1/3, 2/3, 3/3). Paste is blocked; an incorrect copy
   does not count. Then the modal closes.
6. Missed cards come back sooner (spaced repetition, §5).

"First scroll" is re-armed per tab on page load. SPA navigation
(`pushState`/`popstate`) does **not** re-arm it, so clicking around is not a
way out.

## 3. Measuring "one screen length"

- **Page scroll** (Reddit, YouTube comments): `scroll` on `window`.
- **Inner scroll containers** (X, new Reddit, many mobile layouts): one
  capture-phase `scroll` listener on `document` catches every scrolling element;
  the meter sums `|Δ scrollTop|` per element.
- **Swipe feeds** (YouTube Shorts, TikTok, Instagram Reels): pixels are
  meaningless. Count item changes instead (URL change like `/shorts/<id>`, or a
  change of the visible `<video>`). Default: 1 item = 1 screen.
- "First scroll" = the first scroll delta above a small noise threshold
  (~20 px) or the first swipe-feed item change, so programmatic jitter on load
  doesn't count.
- Meter state lives per tab in the content script.

## 4. The modal (not skippable)

- Rendered in a **closed Shadow DOM** attached to `document.documentElement`;
  site CSS can't style it, site scripts can't easily reach it.
- A `MutationObserver` re-attaches it if the site removes it.
- **Scroll lock:** `overflow: hidden` on `html`/`body`, plus capture-phase
  blocking of `wheel`, `touchmove`, and scroll keys (Space, PageUp/Down, arrows,
  Home/End) — **except** when the event target is the modal's own input
  (Space must still work inside the text field).
- Playing `<video>`/`<audio>` elements are paused and resumed afterwards.
- If something is fullscreen, `document.exitFullscreen()` first (an overlay
  can't sit above a fullscreen element).
- No close button; Esc and outside clicks do nothing.
- `role="dialog"`, `aria-modal="true"`, focus trap, light/dark via
  `prefers-color-scheme`.
- Top frame only (`all_frames: false`), so embeds don't spawn extra modals.

## 5. Vocabulary: German ↔ Simplified Chinese

### Card format

```ts
interface Card {
  id: string;
  hanzi: string;        // "苹果"
  pinyin: string;       // "píng guǒ"  (tone marks; display-only hint)
  de: string[];         // ["der Apfel", "Apfel"]
  tags?: string[];      // ["HSK1", "Essen"]
}
```

### Directions (per deck: CN→DE, DE→CN, or mixed)

- **CN → DE:** show hanzi. Accept any entry in `de`. Articles optional in
  lenient mode (`Apfel` = `der Apfel`), required in strict mode.
- **DE → CN:** show the German word. The answer is **typed in hanzi only**
  (exact match after Unicode NFC normalisation, surrounding whitespace
  trimmed). Pinyin is never accepted as an answer.
- **Pinyin hint:** hidden by default. A "拼音" button (click/tap) reveals the
  pinyin of the hanzi involved — of the prompt in CN → DE, of the expected
  answer in DE → CN. In DE → CN the hint gives away most of the answer
  (it's what you type into the IME), so a hinted correct answer counts as
  *correct but hinted*: the card stays in its Leitner box instead of moving up.
- **The 3× penalty always uses the exact form that was shown** (the hanzi in
  DE → CN). The point is to copy it, not to be lenient.

### Chinese input caveats

- Typing hanzi requires an IME (pinyin keyboard). The answer is evaluated only
  on Enter / submit, never mid-composition: ignore `keydown` while
  `event.isComposing` is true and track `compositionstart`/`compositionend`.
- Paste is blocked via `beforeinput` with `inputType === "insertFromPaste"`
  (and `insertFromDrop`) — **not** by blocking keys, which would break IMEs.
- Fonts: rely on system CJK fonts with a sensible stack
  (`"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`); no bundled
  font in the MVP.

### Starter deck

- HSK 1–2 vocabulary (word lists are facts; ~450 words).
- German glosses from **HanDeDict** (Chinese–German dictionary,
  CC BY-SA 2.0 DE) → deck ships with attribution and under the same licence.
- Pinyin (for the hint) from HanDeDict entries; manually checked for the
  starter set.

### Import

- CSV/TSV with columns `hanzi, pinyin, de` (multiple German answers separated
  by `;`).
- Anki plain-text export with the same field order.

### Spaced repetition

Leitner system with 5 boxes. Correct → next box; wrong → box 1. Prompt picks
from due cards first, weighted towards low boxes. SM-2 can replace this later
without changing the card format.

## 6. Sites and permissions

Default list (each includes the mobile subdomain):

| Site | Patterns |
|---|---|
| YouTube | `www.youtube.com`, `m.youtube.com` |
| Reddit | `www.reddit.com`, `old.reddit.com`, `new.reddit.com` |
| X | `x.com`, `mobile.x.com` |
| Instagram | `www.instagram.com` |
| Facebook | `www.facebook.com`, `m.facebook.com` |
| TikTok | `www.tiktok.com` |
| LinkedIn | `www.linkedin.com` |
| Bluesky | `bsky.app` |

Users can add their own (Mastodon instances, forums, news sites).

**Optional host permissions** instead of `<all_urls>`: a site's permission is
requested when the user enables it, then the content script is registered via
`scripting.registerContentScripts`. Easier AMO review, more honest.

Private windows: Firefox requires explicit user permission; onboarding points
this out.

## 7. UI

- **Toolbar popup:** meter for the current tab, today's stats (prompts,
  accuracy, streak), on/off for the current site.
- **Options page:** decks (import, browse, direction),
  sites, threshold factor, strictness.
- **Self-commitment (optional):** disabling a site or pausing only takes effect
  after a delay (e.g. 5 min) or after typing a sentence. Uninstall can't (and
  shouldn't) be blocked.

## 8. Firefox for Android

Same build, but several things behave differently and must be designed for
from the start:

- **No toolbar popup.** The action appears in the ⋮ menu → Extensions and
  opens the popup as a page. Keep the popup small and self-contained; anything
  substantial lives on the options page.
- **Touch scrolling:** scroll *events* still fire, so the meter works the same.
  The lock must also block `touchmove` (non-passive listener) and set
  `overscroll-behavior: none` to stop pull-to-refresh.
- **On-screen keyboard:** use `window.visualViewport` to keep the modal's input
  above the keyboard (resize/reposition on `visualViewport` `resize`).
  Capture `innerHeight` for the threshold *before* the keyboard opens, or the
  "screen length" shrinks.
- **Android keyboards (Gboard etc.):** `keydown` often reports
  `key: "Unidentified"` / `keyCode 229`. All answer handling uses `input` /
  `beforeinput` events and a submit button, never key codes.
- Input attributes: `autocomplete="off" autocorrect="off"
  autocapitalize="off" spellcheck="false"` — autocorrect "fixing" German
  nouns would be maddening. Hanzi come from the Android Chinese keyboard
  (Gboard Pinyin/Handwriting etc.); composition handling as in §5. Gboard suggestions can still insert words;
  that's acceptable (it's not paste).
- **Mobile site variants:** `m.youtube.com`, `m.facebook.com`,
  `mobile.x.com` have different DOMs and scroll containers — the swipe-feed
  and container detection must be tested on each.
- `storage.sync` doesn't roam on Android; settings simply stay local there.
- Dev loop: `web-ext run -t firefox-android --adb-device <id>` against a phone
  with USB debugging.

## 9. Privacy

No network requests, no telemetry, no account. Settings in `storage.sync`,
decks and progress in `storage.local` (`unlimitedStorage` if decks grow).
JSON export/import for backups.

## 10. Testing

- **Vitest:** answer checker (hanzi NFC matching, articles, strict/lenient),
  Leitner scheduling, CSV import.
- **Fixture page** (`fixtures/`, `npm run fixture`): runs the content script
  with a storage stub, no install needed. Later automated with **Playwright**:
  modal + scroll lock (page scroll,
  inner container, swipe feed).
- **Manual matrix:** Firefox desktop, Firefox Android, Chrome — on YouTube,
  Reddit, X at minimum.
- `web-ext lint` in CI.

## 11. Milestones

1. **MVP:** Firefox desktop + Android; YouTube and Reddit (incl. mobile
   variants); scroll meter with first-scroll trigger; modal with 3× penalty;
   hard-coded mini deck (~30 HSK1 words); CN→DE and DE→CN (hanzi answers)
   with the click-to-reveal pinyin hint.
2. **Decks:** full HSK 1–2 starter deck, options page, CSV/Anki import,
   Leitner boxes, strict/lenient.
3. **Coverage:** swipe-feed mode (Shorts, TikTok, Reels), remaining sites,
   fullscreen/media handling, stats, self-commitment.
4. **Release:** AMO listing (desktop + Android), then Chrome Web Store.
