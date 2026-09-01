/**
 * Entry Type Registry Unit Tests
 *
 * Verifies that the type system is correct and complete: every type the
 * UI offers is fully handled by the parse / validate / format logic, and
 * detectType only ever returns registered types. This keeps the dropdown
 * menu and the editor logic from drifting apart.
 */

import { describe, it, expect } from 'vitest';
import { ENTRY_TYPES, entryTypeValues } from '../../src/entry-types.js';
import {
  detectType,
  parseValue,
  validateValue,
  formatValueForInput,
} from '../../src/json-editor-logic.js';

describe('entry-types registry', () => {
  it('contains no duplicate type values', () => {
    const values = ENTRY_TYPES.map((entry) => entry.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it('exposes the list of type values', () => {
    expect(entryTypeValues()).toContain('string');
    expect(entryTypeValues()).toContain('fuzzy tag search');
  });

  it('gives every entry a value, label, and icon key', () => {
    for (const entry of ENTRY_TYPES) {
      expect(typeof entry.value).toBe('string');
      expect(entry.value.length).toBeGreaterThan(0);
      expect(typeof entry.label).toBe('string');
      expect(entry.label.length).toBeGreaterThan(0);
      expect(typeof entry.iconKey).toBe('string');
    }
  });

  it('handles every registered type in parseValue without throwing', () => {
    const samples = ['', 'hello', '42', '3.14', 'true', 'a, b', [], ['x', 1], {}, null, undefined, '2024-01-15'];
    for (const type of entryTypeValues()) {
      for (const sample of samples) {
        expect(() => parseValue(sample, type)).not.toThrow();
      }
    }
  });

  it('handles every registered type in validateValue without throwing', () => {
    const samples = ['', 'hello', '42', 'not a date', 'https://x.dev', [], ['a b'], {}, null];
    for (const type of entryTypeValues()) {
      for (const sample of samples) {
        expect(() => validateValue(sample, type)).not.toThrow();
      }
    }
  });

  it('handles every registered type in formatValueForInput without throwing', () => {
    const samples = ['', 'hello', 42, 3.14, ['a', 'b'], { a: 1 }, new Date('2024-01-15T10:30:00Z'), null];
    for (const type of entryTypeValues()) {
      for (const sample of samples) {
        expect(() => formatValueForInput(sample, type)).not.toThrow();
      }
    }
  });

  it('treats empty values as valid for every registered type', () => {
    for (const type of entryTypeValues()) {
      expect(validateValue('', type)).toBe(true);
      expect(validateValue(null, type)).toBe(true);
      expect(validateValue(undefined, type)).toBe(true);
    }
  });

  it('detectType only returns registered types', () => {
    const battery = [
      true, false, null, undefined,
      ['one', 'two'], ['hello world'], [1, 2, 3], [],
      { latitude: 1, longitude: 2, altitude: 3 },
      { x: 1, y: 2, z: 3 },
      { foo: 'bar' }, {},
      12.34, 0.99, 42, 0, -7, 3.14159, 12.3,
      'https://example.com', 'http://localhost:3000/path',
      '2024-01-15T10:30:00Z', '2024-01-15 10:30', '2024-01-15',
      'hello', '',
    ];
    const registered = new Set(entryTypeValues());
    for (const value of battery) {
      expect(registered.has(detectType(value))).toBe(true);
    }
  });

  it('coerces non-string array items instead of crashing (type correctness)', () => {
    // Regression: parseValue used to throw "s.includes is not a function"
    expect(parseValue([1, 'a b', 'ok'], 'tag list')).toEqual(['1', 'ok']);
    expect(parseValue([1, true], 'array of strings')).toEqual(['1', 'true']);
    expect(parseValue([42], 'fuzzy search')).toEqual(['42']);
    expect(() => validateValue([1, 'a b'], 'tag list')).not.toThrow();
    expect(validateValue([1, 'a b'], 'tag list')).toBe(false);
  });
});
