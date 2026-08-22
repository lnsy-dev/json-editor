/**
 * JSON Entry Dropdown End-to-End Tests
 *
 * End-to-end tests for the json-entry-dropdown custom element.
 */

import { test, expect } from '@playwright/test';

test.describe('JSON Entry Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/json-entry-dropdown.html');
  });

  test('renders with the initial value', async ({ page }) => {
    const dropdown = page.locator('json-entry-dropdown');
    const button = dropdown.locator('.jed-button');

    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('title', 'String');
  });

  test('opens the menu when the button is clicked', async ({ page }) => {
    const dropdown = page.locator('json-entry-dropdown');
    const menu = dropdown.locator('.jed-menu');

    await expect(menu).not.toHaveClass(/open/);

    await dropdown.locator('.jed-button').click();

    await expect(menu).toHaveClass(/open/);
  });

  test('closes the menu when clicking outside', async ({ page }) => {
    const dropdown = page.locator('json-entry-dropdown');
    const menu = dropdown.locator('.jed-menu');

    await dropdown.locator('.jed-button').click();
    await expect(menu).toHaveClass(/open/);

    await page.locator('body').click();

    await expect(menu).not.toHaveClass(/open/);
  });

  test('selects a new type and updates the button title', async ({ page }) => {
    const dropdown = page.locator('json-entry-dropdown');
    const button = dropdown.locator('.jed-button');

    await dropdown.locator('.jed-button').click();
    await dropdown.locator('.jed-item[title="Integer"]').click();

    await expect(button).toHaveAttribute('title', 'Integer');
  });

  test('emits TYPE-CHANGED event with the selected value', async ({ page }) => {
    const eventPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        const el = document.querySelector('json-entry-dropdown');
        el.addEventListener('TYPE-CHANGED', (e) => {
          resolve(e.detail);
        }, { once: true });
      });
    });

    const dropdown = page.locator('json-entry-dropdown');
    await dropdown.locator('.jed-button').click();
    await dropdown.locator('.jed-item[title="Boolean"]').click();

    const detail = await eventPromise;
    expect(detail).toEqual({ value: 'boolean' });
  });

  test('highlights the currently selected item in the menu', async ({ page }) => {
    const dropdown = page.locator('json-entry-dropdown');

    await dropdown.locator('.jed-button').click();

    const selectedItem = dropdown.locator('.jed-item.selected');
    await expect(selectedItem).toHaveAttribute('title', 'String');
  });
});
