/**
 * Fuzzy Search Logic
 *
 * Pure logic for the fuzzy search / fuzzy tag search value editors.
 * No DOM dependencies so it can be unit tested with Vitest and
 * exercised by Stryker mutation testing.
 */

/**
 * Strip wikilink brackets from a string.
 * "[[Some File]]" -> "Some File", "Plain" -> "Plain"
 *
 * @param {string} text - The text to strip
 * @returns {string} - The text without surrounding [[ ]] brackets
 */
export function stripWikilinks(text) {
  if (typeof text !== 'string') return '';
  const match = text.match(/^\s*\[\[([\s\S]*?)\]\]\s*$/);
  return match ? match[1] : text;
}

/**
 * Check whether a string is a wikilink ("[[...]]").
 *
 * @param {string} text - The text to check
 * @returns {boolean} - Whether the text is wrapped in [[ ]]
 */
export function isWikilink(text) {
  if (typeof text !== 'string') return false;
  return /^\s*\[\[[\s\S]*\]\]\s*$/.test(text);
}

/**
 * Wrap a string in wikilink brackets if it is not already one.
 *
 * @param {string} text - The text to wrap
 * @returns {string} - The wikilink-formatted text
 */
export function toWikilink(text) {
  if (typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return isWikilink(trimmed) ? trimmed : `[[${trimmed}]]`;
}

/**
 * Normalize raw options data into an array of { value, label } objects.
 * Accepts arrays of strings or arrays of { value, label } objects.
 *
 * @param {*} data - Raw data loaded from a JSON file or endpoint
 * @returns {Array<{value: string, label: string}>} - Normalized options
 */
export function normalizeOptions(data) {
  if (!Array.isArray(data)) return [];
  return data
    .map((option) => {
      if (typeof option === 'string') {
        return { value: option, label: option };
      }
      if (option && typeof option === 'object' && option.value !== undefined && option.value !== null) {
        return {
          value: String(option.value),
          label: String(option.label || option.value),
        };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Score how well a query fuzzy-matches a piece of text.
 * Uses case-insensitive subsequence matching with bonuses for
 * consecutive characters and word-boundary matches.
 *
 * @param {string} query - The search query
 * @param {string} text - The text to match against
 * @returns {number|null} - Match score (higher is better) or null if no match
 */
export function fuzzyScore(query, text) {
  if (typeof query !== 'string' || typeof text !== 'string') return null;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!q) return 0;
  if (!t) return null;

  let score = 0;
  let textIndex = 0;
  let consecutive = 0;

  for (let i = 0; i < q.length; i++) {
    const char = q[i];
    const found = t.indexOf(char, textIndex);
    if (found === -1) return null;

    // Bonus for consecutive characters
    if (found === textIndex && i > 0) {
      consecutive += 1;
      score += 4 + consecutive;
    } else {
      consecutive = 0;
      // Bonus for matching at a word boundary (start, space, separator)
      if (found === 0 || /[\s\-_/.]/.test(t[found - 1])) {
        score += 3;
      }
      // Small penalty for gaps to prefer tighter matches
      score -= Math.min(found - textIndex, 10) * 0.1;
    }

    score += 1;
    textIndex = found + 1;
  }

  // Bonus for exact substring match
  if (t.includes(q)) score += 5;
  // Bonus for exact match
  if (t === q) score += 10;

  return score;
}

/**
 * Filter options against a query using fuzzy matching.
 * Wikilink brackets are stripped from labels before matching so that
 * "[[Meeting Notes]]" can be found with "meeting notes" or "meet".
 *
 * @param {string} query - The search query
 * @param {Array<{value: string, label: string}>} options - Normalized options
 * @param {number} [limit=10] - Maximum number of results
 * @returns {Array<{value: string, label: string, score: number}>} - Sorted matches
 */
export function fuzzyFilter(query, options, limit = 10) {
  if (!Array.isArray(options)) return [];
  const results = [];
  for (const option of options) {
    if (!option || typeof option.value !== 'string') continue;
    const searchable = `${stripWikilinks(option.label)} ${option.value}`;
    const score = fuzzyScore(query, searchable);
    if (score !== null) {
      results.push({ ...option, score });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return limit > 0 ? results.slice(0, limit) : results;
}

/**
 * Parse a value into an array of strings for fuzzy types.
 *
 * @param {*} value - The raw value (array, comma-separated string, etc.)
 * @returns {string[]} - Array of selected values
 */
export function parseFuzzyValue(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s);
  }
  return [];
}
