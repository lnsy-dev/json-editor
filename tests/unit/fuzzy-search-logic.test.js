/**
 * Fuzzy Search Logic Unit Tests
 *
 * Unit tests for the pure logic in src/fuzzy-search-logic.js.
 */

import { describe, it, expect } from 'vitest';
import {
  stripWikilinks,
  isWikilink,
  toWikilink,
  normalizeOptions,
  fuzzyScore,
  fuzzyFilter,
  parseFuzzyValue,
} from '../../src/fuzzy-search-logic.js';

describe('fuzzy-search-logic', () => {
  describe('stripWikilinks', () => {
    it('strips wikilink brackets', () => {
      expect(stripWikilinks('[[Meeting Notes]]')).toBe('Meeting Notes');
    });

    it('leaves plain text untouched', () => {
      expect(stripWikilinks('readme.md')).toBe('readme.md');
    });

    it('handles empty and non-string values', () => {
      expect(stripWikilinks('')).toBe('');
      expect(stripWikilinks(null)).toBe('');
      expect(stripWikilinks(undefined)).toBe('');
      expect(stripWikilinks(42)).toBe('');
    });

    it('strips brackets with surrounding whitespace', () => {
      expect(stripWikilinks('  [[My File]]  ')).toBe('My File');
    });
  });

  describe('isWikilink', () => {
    it('detects wikilinks', () => {
      expect(isWikilink('[[Foo]]')).toBe(true);
      expect(isWikilink(' [[Foo Bar]] ')).toBe(true);
    });

    it('rejects non-wikilinks', () => {
      expect(isWikilink('Foo')).toBe(false);
      expect(isWikilink('[Foo]')).toBe(false);
      expect(isWikilink('')).toBe(false);
      expect(isWikilink(null)).toBe(false);
      expect(isWikilink(123)).toBe(false);
    });
  });

  describe('toWikilink', () => {
    it('wraps plain text in brackets', () => {
      expect(toWikilink('Notes')).toBe('[[Notes]]');
    });

    it('does not double-wrap wikilinks', () => {
      expect(toWikilink('[[Notes]]')).toBe('[[Notes]]');
    });

    it('returns empty string for empty input', () => {
      expect(toWikilink('   ')).toBe('');
      expect(toWikilink(null)).toBe('');
    });
  });

  describe('normalizeOptions', () => {
    it('normalizes arrays of strings', () => {
      expect(normalizeOptions(['a', 'b'])).toEqual([
        { value: 'a', label: 'a' },
        { value: 'b', label: 'b' },
      ]);
    });

    it('normalizes { value, label } objects', () => {
      expect(normalizeOptions([{ value: 'a', label: 'A' }])).toEqual([
        { value: 'a', label: 'A' },
      ]);
    });

    it('falls back to value for missing labels', () => {
      expect(normalizeOptions([{ value: 'x' }])).toEqual([
        { value: 'x', label: 'x' },
      ]);
    });

    it('drops invalid entries and non-arrays', () => {
      expect(normalizeOptions([null, 42])).toEqual([]);
      expect(normalizeOptions(undefined)).toEqual([]);
      expect(normalizeOptions({ foo: 'bar' })).toEqual([]);
    });
  });

  describe('fuzzyScore', () => {
    it('matches subsequence characters case-insensitively', () => {
      expect(fuzzyScore('mtg', 'Meeting Notes')).not.toBeNull();
    });

    it('returns null when characters are missing', () => {
      expect(fuzzyScore('zzz', 'Meeting Notes')).toBeNull();
    });

    it('scores exact matches highest', () => {
      const exact = fuzzyScore('notes', 'notes');
      const partial = fuzzyScore('notes', 'some notes here');
      expect(exact).toBeGreaterThan(partial);
    });

    it('prefers word-boundary matches', () => {
      const boundary = fuzzyScore('n', 'notes file');
      const middle = fuzzyScore('n', 'file-x-notes');
      expect(boundary).toBeGreaterThan(middle);
    });

    it('handles empty query and text', () => {
      expect(fuzzyScore('', 'anything')).toBe(0);
      expect(fuzzyScore('a', '')).toBeNull();
      expect(fuzzyScore(null, 'text')).toBeNull();
    });
  });

  describe('fuzzyFilter', () => {
    const options = [
      { value: '[[Meeting Notes]]', label: '[[Meeting Notes]]' },
      { value: 'readme.md', label: 'readme.md' },
      { value: 'roadmap.md', label: 'roadmap.md' },
    ];

    it('finds wikilink entries by their bracket-free name', () => {
      const results = fuzzyFilter('meeting notes', options);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].value).toBe('[[Meeting Notes]]');
    });

    it('matches across label and value', () => {
      const results = fuzzyFilter('roadmap', options);
      expect(results[0].value).toBe('roadmap.md');
    });

    it('returns sorted results limited to max results', () => {
      const many = Array.from({ length: 30 }, (_, i) => ({
        value: `file-${i}.md`,
        label: `file-${i}.md`,
      }));
      expect(fuzzyFilter('file', many).length).toBe(10);
      expect(fuzzyFilter('file', many, 5).length).toBe(5);
    });

    it('returns all results when limit is zero or negative', () => {
      // "md" matches readme.md and roadmap.md but not "Meeting Notes"
      expect(fuzzyFilter('md', options, 0).length).toBe(2);
      expect(fuzzyFilter('m', options, 0).length).toBe(3);
    });

    it('returns empty results for no match or bad input', () => {
      expect(fuzzyFilter('zzz', options)).toEqual([]);
      expect(fuzzyFilter('a', null)).toEqual([]);
    });
  });

  describe('parseFuzzyValue', () => {
    it('passes arrays through as strings', () => {
      expect(parseFuzzyValue(['a', 2])).toEqual(['a', '2']);
    });

    it('splits comma-separated strings', () => {
      expect(parseFuzzyValue('a, b , c')).toEqual(['a', 'b', 'c']);
      expect(parseFuzzyValue('[[One]], [[Two]]')).toEqual(['[[One]]', '[[Two]]']);
    });

    it('returns empty array for other values', () => {
      expect(parseFuzzyValue(null)).toEqual([]);
      expect(parseFuzzyValue(undefined)).toEqual([]);
      expect(parseFuzzyValue(42)).toEqual([]);
    });
  });
});
