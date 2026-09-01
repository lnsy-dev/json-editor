# Project Structure

This is a vanilla JavaScript, CSS, and HTML project that uses `rspack` as a builder.

Do not run a dev server. Do not run `npm start` unless explicitly asked to.

## Root Directory

*   `.gitignore`: Specifies intentionally untracked files to ignore.
*   `GEMINI.md`: This file, providing an overview of the project structure.
*   `index.css`: Main stylesheet for the application.
*   `index.html`: Main HTML file (demo page with test controls and a `<json-editor>`).
*   `index.js`: Main JavaScript entry point.
*   `LICENSE`: License file.
*   `package-lock.json`: Records the exact version of each installed package.
*   `package.json`: Contains metadata for the project and its dependencies.
*   `README.md`: General information about the project.
*   `rspack.config.js`: Configuration file for the `rspack` builder.
*   `vitest.config.mjs`: Unit test configuration (Vitest).
*   `playwright.config.mjs`: Browser test configuration (Playwright).
*   `stryker.config.mjs`: Mutation testing configuration (Stryker).

## Directories

*   `dist/`: Contains the built and bundled application code (committed; rebuild with `npm run build`).
*   `examples/`: JSON files used by the demo page (dropdown options, fuzzy search candidates).
*   `node_modules/`: Contains all of the project's dependencies.
*   `scripts/`: Utility scripts (icon generation, manual smoke tests).
*   `src/`: Contains the source code for the application.
    *   `json-editor.js`: The `<json-editor>` custom element.
    *   `json-entry-dropdown.js`: The `<json-entry-dropdown>` type picker custom element.
    *   `json-fuzzy-search.js`: The `<json-fuzzy-search>` custom element.
    *   `entry-types.js`: Registry of supported row types (shared by UI and tests).
    *   `json-editor-logic.js`, `fuzzy-search-logic.js`: Pure, DOM-free logic modules.
    *   `yaml-converter.js`: YAML/JSON conversion helper.
    *   `icons.js`: SVG icon strings.
*   `styles/`: Contains CSS files.
    *   `variables.css`: Contains CSS variables.
    *   `json-editor.css`: Component styles.
*   `tests/`: Test suites.
    *   `unit/`: Vitest unit tests for the pure logic modules.
    *   `e2e/`: Playwright end-to-end tests.
    *   `behavioral/`: Playwright BDD-style tests.
    *   `fixtures/`: Static HTML fixtures for isolated component tests.

## Testing

Run the unit suite with `npm run test:unit`, the browser suites with `npm test`
(Playwright starts the dev server automatically), and mutation testing with
`npm run test:mutation`. Do not start the dev server manually unless asked.
