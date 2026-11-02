# undoomscroll

Firefox add-on (desktop + Android) that interrupts doomscrolling with
German ↔ Simplified Chinese flashcards. Scroll on YouTube or Reddit and a card
appears on the first scroll, then once per screen length. Answer wrong and you
type the correct answer three times before you can go on.

See [CONCEPT.md](CONCEPT.md) for the full design.

## Develop

```bash
npm install
npm test            # unit tests (answer checker, scheduler)
npm run typecheck
npm run lint        # build + web-ext lint
npm start           # build + launch a temporary Firefox profile with the add-on
npm run fixture     # local test page at http://localhost:8766, no install needed
```

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
| `src/content/` | content script: scroll meter, page lock, modal |
| `src/lib/` | deck, answer checking, Leitner scheduler, storage |
| `src/popup/` | toolbar popup: today's stats, sites, settings |
| `fixtures/` | plain test page that runs the content script with a storage stub |
| `test/` | Vitest unit tests |
