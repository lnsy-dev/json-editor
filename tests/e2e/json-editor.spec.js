/**
 * JSON Editor End-to-End Tests
 *
 * End-to-end tests for the json-editor custom element.
 *
 * These tests run in a real browser via Playwright and exercise the
 * component as a user would: adding rows, editing values, changing types,
 * importing/exporting data, and observing custom events.
 */

import { test, expect } from '@playwright/test';

const sampleJSON = JSON.stringify({
  name: 'John Doe',
  age: 30,
  email: 'john@example.com',
  tags: ['developer', 'designer'],
  isActive: true,
  salary: 75000.50,
});

const sampleYAML = `name: Jane Smith
age: 28
email: jane@example.com
tags:
  - manager
  - analyst
isActive: true
salary: 85000.75`;

test.describe('JSON Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the add button in empty state', async ({ page }) => {
    const addButton = page.locator('json-editor .json-editor-add-btn');
    await expect(addButton).toBeVisible();
    await expect(addButton).toHaveText('+');
  });

  test('adds a new row when the add button is clicked', async ({ page }) => {
    const addButton = page.locator('json-editor .json-editor-add-btn');
    await addButton.click();

    const rows = page.locator('json-editor .json-editor-row');
    await expect(rows).toHaveCount(1);

    const keyInput = rows.first().locator('.json-editor-key');
    await expect(keyInput).toHaveValue('');
  });

  test('edits key and value of a row', async ({ page }) => {
    await page.locator('json-editor .json-editor-add-btn').click();

    const row = page.locator('json-editor .json-editor-row').first();
    const keyInput = row.locator('.json-editor-key');
    const valueInput = row.locator('.json-editor-value');

    await keyInput.fill('title');
    await keyInput.blur();
    await valueInput.fill('Hello World');
    await valueInput.blur();

    await expect(keyInput).toHaveValue('title');
    await expect(valueInput).toHaveValue('Hello World');
  });

  test('deletes a row when the delete button is clicked', async ({ page }) => {
    const addButton = page.locator('json-editor .json-editor-add-btn');
    await addButton.click();
    await addButton.click();

    await expect(page.locator('json-editor .json-editor-row')).toHaveCount(2);

    await page.locator('json-editor .json-editor-delete-btn').first().click();

    await expect(page.locator('json-editor .json-editor-row')).toHaveCount(1);
  });

  test('loads data via setJSON and renders rows', async ({ page }) => {
    const result = await page.evaluate((json) => {
      const editor = document.querySelector('json-editor');
      return editor.setJSON(json);
    }, sampleJSON);

    expect(result).toBe(true);

    const rows = page.locator('json-editor .json-editor-row');
    await expect(rows).toHaveCount(6);

    await expect(rows.locator('.json-editor-key').first()).toHaveValue('name');
  });

  test('loads data via setYaml and renders rows', async ({ page }) => {
    const result = await page.evaluate((yaml) => {
      const editor = document.querySelector('json-editor');
      return editor.setYaml(yaml);
    }, sampleYAML);

    expect(result).toBe(true);

    const rows = page.locator('json-editor .json-editor-row');
    await expect(rows).toHaveCount(6);
  });

  test('exports JSON matching the current editor state', async ({ page }) => {
    await page.evaluate((json) => {
      const editor = document.querySelector('json-editor');
      editor.setJSON(json);
    }, sampleJSON);

    const exported = await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      return editor.getJSON();
    });

    expect(JSON.parse(exported)).toEqual({
      name: 'John Doe',
      age: 30,
      email: 'john@example.com',
      tags: ['developer', 'designer'],
      isActive: true,
      salary: 75000.50,
    });
  });

  test('exports JSON with schema', async ({ page }) => {
    await page.evaluate((json) => {
      const editor = document.querySelector('json-editor');
      editor.setJSON(json);
    }, sampleJSON);

    const exported = await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      return editor.exportJSONWithSchema();
    });

    expect(exported).toContainEqual({
      key: 'name',
      type: 'string',
      value: 'John Doe',
    });
    expect(exported).toContainEqual({
      key: 'age',
      type: 'integer',
      value: 30,
    });
  });

  test('exports YAML matching the current editor state', async ({ page }) => {
    await page.evaluate((json) => {
      const editor = document.querySelector('json-editor');
      editor.setJSON(json);
    }, sampleJSON);

    const yaml = await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      return editor.getYaml();
    });

    expect(yaml).toContain('name: John Doe');
    expect(yaml).toContain('age: 30');
  });

  test('emits JSON-UPDATED event when data changes', async ({ page }) => {
    const eventPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        const editor = document.querySelector('json-editor');
        editor.addEventListener('JSON-UPDATED', (e) => {
          resolve(e.detail);
        }, { once: true });
      });
    });

    await page.locator('json-editor .json-editor-add-btn').click();

    const detail = await eventPromise;
    expect(detail).toHaveProperty('json');
    // Empty-key rows are skipped when exporting, so a fresh empty row emits {}
    expect(detail.json).toEqual({});
  });

  test('changes row type via the dropdown and updates the input', async ({ page }) => {
    await page.locator('json-editor .json-editor-add-btn').click();

    const row = page.locator('json-editor .json-editor-row').first();
    const dropdown = row.locator('json-entry-dropdown');

    await dropdown.locator('.jed-button').click();
    await dropdown.locator('.jed-item[title="Integer"]').click();

    const valueInput = row.locator('.json-editor-value');
    await expect(valueInput).toHaveAttribute('type', 'number');
  });

  test('shows invalid state for malformed json input', async ({ page }) => {
    await page.locator('json-editor .json-editor-add-btn').click();

    const row = page.locator('json-editor .json-editor-row').first();
    const dropdown = row.locator('json-entry-dropdown');

    await dropdown.locator('.jed-button').click();
    await dropdown.locator('.jed-item[title="JSON"]').click();

    const valueInput = row.locator('.json-editor-value');
    await valueInput.fill('not valid json');
    await valueInput.blur();

    await expect(valueInput).toHaveClass(/json-editor-invalid/);
  });

  test('has no critical console errors on load', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    expect(consoleErrors).toHaveLength(0);
  });

  test('slices currency input to two decimal places', async ({ page }) => {
    const currencySchemaJSON = JSON.stringify([
      { key: 'price', type: 'currency', value: 0 },
    ]);

    await page.evaluate((json) => {
      const editor = document.querySelector('json-editor');
      editor.setJSON(json);
    }, currencySchemaJSON);

    const row = page.locator('json-editor .json-editor-row').first();
    const valueInput = row.locator('.json-editor-value');

    await valueInput.fill('19.999');
    await valueInput.blur();

    // The displayed value is sliced (not rounded) to two decimal places
    await expect(valueInput).toHaveValue('19.99');

    const exported = await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      return editor.getJSON();
    });
    expect(JSON.parse(exported)).toEqual({ price: 19.99 });
  });

  test('removing read-only attribute restores full editing', async ({ page }) => {
    const result = await page.evaluate((json) => {
      const editor = document.querySelector('json-editor');
      editor.setAttribute('read-only', '');
      editor.setJSON(json);
      return true;
    }, sampleJSON);
    expect(result).toBe(true);

    // Read-only inputs are disabled
    const readOnlyKey = page.locator('json-editor .json-editor-key').first();
    await expect(readOnlyKey).toBeDisabled();

    // Removing the attribute re-renders with enabled inputs
    await page.evaluate(() => {
      document.querySelector('json-editor').removeAttribute('read-only');
    });

    await expect(page.locator('json-editor .json-editor-key').first()).toBeEnabled();
  });

  test('loads dropdown example and exports selected value', async ({ page }) => {
    const dropdownSchemaJSON = JSON.stringify([
      { key: 'name', type: 'string', value: 'Task' },
      { key: 'status', type: 'dropdown', value: 'active', optionsUrl: 'examples/dropdown-options.json' },
    ]);

    await page.evaluate((json) => {
      const editor = document.querySelector('json-editor');
      editor.setJSON(json);
    }, dropdownSchemaJSON);

    const rows = page.locator('json-editor .json-editor-row');
    await expect(rows).toHaveCount(2);

    const statusRow = rows.nth(1);
    await expect(statusRow.locator('.json-editor-key')).toHaveValue('status');

    const select = statusRow.locator('.json-editor-dropdown-select');
    await expect(select).toHaveValue('active');

    await select.selectOption('pending');

    const exported = await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      return editor.getJSON();
    });

    expect(JSON.parse(exported)).toEqual({
      name: 'Task',
      status: 'pending',
    });

    const exportedSchema = await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      return editor.exportJSONWithSchema();
    });

    expect(exportedSchema).toContainEqual({
      key: 'status',
      type: 'dropdown',
      value: 'pending',
      optionsUrl: 'examples/dropdown-options.json',
    });
  });
});
