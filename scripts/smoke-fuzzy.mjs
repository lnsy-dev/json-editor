import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5475';

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('[console.error]', msg.text());
});
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

await page.goto(BASE_URL, { waitUntil: 'networkidle' });

// Load the fuzzy search example
await page.click('#load-fuzzy-btn');

// Two fuzzy rows should exist
await page.waitForSelector('json-fuzzy-search', { timeout: 10000 });
const fuzzyCount = await page.locator('json-fuzzy-search').count();
console.log('fuzzy editors on page:', fuzzyCount); // expect 2

// Wikilink chip renders without brackets
const firstChip = page.locator('json-fuzzy-search .jfs-chip-label').first();
console.log('initial chip text:', JSON.stringify(await firstChip.textContent())); // expect Project Overview

// Type a fuzzy query into the first editor ("related files" row)
const firstEditor = page.locator('json-fuzzy-search').first();
await firstEditor.locator('.jfs-input').fill('meet');
await page.waitForSelector('.jfs-results.open .jfs-result', { timeout: 5000 });
const resultText = await page.locator('.jfs-result-label').first().textContent();
console.log('first fuzzy result:', JSON.stringify(resultText)); // expect Meeting Notes 2024

// Add it via click
await page.locator('.jfs-result').first().click();
const chipsAfterAdd = await firstEditor.locator('.jfs-chip').count();
console.log('chips after add:', chipsAfterAdd); // expect 2

// Add a raw typed wikilink via Enter
const input = firstEditor.locator('.jfs-input');
await input.fill('[[My New Note]]');
await input.press('Enter');
const chipsAfterRaw = await firstEditor.locator('.jfs-chip').count();
console.log('chips after raw wikilink Enter:', chipsAfterRaw); // expect 3

// Remove a chip
await firstEditor.locator('.jfs-chip-remove').last().click();
const chipsAfterRemove = await firstEditor.locator('.jfs-chip').count();
console.log('chips after remove:', chipsAfterRemove); // expect 2

// Check exported JSON contains the values and endpoint
await page.click('#get-json-schema-btn');
const output = await page.inputValue('#output');
console.log('schema output:', output);

// Tag search row: type into second editor
const tagEditor = page.locator('json-fuzzy-search').nth(1);
await tagEditor.locator('.jfs-input').fill('act');
await page.waitForTimeout(500);
const tagResults = await page.locator('json-fuzzy-search:nth-of-type(1) ~ * .jfs-result, json-fuzzy-search >> nth=1 >> .jfs-result').count().catch(() => 'n/a');
console.log('tag editor results rendered:', tagResults);

await browser.close();
console.log('SMOKE TEST DONE');
