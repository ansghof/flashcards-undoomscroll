# undoomscroll

Firefox add-on (desktop + Android) that interrupts doomscrolling with
German ↔ Simplified Chinese flashcards. Scroll on YouTube or Reddit and a card
appears once per screen length. Answer wrong and you type the correct answer
three times before you can go on.

Vocabulary: HSK 2.0 or HSK 3.0 (2026 syllabus), any levels you pick, plus your
own words (add them one by one, or import CSV / Anki text exports). Set it up
via the popup → Wortschatz → Bearbeiten.

See [CONCEPT.md](CONCEPT.md) for the full design.

## Develop

```bash
npm install
npm test            # unit tests (answer checker, scheduler, importer, decks)
npm run typecheck
npm run lint        # build + web-ext lint
npm start           # build + launch a temporary Firefox profile with the add-on
npm run fixture     # local test pages at http://localhost:8766/fixtures/, no install needed
npm run decks       # regenerate src/decks/hsk.json from the source datasets
```

`npm run fixture` serves `fixtures/index.html` (scroll page with the content
script) and `fixtures/options.html` (the real options page), both on a
`browser.*` stub that keeps its data in localStorage.

### Firefox for Android

Enable USB debugging on the phone and remote debugging in Firefox for Android,
then:

```bash
npm run start:android -- --adb-device <device-id>
```

(`adb devices` lists the id.)

### Load manually

`npm run build`, then in Firefox open `about:debugging` → This Firefox →
Load Temporary Add-on → `dist/manifest.json`.

## Layout

| Path | What |
|---|---|
| `src/manifest.json` | MV3 manifest (Firefox desktop + Android) |
| `src/background.ts` | picks cards from the active deck for content scripts |
| `src/content/` | content script: scroll meter, page lock, modal |
| `src/lib/` | decks, answer checking, Leitner scheduler, import/export, storage |
| `src/decks/hsk.json` | generated HSK word list with German glosses |
| `src/popup/` | toolbar popup: today's stats, vocabulary summary, sites, settings |
| `src/options/` | vocabulary page: HSK version/levels, own words |
| `tools/build-hsk.mjs` | builds `hsk.json` |
| `fixtures/` | test pages that run the add-on's pages on a `browser.*` stub |
| `test/` | Vitest unit tests |

## Data and licences

- HSK word lists and pinyin: [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT).
- German glosses: [HanDeDict](https://github.com/gugray/HanDeDict) (CC BY-SA 2.0).
  `src/decks/hsk.json` is derived from it and shared under the same licence.
