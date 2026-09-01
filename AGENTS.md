# AGENTS.md

Guide for Large Language Models working with this repository or generating code
that uses `<json-editor>`. Every type id, attribute, method, and event name
below is a literal string copied from the source — use them verbatim.

- Package: `@lnsy/json-editor` (check `package.json` for the current version)
- Stack: vanilla JS custom elements (`dataroom-js` base), Rspack build, js-yaml
- Entry points: `src/json-editor.js` (component), `dist/main.min.js` (bundle, **committed**)

---

## 1. Repository Map

| Path | Purpose |
|---|---|
| `src/json-editor.js` | The `<json-editor>` custom element (row-based editor UI) |
| `src/json-entry-dropdown.js` | `<json-entry-dropdown>` type-picker menu element |
| `src/json-fuzzy-search.js` | `<json-fuzzy-search>` chips + fuzzy search element |
| `src/entry-types.js` | `ENTRY_TYPES` registry — single source of truth for type ids |
| `src/json-editor-logic.js` | Pure, DOM-free logic: `detectType`, `validateValue`, `formatValueForInput`, `parseValue`, `convertJSONToRows`, `convertRowsToJSON` |
| `src/fuzzy-search-logic.js` | Pure fuzzy logic: `fuzzyFilter`, `normalizeOptions`, `parseFuzzyValue`, `stripWikilinks` |
| `src/yaml-converter.js` | YAML ⇄ JSON conversion helper |
| `src/icons.js` | SVG icon strings keyed by `iconKey` |
| `styles/json-editor.css`, `styles/variables.css` | Component styles + CSS variables |
| `examples/` | Demo data files (`dropdown-options.json`, `fuzzy-files.json`) |
| `tests/unit/` | Vitest unit tests (**DOM-free by rule** — pure logic only) |
| `tests/e2e/`, `tests/behavioral/` | Playwright end-to-end and BDD-style tests |
| `dist/` | Committed build output — rebuild with `npm run build` after any change |

---

## 2. Quick Start

```html
<script type="module" src="dist/main.min.js"></script>

<json-editor></json-editor>

<script type="module">
  const editor = document.querySelector('json-editor');
  editor.setJSON('{"name": "Alice", "tags": ["developer", "designer"]}');

  editor.addEventListener('JSON-UPDATED', (event) => {
    console.log(event.detail.json);            // current data as an object
  });

  console.log(editor.getJSON());               // JSON string, 2-space indent
  console.log(editor.getYaml());               // YAML string
  console.log(editor.exportJSON());            // plain object
  console.log(editor.exportJSONWithSchema());  // [{ key, type, value, ... }]
</script>
```

`setJSON(jsonString)` / `setYaml(yamlString)` return `boolean` success status —
always check it. Top-level data is an **object** (keys become rows).

---

## 3. Component API

### Attributes (all optional)

| Attribute | Effect |
|---|---|
| `src` | URL to load JSON from on init (and on change) |
| `interact-only` | Hide add/delete row buttons; existing rows stay editable |
| `read-only` | Disable all inputs and remove buttons; display only |
| `form-mode` | Render as a plain form: keys + themed inputs, no type dropdown, no add/delete |

### Methods

| Method | Returns | Notes |
|---|---|---|
| `setJSON(jsonString)` | `boolean` | Load from a JSON string |
| `setYaml(yamlString)` | `boolean` | Load from a YAML string |
| `getJSON()` | `string` | Export as formatted JSON (2-space indent) |
| `getYaml()` | `string` | Export as YAML |
| `exportJSON()` | `Object` | Export as a plain JS object |
| `exportJSONWithSchema()` | `Object[]` | Rows as `{ key, type, value }` plus `optionsUrl`/`endpoint` when set — `value` is the parsed native value |
| `detectType(value)` | `string` | Run the type auto-detection on any value |

### Events

| Event | `detail` | Fired when |
|---|---|---|
| `JSON-UPDATED` | `{ json: Object }` | Any data change (add / edit / delete / type change) |

Listen on the element: `editor.addEventListener('JSON-UPDATED', ...)`. Use this
for reactive updates and auto-save instead of polling.

The internal `<json-fuzzy-search>` element also emits `VALUE-CHANGED`
(`{ value: string[] }`) when its chip set changes; `<json-editor>` consumes it
internally.

