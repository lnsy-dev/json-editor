/**
 * JSON Tag Editor End-to-End Tests
 *
 * End-to-end tests for tag editing: "tag list" rows and "fuzzy tag search"
 * rows both render the json-fuzzy-search tag editor — tags are added via an
 * input and shown as inline-block chips with an 'x' at the end that removes
 * them. The chips and the input share one input-styled box, so the editor
 * still looks like a single input with the text cursor inline after the
 * chips.
 */

import { test, expect } from '@playwright/test';

const tagSchemaJSON = JSON.stringify([
  { key: 'title', type: 'string', value: 'Task' },
  { key: 'tags', type: 'tag list', value: ['developer', 'designer'] },
  {
    key: 'labels',
    type: 'fuzzy tag search',
    value: ['design'],
    optionsUrl: 'examples/dropdown-options.json',
  },
]);

/** Horizontal/vertical distance between two element bounding boxes. */
function boxDistance(a, b) {
  return {
    dx: Math.round(b.x - (a.x + a.width)),
    dy: Math.round(
      a.y + a.height / 2 - (b.y + b.height / 2),
    ),
  };
}

test.describe('JSON Tag Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((json) => {
      const editor = document.querySelector('json-editor');
      editor.setJSON(json);
    }, tagSchemaJSON);
  });

  test('renders a tag editor with initial chips for tag list rows', async ({ page }) => {
    const tagsRow = page.locator('json-editor .json-editor-row').nth(1);
    const tagEditor = tagsRow.locator('json-fuzzy-search');

    await expect(tagEditor.locator('.jfs-chip')).toHaveCount(2);
    await expect(tagEditor.locator('.jfs-chip-label').first()).toHaveText('developer');
    await expect(tagEditor.locator('.jfs-chip-label').nth(1)).toHaveText('designer');

    // The editor's own input replaces the old comma-separated text input
    await expect(tagEditor.locator('.jfs-input')).toHaveAttribute('placeholder', 'Add tag...');
  });

  test('keeps chips and input in one input-styled box, input after the chips', async ({ page }) => {
    const tagEditor = page.locator('json-editor .json-editor-row').nth(1).locator('json-fuzzy-search');
    const root = tagEditor.locator('.jfs-root');
    const chips = tagEditor.locator('.jfs-chip');
    const input = tagEditor.locator('.jfs-input');

    // The box carries the border; the input inside is borderless, so the
    // whole editor reads as a single input control
    const styles = await root.evaluate((el) => {
      const rootStyle = getComputedStyle(el);
      const inputStyle = getComputedStyle(el.querySelector('.jfs-input'));
      return {
        rootBorder: `${rootStyle.borderTopWidth} ${rootStyle.borderTopStyle}`,
        rootPadding: rootStyle.paddingTop,
        inputBorderWidth: inputStyle.borderTopWidth,
      };
    });
    expect(styles.rootBorder).toBe('1px solid');
    expect(parseFloat(styles.rootPadding)).toBeGreaterThan(0);
    expect(styles.inputBorderWidth).toBe('0px');

    // Chips are square-cornered by default — hosts style them themselves
    const chipRadius = await chips.first().evaluate((el) => getComputedStyle(el).borderRadius);
    expect(parseFloat(chipRadius)).toBe(0);

    // Chips are content-sized blocks aligned in a row (inline-block look):
    // the first chip does not stretch, and the second chip continues to
    // its right on the same line
    const firstChipBox = await chips.first().boundingBox();
    const rootBox = await root.boundingBox();
    expect(firstChipBox.width).toBeLessThan(rootBox.width / 2);

    const secondChipBox = await chips.nth(1).boundingBox();
    expect(secondChipBox.x).toBeGreaterThanOrEqual(firstChipBox.x + firstChipBox.width);
    expect(Math.abs(secondChipBox.y - firstChipBox.y)).toBeLessThanOrEqual(2);

    // The input sits on the same line as the last chip, directly after it
    const lastChipBox = await chips.nth(1).boundingBox();
    const inputBox = await input.boundingBox();
    const { dx, dy } = boxDistance(lastChipBox, inputBox);
    expect(Math.abs(dy)).toBeLessThanOrEqual(2);
    expect(dx).toBeGreaterThanOrEqual(0);
  });

  test('adds a tag by typing it in the input and pressing Enter', async ({ page }) => {
    const tagEditor = page.locator('json-editor .json-editor-row').nth(1).locator('json-fuzzy-search');
    const input = tagEditor.locator('.jfs-input');

    await input.fill('urgent');
    await input.press('Enter');

    await expect(tagEditor.locator('.jfs-chip')).toHaveCount(3);
    await expect(tagEditor.locator('.jfs-chip-label').nth(2)).toHaveText('urgent');

    // Enter clears the input for the next tag
    await expect(input).toHaveValue('');

    const exported = await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      return JSON.parse(editor.getJSON());
    });
    expect(exported.tags).toEqual(['developer', 'designer', 'urgent']);
  });

  test('removes a tag via the x on the chip', async ({ page }) => {
    const tagEditor = page.locator('json-editor .json-editor-row').nth(1).locator('json-fuzzy-search');

    await tagEditor.locator('.jfs-chip-remove').first().click();

    await expect(tagEditor.locator('.jfs-chip')).toHaveCount(1);
    await expect(tagEditor.locator('.jfs-chip-label').first()).toHaveText('designer');

    const exported = await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      return JSON.parse(editor.getJSON());
    });
    expect(exported.tags).toEqual(['designer']);
  });

  test('removes the last tag with Backspace on the empty input', async ({ page }) => {
    const tagEditor = page.locator('json-editor .json-editor-row').nth(1).locator('json-fuzzy-search');
    const input = tagEditor.locator('.jfs-input');

    await input.click();
    await input.press('Backspace');

    await expect(tagEditor.locator('.jfs-chip')).toHaveCount(1);
    await expect(tagEditor.locator('.jfs-chip-label').first()).toHaveText('developer');

    const exported = await page.evaluate(() => {
      const editor = document.querySelector('json-editor');
      return JSON.parse(editor.getJSON());
    });
    expect(exported.tags).toEqual(['developer']);
  });

  test('clicking the editor puts the cursor in the input at the correct place', async ({ page }) => {
    const tagEditor = page.locator('json-editor .json-editor-row').nth(1).locator('json-fuzzy-search');
    const input = tagEditor.locator('.jfs-input');

    // Click the box itself — not directly on the input — e.g. on a chip label
    await tagEditor.locator('.jfs-chip-label').first().click();

    const focusState = await input.evaluate((el) => ({
      isFocused: el === document.activeElement,
      caretAtEnd: el.selectionStart === el.selectionEnd && el.selectionStart === el.value.length,
    }));
    expect(focusState.isFocused).toBe(true);
    expect(focusState.caretAtEnd).toBe(true);
  });

  test('ignores duplicate tags', async ({ page }) => {
    const tagEditor = page.locator('json-editor .json-editor-row').nth(1).locator('json-fuzzy-search');
    const input = tagEditor.locator('.jfs-input');

    await input.fill('developer');
    await input.press('Enter');

    await expect(tagEditor.locator('.jfs-chip')).toHaveCount(2);
  });

  test('fuzzy tag search rows share the same one-input tag layout', async ({ page }) => {
    const labelEditor = page.locator('json-editor .json-editor-row').nth(2).locator('json-fuzzy-search');
    const chips = labelEditor.locator('.jfs-chip');
    const input = labelEditor.locator('.jfs-input');

    await expect(chips).toHaveCount(1);
    await expect(input).toHaveAttribute('placeholder', 'Search tags...');

    // Input inline after the last chip, same line
    const lastChipBox = await chips.first().boundingBox();
    const inputBox = await input.boundingBox();
    const { dx, dy } = boxDistance(lastChipBox, inputBox);
    expect(Math.abs(dy)).toBeLessThanOrEqual(2);
    expect(dx).toBeGreaterThanOrEqual(0);
  });

  test('read-only mode disables the tag editor and hides the remove buttons', async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector('json-editor').setAttribute('read-only', '');
    });

    const tagEditor = page.locator('json-editor .json-editor-row').nth(1).locator('json-fuzzy-search');
    await expect(tagEditor.locator('.jfs-input')).toBeDisabled();
    await expect(tagEditor.locator('.jfs-chip-remove')).toHaveCount(0);
    // Chips are still displayed
    await expect(tagEditor.locator('.jfs-chip')).toHaveCount(2);
  });
});
