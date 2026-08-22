/**
 * Vitest Configuration
 *
 * Unit test configuration for the JSON Editor project.
 *
 * Unit tests target pure logic modules in isolation — no browser, no DOM,
 * no dev server. Logic is extracted into src/*-logic.js modules so it can
 * be imported and asserted directly.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /**
     * Only run unit tests — never Playwright specs.
     */
    include: ['tests/unit/**/*.test.js'],

    /**
     * Pure-logic tests need no DOM.
     */
    environment: 'node',
  },
});