---

## 4. Available Types (complete list)

These are the canonical `type` ids from `src/entry-types.js` (`ENTRY_TYPES`).
The type dropdown, parsing, validation, and unit tests are all driven from this
registry, so UI and logic cannot drift apart.

| Type id | Value shape | Input control | Validation (non-empty values) |
|---|---|---|---|
| `string` | `string` | text input | always valid |
| `number` | `number` | number input | must parse as a finite number |
| `float` | `number` | number input | must parse as a finite number |
| `integer` | `number` | number input (step 1) | `Number.isInteger(parseFloat(v))` |
| `currency` | `number` | number input (step 0.01, placeholder `0.00`) | must parse as a finite number |
| `boolean` | `boolean` | checkbox | always valid |
| `date` | `string` | `<input type="date">` | must parse as a Date |
| `datetime` | `string` | `<input type="datetime-local">` | must parse as a Date |
| `url` | `string` | url input (placeholder `https://example.com`) | `new URL(value)` must not throw (protocol required) |
| `array of strings` | `string[]` | text input, **comma-separated** | always valid |
| `tag list` | `string[]` | tag editor: removable chips + inline "Add tag..." input in one input-styled box | every tag must be a **single word** (no spaces) |
| `dropdown` | `string` | `<select>` populated from `optionsUrl` | always valid |
| `fuzzy search` | `string[]` | `<json-fuzzy-search>` (chips + search) | always valid |
| `fuzzy tag search` | `string[]` | same element in tag mode (placeholder `Search tags...`) | always valid |
| `location` | `{ latitude, longitude, altitude }` | three labeled number fields | all three fields required |
| `3d coordinates` | `{ x, y, z }` | three labeled number fields | all three fields required |
| `json` | nested object | textarea (placeholder `JSON value`) | must be valid JSON |

Empty values (`''`, `null`, `undefined`) are always considered valid.

Notes an LLM must know:

- **Currency truncates**: values are sliced to at most two decimal places —
  truncated, never rounded (`sliceCurrencyDigits`).
- **`tag list` vs `array of strings`**: both hold string arrays; `tag list`
  forbids spaces inside individual tags. When serializing `array of strings`
  through the text input, items are comma-separated.
- **Wikilinks**: `fuzzy search` / `fuzzy tag search` values may be
  `[[wikilinks]]`. They are stored **with** brackets in the value and rendered
  **without** brackets in chips and result labels (`stripWikilinks`).

### Row-level extras

Any row loaded may carry these optional properties (preserved by
`exportJSONWithSchema()`):

- `optionsUrl` — used by `dropdown` (select options) and `fuzzy search` /
  `fuzzy tag search` (candidate list). Fetched once: a JSON array of strings or
  of `{ value, label }` objects (see `examples/dropdown-options.json`).
- `endpoint` — used by `fuzzy search` / `fuzzy tag search` for server-side
  search. Queried per distinct query as `` `${endpoint}?q=<query>` `` (150 ms
  debounce); the JSON response (same shapes as `optionsUrl`) is merged with
  local candidates, remote results first, de-duplicated by `value`.

### Type auto-detection (`detectType`)

Applied when data is loaded without an explicit schema. Order matters:

1. `boolean` → `boolean`
2. `null` / `undefined` → `string`
3. Array: every item a space-free string → `tag list`; otherwise → `array of strings`
4. Object: has `latitude`+`longitude`+`altitude` → `location`; has `x`+`y`+`z` →
   `3d coordinates`; otherwise → `json`
5. Number: matches `/^\d+\.\d{2}$/` → `currency`; integer → `integer`; else `float`
6. String: valid URL → `url`; parseable date **with** time component (`T` or
   `YYYY-MM-DD HH:mm`) → `datetime`; parseable `YYYY-MM-DD` date → `date`;
   otherwise → `string`

Consequence: a string like `https://example.com` loads as `url`, and `25.00`
loads as `currency` — change the row type manually if that is not wanted.

### Validation UX

Each row shows a ✓ / ✗ indicator, computed live by `validateValue(value, type)`
while typing. Invalid values do not crash anything; they are flagged visually.

---

## 5. `<json-fuzzy-search>` Element

Standalone reusable element (also used internally by `fuzzy search` and
`fuzzy tag search` rows).

