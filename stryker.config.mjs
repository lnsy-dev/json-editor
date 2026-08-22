/**
 * Stryker Mutator Configuration
 *
 * Mutation testing configuration for the JSON Editor project.
 *
 * Stryker mutates the files listed in `mutate` and reruns the Vitest unit
 * suite for each mutant. Only mutate modules that have real unit test
 * coverage to avoid a flood of surviving mutants.
 */

export default {
  /**
   * Files to mutate. Start with pure logic modules covered by
   * tests/unit/. Expand this list as unit test coverage grows.
   */
  mutate: ['src/yaml-converter.js', 'src/json-editor-logic.js'],

  /**
   * Stryker drives the Vitest unit suite; it never runs Playwright.
   */
  testRunner: 'vitest',

  /**
   * Reporters: progress in the terminal, plus a browsable HTML report
   * in reports/mutation/ showing each mutant and its outcome.
   */
  reporters: ['progress', 'clear-text', 'html'],
  htmlReporter: {
    fileName: 'reports/mutation/mutation-report.html',
  },

  /**
   * Score thresholds: fail below `break`, warn below `low`.
   */
  thresholds: { high: 80, low: 60, break: 50 },
};
