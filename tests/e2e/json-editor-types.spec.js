/**
 * JSON Editor Type Coverage End-to-End Tests
 *
 * Companion to json-editor.spec.js: exercises every remaining entry type
 * (date, datetime, url, array of strings, location, 3d coordinates, json,
 * boolean, float), the auto-detection rules applied to plain JSON, the src
 * attribute, exportJSON(), type-change value conversion, and the ✓/✗
 * validation indicators.
 */

import { test, expect } from '@playwright/test';

/** Load the editor with a schema (array of {key, type, value}) rows. */
async function loadSchema(page, schema) {
  await page.evaluate((json) => {
    document.querySelector('json-editor').setJSON(json);
  }, JSON.stringify(schema));
}

function row(page, index) {
  return page.locator('json-editor .json-editor-row').nth(index);
}

test.describe('JSON Editor type coverage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('date rows render a date input and export the value', async ({ page }) => {
    await loadSchema(page, [{ key: 'birthday', type: 'date', value: '2024-01-15' }]);

    const input = row(page, 0).locator('.json-editor-value');
    await expect(input).toHaveAttribute('type', 'date');
    await expect(input).toHaveValue('2024-01-15');

    await input.fill('2025-06-30');
    await input.blur();

    const exported = await page.evaluate(() => JSON.parse(document.querySelector('json-editor').getJSON()));
    expect(exported.birthday).toBe('2025-06-30');
  });

  test('datetime rows render a datetime-local input and export the value', async ({ page }) => {
    await loadSchema(page, [{ key: 'meeting', type: 'datetime', value: '2024-01-15T10:30' }]);

    const input = row(page, 0).locator('.json-editor-value');
    await expect(input).toHaveAttribute('type', 'datetime-local');
    await expect(input).toHaveValue('2024-01-15T10:30');

    await input.fill('2024-03-01T14:45');
    await input.blur();

    const exported = await page.evaluate(() => JSON.parse(document.querySelector('json-editor').getJSON()));
    expect(exported.meeting).toBe('2024-03-01T14:45');
  });

  test('url rows validate the URL format and export the value', async ({ page }) => {
    await loadSchema(page, [{ key: 'website', type: 'url', value: 'https://example.com' }]);

    const input = row(page, 0).locator('.json-editor-value');
    await expect(input).toHaveAttribute('type', 'url');

    // A value without a protocol is flagged invalid
    await input.fill('not a url');
    await input.blur();
    await expect(input).toHaveClass(/json-editor-invalid/);

    // A proper URL is accepted and exported
    await input.fill('https://playwright.dev');
    await input.blur();
    await expect(input).not.toHaveClass(/json-editor-invalid/);

    const exported = await page.evaluate(() => JSON.parse(document.querySelector('json-editor').getJSON()));
    expect(exported.website).toBe('https://playwright.dev');
  });

  test('array of strings rows round-trip a comma-separated input', async ({ page }) => {
    await loadSchema(page, [{ key: 'aliases', type: 'array of strings', value: ['alpha', 'beta'] }]);

    const input = row(page, 0).locator('.json-editor-value');
    await expect(input).toHaveAttribute('placeholder', 'value1, value2, value3');
    await expect(input).toHaveValue('alpha, beta');

    await input.fill('one, two, three');
    await input.blur();

    const exported = await page.evaluate(() => JSON.parse(document.querySelector('json-editor').getJSON()));
    expect(exported.aliases).toEqual(['one', 'two', 'three']);
  });

  test('location rows render latitude/longitude/altitude fields and export them', async ({ page }) => {
    await loadSchema(page, [
      { key: 'home', type: 'location', value: { latitude: 10.5, longitude: 20.25, altitude: 100 } },
    ]);

    const inputs = row(page, 0).locator('.json-editor-coordinate');
    await expect(inputs).toHaveCount(3);
    await expect(inputs.first()).toHaveAttribute('placeholder', 'Latitude');
    await expect(inputs.nth(1)).toHaveAttribute('placeholder', 'Longitude');
    await expect(inputs.nth(2)).toHaveAttribute('placeholder', 'Altitude');

    await inputs.nth(0).fill('48.85');
    await inputs.nth(1).fill('2.35');
    await inputs.nth(2).fill('35');
    await inputs.nth(2).blur();

    const exported = await page.evaluate(() => JSON.parse(document.querySelector('json-editor').getJSON()));
    expect(exported.home).toEqual({ latitude: '48.85', longitude: '2.35', altitude: '35' });
  });

  test('incomplete location values are flagged invalid until completed', async ({ page }) => {
    // A location missing its altitude key is invalid from the start
    await loadSchema(page, [{ key: 'home', type: 'location', value: { latitude: 1, longitude: 2 } }]);

    const inputs = row(page, 0).locator('.json-editor-coordinate');
    await expect(inputs).toHaveCount(3);

    // All field inputs carry the invalid flag and the indicator shows a cross
    await expect(inputs.nth(0)).toHaveClass(/json-editor-invalid/);
    await expect(inputs.nth(1)).toHaveClass(/json-editor-invalid/);
    await expect(row(page, 0).locator('.json-editor-validation-indicator')).toHaveClass(/invalid/);

    // Completing the triple clears the flag
    await inputs.nth(2).fill('3');
    await inputs.nth(2).blur();

    await expect(inputs.nth(0)).not.toHaveClass(/json-editor-invalid/);
    await expect(row(page, 0).locator('.json-editor-validation-indicator')).toHaveClass(/valid/);
  });

  test('3d coordinates rows render x/y/z fields and export them', async ({ page }) => {
    await loadSchema(page, [{ key: 'point', type: '3d coordinates', value: { x: 1, y: 2, z: 3 } }]);

    const inputs = row(page, 0).locator('.json-editor-coordinate');
    await expect(inputs).toHaveCount(3);
    await expect(inputs.first()).toHaveAttribute('placeholder', 'X');
    await expect(inputs.nth(1)).toHaveAttribute('placeholder', 'Y');
    await expect(inputs.nth(2)).toHaveAttribute('placeholder', 'Z');

    await inputs.nth(0).fill('4');
    await inputs.nth(1).fill('5');
    await inputs.nth(2).fill('6');
    await inputs.nth(2).blur();

    const exported = await page.evaluate(() => JSON.parse(document.querySelector('json-editor').getJSON()));
    expect(exported.point).toEqual({ x: '4', y: '5', z: '6' });
  });

  test('json rows round-trip nested objects through the textarea', async ({ page }) => {
    await loadSchema(page, [{ key: 'config', type: 'json', value: { nested: { enabled: true }, size: 3 } }]);

    const textarea = row(page, 0).locator('textarea.json-editor-textarea');
    await expect(textarea).toHaveValue('{\n  "nested": {\n    "enabled": true\n  },\n  "size": 3\n}');

    await textarea.fill('{"deep": {"list": [1, 2]}}');
    await textarea.blur();

    const exported = await page.evaluate(() => JSON.parse(document.querySelector('json-editor').getJSON()));
    expect(exported.config).toEqual({ deep: { list: [1, 2] } });
  });

  test('boolean rows render a checkbox and export booleans', async ({ page }) => {
    await loadSchema(page, [
      { key: 'enabled', type: 'boolean', value: true },
      { key: 'archived', type: 'boolean', value: false },
    ]);

    const enabled = row(page, 0).locator('.json-editor-value');
    const archived = row(page, 1).locator('.json-editor-value');
    await expect(enabled).toHaveAttribute('type', 'checkbox');
    await expect(enabled).toBeChecked();
    await expect(archived).not.toBeChecked();

    await archived.check();

    const exported = await page.evaluate(() => JSON.parse(document.querySelector('json-editor').getJSON()));
    expect(exported).toEqual({ enabled: true, archived: true });
  });

  test('float rows accept decimals and export numbers', async ({ page }) => {
    await loadSchema(page, [{ key: 'ratio', type: 'float', value: 0.5 }]);

    const input = row(page, 0).locator('.json-editor-value');
    await expect(input).toHaveAttribute('type', 'number');
    await expect(input).toHaveAttribute('step', 'any');

    await input.fill('3.14159');
    await input.blur();

    const exported = await page.evaluate(() => JSON.parse(document.querySelector('json-editor').getJSON()));
    expect(exported.ratio).toBeCloseTo(3.14159);
  });

  test('auto-detects types when loading plain JSON', async ({ page }) => {
    await page.evaluate((json) => {
      document.querySelector('json-editor').setJSON(json);
    }, JSON.stringify({
      plain: 'hello',
      link: 'https://example.com',
      day: '2024-04-01',
      moment: '2024-04-01T09:30:00',
      flag: true,
      money: 19.99,
      whole: 7,
      fraction: 1.5,
      notes: ['has space', 'another one'],
      nested: { deep: true },
    }));

    const rows = page.locator('json-editor .json-editor-row');
    await expect(rows).toHaveCount(10);

    const dropdownTitles = await page.locator('json-editor json-entry-dropdown .jed-button')
      .evaluateAll((els) => els.map((el) => el.getAttribute('title')));

    // string, url, date, datetime stay string-typed in the dropdown title
    expect(dropdownTitles[0]).toBe('String');
    expect(dropdownTitles[1]).toBe('URL');
    expect(dropdownTitles[2]).toBe('Date');
    expect(dropdownTitles[3]).toBe('Datetime');
    expect(dropdownTitles[4]).toBe('Boolean');
    expect(dropdownTitles[5]).toBe('currency');
    expect(dropdownTitles[6]).toBe('Integer');
    expect(dropdownTitles[7]).toBe('Float');
    expect(dropdownTitles[8]).toBe('Array of strings');
    expect(dropdownTitles[9]).toBe('JSON');

    // Detected types drive the input controls
    await expect(rows.nth(1).locator('.json-editor-value')).toHaveAttribute('type', 'url');
    await expect(rows.nth(2).locator('.json-editor-value')).toHaveAttribute('type', 'date');
    await expect(rows.nth(3).locator('.json-editor-value')).toHaveAttribute('type', 'datetime-local');
    await expect(rows.nth(4).locator('.json-editor-value')).toHaveAttribute('type', 'checkbox');
    await expect(rows.nth(9).locator('textarea.json-editor-textarea')).toBeVisible();
  });

  test('loads data from the src attribute', async ({ page }) => {
    await page.route('**/api/editor-data.json', async (route) => {
      await route.fulfill({ json: { title: 'From server', count: 3 } });
    });

    await page.evaluate(() => {
      document.querySelector('json-editor').setAttribute('src', '/api/editor-data.json');
    });

    const rows = page.locator('json-editor .json-editor-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.first().locator('.json-editor-key')).toHaveValue('title');
    await expect(rows.first().locator('.json-editor-value')).toHaveValue('From server');

    const exported = await page.evaluate(() => JSON.parse(document.querySelector('json-editor').getJSON()));
    expect(exported).toEqual({ title: 'From server', count: 3 });
  });

  test('exportJSON returns the data as a plain object', async ({ page }) => {
    await loadSchema(page, [{ key: 'count', type: 'integer', value: 5 }]);

    const data = await page.evaluate(() => document.querySelector('json-editor').exportJSON());
    expect(data).toEqual({ count: 5 });
  });

  test('changing the type converts a compatible value', async ({ page }) => {
    await loadSchema(page, [{ key: 'count', type: 'string', value: '42' }]);

    const rowEl = row(page, 0);
    await rowEl.locator('json-entry-dropdown .jed-button').click();
    await rowEl.locator('json-entry-dropdown .jed-item[title="Integer"]').click();

    // The input becomes numeric and the string value converts to a number
    await expect(rowEl.locator('.json-editor-value')).toHaveAttribute('type', 'number');

    const exported = await page.evaluate(() => JSON.parse(document.querySelector('json-editor').getJSON()));
    expect(exported).toEqual({ count: 42 });
  });

  test('validation indicators show a check for valid and a cross for invalid values', async ({ page }) => {
    await loadSchema(page, [
      { key: 'website', type: 'url', value: 'https://example.com' },
      { key: 'count', type: 'integer', value: 3 },
    ]);

    const validIndicator = row(page, 0).locator('.json-editor-validation-indicator');
    await expect(validIndicator).toHaveClass(/valid/);
    await expect(validIndicator).toHaveText('✓');

    const integerInput = row(page, 1).locator('.json-editor-value');
    await integerInput.fill('3.5');
    await integerInput.blur();

    const invalidIndicator = row(page, 1).locator('.json-editor-validation-indicator');
    await expect(invalidIndicator).toHaveClass(/invalid/);
    await expect(invalidIndicator).toHaveText('✗');
  });
});
