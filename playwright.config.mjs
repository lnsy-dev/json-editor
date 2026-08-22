/**
 * Playwright Configuration
 *
 * End-to-end test configuration for the JSON Editor project.
 *
 * Playwright tests simulate real user interactions in a headless browser.
 * They exercise bundling, server rendering, and client-side custom element
 * execution. Every user-facing feature has a corresponding test in tests/.
 */

import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  /**
   * Directory containing test files.
   */
  testDir: './tests',

  /**
   * Unit tests (Vitest) live alongside the Playwright specs — exclude
   * them so Playwright never tries to run them.
   */
  testIgnore: '**/unit/**',

  /**
   * Run tests in files in parallel.
   */
  fullyParallel: true,

  /**
   * Fail the build on CI if you accidentally left test.only in the source code.
   */
  forbidOnly: !!process.env.CI,

  /**
   * Retry on CI only to reduce flake from infrastructure noise.
   */
  retries: process.env.CI ? 2 : 0,

  /**
   * Opt out of parallel tests on CI for stability.
   */
  workers: process.env.CI ? 1 : undefined,

  /**
   * Reporter to use. 'html' generates a browsable report in playwright-report/.
   */
  reporter: 'html',

  /**
   * Shared settings for all projects.
   */
  use: {
    /**
     * Base URL to use in actions like page.goto('/').
     * Tests use relative URLs so they work against any base URL.
     */
    baseURL: BASE_URL,

    /**
     * Collect trace when retrying the failed test.
     */
    trace: 'on-first-retry',

    /**
     * Capture screenshots on failure for debugging.
     */
    screenshot: 'only-on-failure',
  },

  /**
   * Test projects: define different browsers and environments.
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /**
   * Local dev server configuration.
   *
   * Playwright will start rspack serve automatically before running tests
   * and shut it down when tests finish.
   */
  webServer: {
    command: 'npm start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
