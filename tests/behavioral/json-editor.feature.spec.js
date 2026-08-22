/**
 * JSON Editor Behavioral Tests
 *
 * Behavior-driven (BDD) tests for the json-editor custom element.
 *
 * These tests describe the system from the user's point of view. Each
 * scenario uses explicit Given / When / Then steps via test.step() and
 * asserts only on observable outcomes, never on internal state.
 */

import { test, expect } from '@playwright/test';

const sampleJSON = JSON.stringify({
  name: 'John Doe',
  age: 30,
});

test.describe('Feature: Edit JSON', () => {
  test('Scenario: User adds a string entry', async ({ page }) => {
    await test.step('Given the JSON editor is open and empty', async () => {
      await page.goto('/');
      await expect(page.locator('json-editor .json-editor-add-btn')).toBeVisible();
    });

    await test.step('When the user clicks the add button', async () => {
      await page.locator('json-editor .json-editor-add-btn').click();
    });

    await test.step('And enters a key and a value', async () => {
      const row = page.locator('json-editor .json-editor-row').first();
      await row.locator('.json-editor-key').fill('title');
      await row.locator('.json-editor-key').blur();
      await row.locator('.json-editor-value').fill('My Project');
      await row.locator('.json-editor-value').blur();
    });

    await test.step('Then the editor exports the new key-value pair', async () => {
      const json = await page.evaluate(() => {
        const editor = document.querySelector('json-editor');
        return editor.getJSON();
      });
      expect(JSON.parse(json)).toEqual({ title: 'My Project' });
    });
  });

  test('Scenario: User changes a value type', async ({ page }) => {
    await test.step('Given the user has added a row', async () => {
      await page.goto('/');
      await page.locator('json-editor .json-editor-add-btn').click();
      const row = page.locator('json-editor .json-editor-row').first();
      await row.locator('.json-editor-key').fill('count');
      await row.locator('.json-editor-key').blur();
    });

    await test.step('When the user changes the type to Integer', async () => {
      const row = page.locator('json-editor .json-editor-row').first();
      await row.locator('json-entry-dropdown .jed-button').click();
      await row.locator('json-entry-dropdown .jed-item[title="Integer"]').click();
    });

    await test.step('And enters a numeric value', async () => {
      const row = page.locator('json-editor .json-editor-row').first();
      await row.locator('.json-editor-value').fill('42');
      await row.locator('.json-editor-value').blur();
    });

    await test.step('Then the exported value is a number', async () => {
      const json = await page.evaluate(() => {
        const editor = document.querySelector('json-editor');
        return editor.getJSON();
      });
      expect(JSON.parse(json)).toEqual({ count: 42 });
    });
  });

  test('Scenario: User imports JSON and exports it back', async ({ page }) => {
    await test.step('Given the JSON editor is open', async () => {
      await page.goto('/');
    });

    await test.step('When the user loads JSON data', async () => {
      await page.evaluate((json) => {
        const editor = document.querySelector('json-editor');
        editor.setJSON(json);
      }, sampleJSON);
    });

    await test.step('Then the editor displays the imported rows', async () => {
      const rows = page.locator('json-editor .json-editor-row');
      await expect(rows).toHaveCount(2);
      await expect(rows.locator('.json-editor-key').first()).toHaveValue('name');
    });

    await test.step('And exporting JSON returns the same data', async () => {
      const exported = await page.evaluate(() => {
        const editor = document.querySelector('json-editor');
        return editor.getJSON();
      });
      expect(JSON.parse(exported)).toEqual(JSON.parse(sampleJSON));
    });
  });

  test('Scenario: User removes an entry', async ({ page }) => {
    await test.step('Given the editor has two rows', async () => {
      await page.goto('/');
      await page.locator('json-editor .json-editor-add-btn').click();
      await page.locator('json-editor .json-editor-add-btn').click();
      const rows = page.locator('json-editor .json-editor-row');
      await rows.first().locator('.json-editor-key').fill('keep');
      await rows.first().locator('.json-editor-key').blur();
      await rows.nth(1).locator('.json-editor-key').fill('remove');
      await rows.nth(1).locator('.json-editor-key').blur();
    });

    await test.step('When the user clicks the delete button on the second row', async () => {
      await page.locator('json-editor .json-editor-delete-btn').nth(1).click();
    });

    await test.step('Then only the first row remains', async () => {
      const rows = page.locator('json-editor .json-editor-row');
      await expect(rows).toHaveCount(1);
      await expect(rows.first().locator('.json-editor-key')).toHaveValue('keep');
    });
  });
});