Attributes: `value` (JSON-encoded array), `options-url`, `search-endpoint`,
`tags` (present = tag mode), `placeholder` (overrides default), `disabled`.

Behavior contract:

- Selected values render as chips **inside the same box** as the text input —
  the composite looks like one input; the input stretches after the chips.
- Clicking anywhere in the box focuses the input with the caret at the end.
- Enter adds the top result, or the raw typed text when there are no results.
- Backspace on an **empty** input removes the last chip; each chip has an `×`
  remove button.
- Duplicates are ignored (silently, input just clears).
- Options load asynchronously; typing works before/without them. Stale
  out-of-order endpoint responses are discarded (search tokens).
- Emits `VALUE-CHANGED` with `{ value: string[] }`.
- Chips are square-cornered by default — hosts style them (`.jfs-chip`,
  `.jfs-chip-label`, `.jfs-chip-remove`).

---

## 6. Styling

No fixed theme. CSS variables with neutral fallbacks — set on the element, a
parent, or `:root`:

```css
json-editor {
  --background-color: #ffffff;
  --foreground-color: #1a1a1a;
  --confirmation-color: #0a5c0a;
  --error-color: #dc3545;
  --quaternary-color: #d4cfbd;
  --trinary-color: #8aa38a;
}
```

Structural classes: `.json-editor-row`, `.json-editor-key`; fuzzy-search
classes: `.jfs-root`, `.jfs-chips`, `.jfs-chip`, `.jfs-chip-label`,
`.jfs-chip-remove`, `.jfs-input`, `.jfs-results`, `.jfs-result`,
`.jfs-result-label`, `.jfs-disabled`.

Borders: inputs always show their 1px border while editable. Inputs
with the `readonly` attribute (e.g. fixed keys in form mode) hide their
borders — the border keeps its 1px width with a transparent color so
layout is identical — and get no focus outline when clicked. Disabled
inputs keep their borders. Invalid rows keep their `--error-color`
border via `.json-editor-invalid`.

---

## 7. Architecture Rules for Agents

- **Pure logic is DOM-free.** All parsing/validation/detection lives in
  `src/json-editor-logic.js` and `src/fuzzy-search-logic.js`. Unit tests must
  not touch the DOM; behavior that needs a DOM belongs in the Playwright suites.
- **`ENTRY_TYPES` is the registry.** To add a type: add it to
  `src/entry-types.js`, then handle it in the parse/validate/format switch
  statements in `src/json-editor-logic.js` and the render switch in
  `src/json-editor.js`. The unit suite enforces that every registered type is
  fully handled.
- **`dist/` is committed.** After changing source, run `npm run build` and
  commit the rebuilt `dist/`.
- **Component conventions**: custom elements based on `dataroom-js`
  (`this.create(...)`, `this.attrs` — attribute values keyed by their verbatim
  kebab-case names, `this.event(...)`, async `initialize()`, attribute-change
  events via `this.on("NODE-CHANGED", ...)`); SCREAMING-KEBAB event names.

## 8. Commands

```bash
npm run test:unit     # Vitest unit suite (DOM-free)
npm test              # Playwright e2e + behavioral (auto-starts dev server)
npm run test:mutation # Stryker mutation testing
npm run build         # Rspack build -> dist/ (committed)
npm start             # Dev server (only when explicitly asked)
```

Gotchas when running tests:

- Do **not** keep a manually started `npm start` server running while Playwright
  runs — server reuse + live reload causes flaky "Execution context was
  destroyed" navigation failures. Kill it first (`pkill -f "rspack serve"`).
- Playwright reads its port from `.env` (`PORT`, currently 5475).

## 9. Troubleshooting (LLM decision table)

| Symptom | Cause / Fix |
|---|---|
| `setJSON`/`setYaml` returns `false` | Input string is not valid JSON/YAML — fix the string, don't retry |
| Element not rendering | Script not loaded as `type="module"`, or load error — check console |
| Value flagged ✗ | Value violates the type rules in §4 (spaces in tags, invalid URL protocol, invalid JSON…) |
| Loaded types look wrong | Auto-detection order (§4) — e.g. numeric strings with 2 decimals become `currency` |
| Fuzzy list empty though options exist | `optionsUrl` fetch failed or is still loading; check network + file shape (array of strings or `{value,label}`) |
