/**
 * JSON Editor Form Mode End-to-End Tests
 *
 * When the form-mode attribute is set on a json-editor element, the editor
 * renders as a simple form: just the key and the themed input for each row.
 * No type dropdowns, no add button, no delete buttons. Users can tab
 * between the inputs.
 */

import { test, expect } from '@playwright/test';

const formSchemaJSON = JSON.stringify([
  { key: 'title', type: 'string', value: 'Task' },
  { key: 'description', type: 'string', value: 'A description' },
  { key: 'price', type: 'currency', value: 10.5 },
]);

async function loadFormModeEditor(page) {
  await page.goto('/');
  await page.evaluate((json) => {
    const editor = document.querySelector('json-editor');
    editor.setAttribute('form-mode', '');
    editor.setJSON(json);
  }, formSchemaJSON);
}

test.describe('JSON Editor Form Mode', () => {
  test('renders one key input and one value input per row', async ({ page }) => {
    await loadFormModeEditor(page);

    const rows = page.locator('json-editor .json-editor-row');
    await expect(rows).toHaveCount(3);

    await expect(rows.first().locator('.json-editor-key')).toHaveValue('title');
    await expect(rows.first().locator('.json-editor-value')).toHaveValue('Task');
  });

  test('renders no type dropdowns in form mode', async ({ page }) => {
    await loadFormModeEditor(page);

    await expect(
      page.locator('json-editor json-entry-dropdown'),
    ).toHaveCount(0);
  });

  test('renders no add button in form mode', async ({ page }) => {
    await loadFormModeEditor(page);

    await expect(page.locator('json-editor .json-editor-add-btn')).toHaveCount(0);
  });

  test('renders no delete buttons in form mode', async ({ page }) => {
    await loadFormModeEditor(page);

    await expect(
      page.locator('json-editor .json-editor-delete-btn'),
    ).toHaveCount(0);
  });

  test('hides validation indicators in form mode', async ({ page }) => {
    await loadFormModeEditor(page);

    await expect(
      page.locator('json-editor .json-editor-validation-indicator:visible'),
    ).toHaveCount(0);
  });

  test('users can tab between inputs in form mode', async ({ page }) => {
    await loadFormModeEditor(page);

    const firstKey = page.locator('json-editor .json-editor-row').first().locator('.json-editor-key');
    const firstValue = page.locator('json-editor .json-editor-row').first().locator('.json-editor-value');
    const secondKey = page.locator('json-editor .json-editor-row').nth(1).locator('.json-editor-key');

    await firstKey.focus();
    await expect(firstKey).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(firstValue).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(secondKey).toBeFocused();
  });

  test('edits in form mode update the exported JSON', async ({ page }) => {
    await loadFormModeEditor(page);

    const firstValue = page.locator('json-editor .json-editor-row').first().locator('.json-editor-value');
    await firstValue.fill('Updated title');
    await firstValue.blur();

    const exported = await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      return editor.getJSON();
    });

    expect(JSON.parse(exported)).toEqual({
      title: 'Updated title',
      description: 'A description',
      price: 10.5,
    });
  });

  test('currency values are sliced to two decimals in form mode', async ({ page }) => {
    await loadFormModeEditor(page);

    const priceInput = page.locator('json-editor .json-editor-row').nth(2).locator('.json-editor-value');
    await priceInput.fill('19.999');
    await priceInput.blur();

    await expect(priceInput).toHaveValue('19.99');

    const exported = await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      return JSON.parse(editor.getJSON());
    });
    expect(exported.price).toBe(19.99);
  });

  test('removing the form-mode attribute restores the full editor', async ({ page }) => {
    await loadFormModeEditor(page);

    await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      editor.removeAttribute('form-mode');
    });

    // Type dropdowns, add and delete buttons come back
    await expect(page.locator('json-editor json-entry-dropdown').first()).toBeVisible();
    await expect(page.locator('json-editor .json-editor-add-btn')).toBeVisible();
    await expect(page.locator('json-editor .json-editor-delete-btn').first()).toBeVisible();
  });
});
