/**
 * Input border & outline state end-to-end tests
 *
 * Inputs show their 1px border at all times while editable. Inputs with
 * the readonly attribute (e.g. the fixed keys in form mode) hide their
 * borders — the 1px width is retained with a transparent color so layout
 * is identical — and get no focus outline when clicked. Disabled inputs
 * keep their borders.
 */

import { test, expect } from '@playwright/test';

/** Load the editor with a schema (array of {key, type, value}) rows. */
async function loadSchema(page, schema, attributes = []) {
  await page.evaluate(([json, attrs]) => {
    const editor = document.querySelector('json-editor');
    attrs.forEach((attr) => editor.setAttribute(attr, ''));
    editor.setJSON(json);
  }, [JSON.stringify(schema), attributes]);
}

function row(page, index) {
  return page.locator('json-editor .json-editor-row').nth(index);
}

/** Returns the border-color's alpha channel (0 = invisible border). */
async function borderAlpha(locator) {
  return locator.evaluate((el) => {
    const color = getComputedStyle(el).borderTopColor;
    const match = color.match(/rgba?\(([^)]+)\)/);
    if (!match) return 1;
    const parts = match[1].split(/[\s,/]+/).map(parseFloat);
    return parts.length === 4 ? parts[3] : 1;
  });
}

async function borderGeometry(locator) {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    return { width: style.borderTopWidth, style: style.borderTopStyle };
  });
}

async function focusOutlineStyle(locator) {
  await locator.focus();
  return locator.evaluate((el) => getComputedStyle(el).outlineStyle);
}

test.describe('Input borders & outlines by readonly state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadSchema(page, [
      { key: 'name', type: 'string', value: 'Alice' },
      { key: 'tags', type: 'tag list', value: ['developer', 'designer'] },
      {
        key: 'where',
        type: 'location',
        value: { latitude: 1, longitude: 2, altitude: 3 },
      },
      { key: 'pick', type: 'dropdown', value: 'a', optionsUrl: 'examples/dropdown-options.json' },
    ]);
  });

  test('editable inputs show their border and a focus outline', async ({ page }) => {
    const inputs = [
      row(page, 0).locator('.json-editor-key'),
      row(page, 0).locator('.json-editor-value'),
      row(page, 2).locator('.json-editor-coordinate').first(),
      row(page, 3).locator('.json-editor-dropdown-select'),
      row(page, 1).locator('json-fuzzy-search .jfs-root'),
    ];
    for (const input of inputs) {
      expect(await borderGeometry(input)).toEqual({ width: '1px', style: 'solid' });
      expect(await borderAlpha(input)).toBeGreaterThan(0);
    }

    const value = row(page, 0).locator('.json-editor-value');
    expect(await focusOutlineStyle(value)).toBe('solid');
  });

  test('readonly inputs hide their border but keep its width', async ({ page }) => {
    // Form mode renders every key input with the readonly attribute
    await loadSchema(
      page,
      [
        { key: 'title', type: 'string', value: 'Task' },
        { key: 'price', type: 'currency', value: 10.5 },
      ],
      ['form-mode'],
    );

    const key = row(page, 0).locator('.json-editor-key');
    await expect(key).toHaveAttribute('readonly', '');

    // Geometry retained, border invisible
    expect(await borderGeometry(key)).toEqual({ width: '1px', style: 'solid' });
    expect(await borderAlpha(key)).toBe(0);

    // Also for a readonly value input
    const value = row(page, 0).locator('.json-editor-value');
    await value.evaluate((el) => el.setAttribute('readonly', ''));
    expect(await borderAlpha(value)).toBe(0);
  });

  test('readonly inputs get no focus outline when clicked', async ({ page }) => {
    await loadSchema(
      page,
      [
        { key: 'title', type: 'string', value: 'Task' },
        { key: 'price', type: 'currency', value: 10.5 },
      ],
      ['form-mode'],
    );

    const key = row(page, 0).locator('.json-editor-key');
    expect(await focusOutlineStyle(key)).toBe('none');

    // The editable value input in the same row still shows its outline
    const value = row(page, 0).locator('.json-editor-value');
    expect(await focusOutlineStyle(value)).toBe('solid');
  });

  test('disabled inputs keep their border', async ({ page }) => {
    await loadSchema(
      page,
      [{ key: 'name', type: 'string', value: 'Alice' }],
      ['read-only'],
    );

    const value = row(page, 0).locator('.json-editor-value');
    await expect(value).toBeDisabled();
    expect(await borderAlpha(value)).toBeGreaterThan(0);
  });

  test('invalid editable inputs keep a visible error border', async ({ page }) => {
    await loadSchema(page, [{ key: 'n', type: 'integer', value: 12.5 }]);

    const value = row(page, 0).locator('.json-editor-value');
    await expect(value).toHaveClass(/json-editor-invalid/);

    // The error border is visible and differs from a valid input's border
    const keyBorder = await row(page, 0)
      .locator('.json-editor-key')
      .evaluate((el) => getComputedStyle(el).borderTopColor);
    const valueBorder = await value.evaluate((el) => getComputedStyle(el).borderTopColor);
    expect(await borderAlpha(value)).toBeGreaterThan(0);
    expect(valueBorder).not.toBe(keyBorder);
  });
});
