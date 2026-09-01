# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Vanilla JS/CSS/HTML library bundled with Rspack. Entry is `index.js`, loaded by `index.html` and served by the dev server.
- The product is a JSON/YAML editor built from custom elements on the `dataroom-js` base class:
  - `src/json-editor.js` — `<json-editor>`: row-based visual editor with type selection, validation, view modes (`interact-only`, `read-only`, `form-mode`), JSON/YAML import/export.
  - `src/json-entry-dropdown.js` — `<json-entry-dropdown>`: type picker with SVG icons.
  - `src/json-fuzzy-search.js` — `<json-fuzzy-search>`: fuzzy value picker for the `fuzzy search` / `fuzzy tag search` row types.
  - `src/entry-types.js` — registry of all supported row types (single source of truth shared by the dropdown and the tests).
- Pure, DOM-free logic lives in `src/json-editor-logic.js`, `src/fuzzy-search-logic.js`, and `src/yaml-converter.js` so it can be unit tested in Node.
- Rspack config (`rspack.config.js`): bundles `index.js` to `dist/<OUTPUT_FILE_NAME or main.min.js>`; the dev server serves the repo root on `PORT` (default 3000, set to 5475 in `.env`).

Commands
- Install: `npm install`
- Dev server: `npm start` (http://localhost:$PORT)
- Build: `npm run build` → `dist/`
- Unit tests: `npm run test:unit` (Vitest, tests/unit/)
- E2E + behavioral tests: `npm test` (Playwright; starts the dev server automatically)
- Mutation tests: `npm run test:mutation` (Stryker over the pure logic modules)

Testing notes
- Playwright specs live in `tests/e2e/` and `tests/behavioral/`; the fuzzy search endpoint (`search-endpoint` attribute) is covered by `tests/e2e/json-fuzzy-search.spec.js` using `page.route` mocks.
- Unit tests must stay DOM-free; component behavior is covered by the browser suites.
- `dist/` is committed — run `npm run build` after source changes so the published bundle matches.

Environment
- `.env` (see `.env.example`): `PORT` (dev server port), `OUTPUT_FILE_NAME` (bundle filename).
