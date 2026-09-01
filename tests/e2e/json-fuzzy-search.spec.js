/**
 * JSON Fuzzy Search End-to-End Tests
 *
 * End-to-end tests for the json-fuzzy-search custom element, covering both
 * of its data sources:
 * - optionsUrl: a JSON file of candidate entries (local fuzzy matching)
 * - endpoint: a server-side fuzzy search queried as `${endpoint}?q=<query>`
 *
 * The endpoint is mocked with page.route so the merge behavior, request
 * format, and error-free degradation can be asserted deterministically.
 */

import { test, expect } from '@playwright/test';

const fuzzySchemaJSON = JSON.stringify([
  { key: 'name', type: 'string', value: 'Task' },
  { key: 'related files', type: 'fuzzy search', value: ['[[Project Overview]]'], optionsUrl: 'examples/fuzzy-files.json', endpoint: '/api/fuzzy-search' },
  { key: 'labels', type: 'fuzzy tag search', value: ['design'], optionsUrl: 'examples/dropdown-options.json' },
]);

test.describe('JSON Fuzzy Search', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the server-side fuzzy search endpoint used by the schema below
    await page.route('**/api/fuzzy-search*', async (route) => {
      const query = new URL(route.request().url()).searchParams.get('q') || '';
      await route.fulfill({
        json: [
          { value: `[[Remote ${query} Notes]]`, label: `[[Remote ${query} Notes]]` },
          { value: 'remote-static.md', label: 'remote-static.md' },
        ],
      });
    });

    await page.goto('/');
    await page.evaluate((json) => {
      const editor = document.querySelector('json-editor');
      editor.setJSON(json);
    }, fuzzySchemaJSON);
  });

  test('renders one fuzzy editor per fuzzy row with initial chips', async ({ page }) => {
    await expect(page.locator('json-fuzzy-search')).toHaveCount(2);

    // Wikilink chips render without their brackets
    const firstEditor = page.locator('json-fuzzy-search').first();
    await expect(firstEditor.locator('.jfs-chip-label')).toHaveText('Project Overview');

    // Tag mode editor shows the tag placeholder
    const tagEditor = page.locator('json-fuzzy-search').nth(1);
    await expect(tagEditor.locator('.jfs-input')).toHaveAttribute('placeholder', 'Search tags...');
  });

  test('loads candidates from the optionsUrl endpoint', async ({ page }) => {
    // The tag editor has an optionsUrl but no search endpoint, so its
    // results come purely from the local candidates file.
    const tagEditor = page.locator('json-fuzzy-search').nth(1);
    await tagEditor.locator('.jfs-input').fill('act');

    // "active" and "inactive" fuzzy-match "act"; "pending" does not
    await expect(tagEditor.locator('.jfs-results.open .jfs-result')).toHaveCount(2);
    await expect(tagEditor.locator('.jfs-result-label').first()).toHaveText('Active');
  });

  test('queries the search endpoint with ?q= and merges remote and local results', async ({ page }) => {
    const requestedQueries = [];
    await page.route('**/api/fuzzy-search*', async (route) => {
      requestedQueries.push(new URL(route.request().url()).searchParams.get('q'));
      await route.fulfill({
        json: [
          { value: '[[Remote Meet Notes]]', label: '[[Remote Meet Notes]]' },
          { value: 'remote-static.md', label: 'remote-static.md' },
        ],
      });
    });

    const firstEditor = page.locator('json-fuzzy-search').first();
    await firstEditor.locator('.jfs-input').fill('meet');

    const results = firstEditor.locator('.jfs-results.open .jfs-result');
    await expect(results.first()).toBeVisible();

    // The endpoint was queried with the typed value
    expect(requestedQueries).toContain('meet');

    // Remote results are merged with local optionsUrl results (sorted by
    // fuzzy score, so display order between them is not guaranteed)
    const labels = await firstEditor.locator('.jfs-result-label').allTextContents();
    expect(labels).toContain('Remote Meet Notes'); // from endpoint
    expect(labels).toContain('Meeting Notes 2024'); // from optionsUrl
  });

  test('debounces rapid keystrokes into a single endpoint query', async ({ page }) => {
    let endpointHits = 0;
    await page.route('**/api/fuzzy-search*', async (route) => {
      endpointHits += 1;
      await route.fulfill({ json: [] });
    });

    const firstEditor = page.locator('json-fuzzy-search').first();
    const input = firstEditor.locator('.jfs-input');
    await input.pressSequentially('abc', { delay: 30 });

    await firstEditor.locator('.jfs-input').blur();
    await page.waitForTimeout(400);

    expect(endpointHits).toBe(1);
  });

  test('fetches the options file once and reuses it for every query', async ({ page }) => {
    let optionsFetches = 0;
    await page.route('**/examples/dropdown-options.json', async (route) => {
      optionsFetches += 1;
      await route.continue();
    });

    // Re-initialize so the options file is fetched under the counting route
    await page.evaluate(() => {
      document.querySelector('json-editor').setJSON(
        JSON.stringify([
          {
            key: 'labels',
            type: 'fuzzy tag search',
            value: ['design'],
            optionsUrl: 'examples/dropdown-options.json',
          },
        ]),
      );
    });

    const tagEditor = page.locator('json-fuzzy-search').first();
    const input = tagEditor.locator('.jfs-input');

    // Several queries against the same editor...
    await input.fill('act');
    await expect(tagEditor.locator('.jfs-results.open .jfs-result')).toHaveCount(2);

    await input.fill('pen');
    await expect(tagEditor.locator('.jfs-results.open .jfs-result')).toHaveCount(1);

    // ...trigger a single fetch of the values file, not one per query
    expect(optionsFetches).toBe(1);
  });

  test('makes one server trip per distinct query', async ({ page }) => {
    const queries = [];
    await page.route('**/api/fuzzy-search*', async (route) => {
      queries.push(new URL(route.request().url()).searchParams.get('q'));
      await route.fulfill({ json: [] });
    });

    const input = page.locator('json-fuzzy-search').first().locator('.jfs-input');

    await input.fill('a');
    await page.waitForTimeout(300); // debounce (150ms) + response
    await input.fill('ab');
    await page.waitForTimeout(300);

    expect(queries).toEqual(['a', 'ab']);
  });

  test('ignores stale endpoint responses that arrive out of order', async ({ page }) => {
    await page.route('**/api/fuzzy-search*', async (route) => {
      const query = new URL(route.request().url()).searchParams.get('q');
      if (query === 'meet') {
        // The first trip is slow: its response lands after the second's
        await new Promise((resolve) => setTimeout(resolve, 600));
        await route.fulfill({ json: [{ value: 'stale-meet.md', label: 'stale-meet.md' }] });
      } else {
        await route.fulfill({ json: [{ value: 'fresh-roa.md', label: 'fresh-roa.md' }] });
      }
    });

    const firstEditor = page.locator('json-fuzzy-search').first();
    const input = firstEditor.locator('.jfs-input');

    await input.fill('meet');
    await input.fill('roa');

    // Results update asynchronously with the response of the latest query
    const labels = firstEditor.locator('.jfs-result-label');
    await expect
      .poll(() => labels.allTextContents(), { timeout: 3000 })
      .toContain('fresh-roa.md');

    // The stale response for 'meet' never overwrites the newer results
    await page.waitForTimeout(800);
    const finalLabels = await labels.allTextContents();
    expect(finalLabels).not.toContain('stale-meet.md');
  });

  test('stays usable while the options file is still loading', async ({ page }) => {
    // Hold the options file back so the editor initializes without it
    await page.route('**/examples/dropdown-options.json', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fulfill({ json: ['active', 'inactive', 'pending'] });
    });

    await page.evaluate(() => {
      document.querySelector('json-editor').setJSON(
        JSON.stringify([
          {
            key: 'labels',
            type: 'fuzzy tag search',
            value: ['design'],
            optionsUrl: 'examples/dropdown-options.json',
          },
        ]),
      );
    });

    const tagEditor = page.locator('json-fuzzy-search').first();
    const input = tagEditor.locator('.jfs-input');

    // While the fetch is in flight, editing the value already works:
    // raw values can be committed without any candidate list
    await input.fill('[[Manual Entry]]');
    await input.press('Enter');
    await expect(tagEditor.locator('.jfs-chip')).toHaveCount(2);
    await expect(tagEditor.locator('.jfs-chip-label').nth(1)).toHaveText('Manual Entry');

    // Once the options arrive, queries resolve against them too
    await page.waitForTimeout(1000); // let the gated fetch settle
    await input.fill('act');
    await expect(tagEditor.locator('.jfs-results.open .jfs-result')).toHaveCount(2);
  });

  test('adds a clicked result as a chip and emits VALUE-CHANGED', async ({ page }) => {
    const firstEditor = page.locator('json-fuzzy-search').first();
    await firstEditor.locator('.jfs-input').fill('roadmap');
    await firstEditor.locator('.jfs-result').first().click();

    // Two chips: initial [[Project Overview]] plus the clicked roadmap.md
    await expect(firstEditor.locator('.jfs-chip')).toHaveCount(2);
    await expect(firstEditor.locator('.jfs-chip-label').nth(1)).toHaveText('roadmap.md');

    // The row value flows into the exported JSON
    const exported = await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      return JSON.parse(editor.getJSON());
    });
    expect(exported['related files']).toEqual(['[[Project Overview]]', 'roadmap.md']);
  });

  test('adds a raw wikilink typed directly via Enter', async ({ page }) => {
    const firstEditor = page.locator('json-fuzzy-search').first();
    const input = firstEditor.locator('.jfs-input');

    await input.fill('[[My New Note]]');
    await input.press('Enter');

    await expect(firstEditor.locator('.jfs-chip')).toHaveCount(2);
    await expect(firstEditor.locator('.jfs-chip-label').nth(1)).toHaveText('My New Note');

    // Enter clears the input and closes the results
    await expect(input).toHaveValue('');
    await expect(firstEditor.locator('.jfs-results.open')).toHaveCount(0);
  });

  test('Enter with visible results adds the top result', async ({ page }) => {
    const firstEditor = page.locator('json-fuzzy-search').first();
    const input = firstEditor.locator('.jfs-input');

    await input.fill('meet');
    await expect(firstEditor.locator('.jfs-results.open .jfs-result').first()).toBeVisible();

    await input.press('Enter');

    await expect(firstEditor.locator('.jfs-chip')).toHaveCount(2);
    // The top-scored result (local "Meeting Notes 2024") is added
    await expect(firstEditor.locator('.jfs-chip-label').nth(1)).toHaveText('Meeting Notes 2024');
  });

  test('removes a chip via its remove button', async ({ page }) => {
    const firstEditor = page.locator('json-fuzzy-search').first();
    await expect(firstEditor.locator('.jfs-chip')).toHaveCount(1);

    await firstEditor.locator('.jfs-chip-remove').first().click();

    await expect(firstEditor.locator('.jfs-chip')).toHaveCount(0);

    const exported = await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      return JSON.parse(editor.getJSON());
    });
    expect(exported['related files']).toEqual([]);
  });

  test('ignores duplicate values', async ({ page }) => {
    const firstEditor = page.locator('json-fuzzy-search').first();
    const input = firstEditor.locator('.jfs-input');

    await input.fill('[[Project Overview]]');
    await input.press('Enter');

    // Duplicate of the initial chip is not added
    await expect(firstEditor.locator('.jfs-chip')).toHaveCount(1);
  });

  test('closes the results when clicking outside', async ({ page }) => {
    const firstEditor = page.locator('json-fuzzy-search').first();
    const input = firstEditor.locator('.jfs-input');

    await input.fill('meet');
    await expect(firstEditor.locator('.jfs-results.open')).toHaveCount(1);

    await page.locator('body').click();
    await expect(firstEditor.locator('.jfs-results.open')).toHaveCount(0);
  });

  test('disables the fuzzy input in read-only mode', async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector('json-editor').setAttribute('read-only', '');
    });

    await expect(page.locator('json-fuzzy-search .jfs-input').first()).toBeDisabled();
  });
});
