/**
 * JSON Editor Logic Unit Tests
 *
 * Unit tests for the pure logic in src/json-editor-logic.js.
 *
 * These functions have no DOM dependencies, so they run in Node with
 * Vitest and are exercised by Stryker mutation testing.
 */

import { describe, it, expect } from 'vitest';
import {
  detectType,
  parseValue,
  validateValue,
  formatValueForInput,
  convertJSONToRows,
  convertRowsToJSON,
} from '../../src/json-editor-logic.js';

describe('json-editor-logic', () => {
  describe('detectType', () => {
    it('detects booleans', () => {
      expect(detectType(true)).toBe('boolean');
      expect(detectType(false)).toBe('boolean');
    });

    it('treats null and undefined as string', () => {
      expect(detectType(null)).toBe('string');
      expect(detectType(undefined)).toBe('string');
    });

    it('detects tag list for arrays of single-word strings', () => {
      expect(detectType(['one', 'two', 'three'])).toBe('tag list');
    });

    it('detects array of strings for arrays with spaces', () => {
      expect(detectType(['hello world', 'foo bar'])).toBe('array of strings');
    });

    it('detects array of strings for arrays with non-strings', () => {
      expect(detectType([1, 2, 3])).toBe('array of strings');
    });

    it('detects location objects', () => {
      expect(detectType({ latitude: 1, longitude: 2, altitude: 3 })).toBe('location');
    });

    it('detects 3d coordinate objects', () => {
      expect(detectType({ x: 1, y: 2, z: 3 })).toBe('3d coordinates');
    });

    it('detects generic json objects', () => {
      expect(detectType({ foo: 'bar' })).toBe('json');
    });

    it('detects currency numbers', () => {
      expect(detectType(12.34)).toBe('currency');
      expect(detectType(0.99)).toBe('currency');
    });

    it('detects integers', () => {
      expect(detectType(42)).toBe('integer');
      expect(detectType(0)).toBe('integer');
      expect(detectType(-7)).toBe('integer');
    });

    it('detects floats', () => {
      expect(detectType(3.14159)).toBe('float');
      expect(detectType(12.3)).toBe('float');
    });

    it('detects URL strings', () => {
      expect(detectType('https://example.com')).toBe('url');
      expect(detectType('http://localhost:3000/path')).toBe('url');
    });

    it('detects datetime strings', () => {
      expect(detectType('2024-01-15T10:30:00Z')).toBe('datetime');
      expect(detectType('2024-01-15 10:30')).toBe('datetime');
    });

    it('detects date strings', () => {
      expect(detectType('2024-01-15')).toBe('date');
    });

    it('detects plain strings', () => {
      expect(detectType('hello')).toBe('string');
      expect(detectType('')).toBe('string');
    });

    it('detects objects with optionsUrl as json', () => {
      expect(detectType({ optionsUrl: 'options.json', value: 'active' })).toBe('json');
    });
  });

  describe('parseValue', () => {
    it('parses boolean values', () => {
      expect(parseValue(true, 'boolean')).toBe(true);
      expect(parseValue('true', 'boolean')).toBe(true);
      expect(parseValue(false, 'boolean')).toBe(false);
      expect(parseValue('false', 'boolean')).toBe(false);
      expect(parseValue('', 'boolean')).toBe(false);
    });

    it('parses numeric values', () => {
      expect(parseValue('42', 'number')).toBe(42);
      expect(parseValue('3.14', 'number')).toBe(3.14);
      expect(parseValue('abc', 'number')).toBe(0);
      expect(parseValue('', 'number')).toBe(0);
    });

    it('parses integer values', () => {
      expect(parseValue('42', 'integer')).toBe(42);
      expect(parseValue('3.9', 'integer')).toBe(3);
      expect(parseValue('abc', 'integer')).toBe(0);
    });

    it('parses float values', () => {
      expect(parseValue('3.14', 'float')).toBe(3.14);
      expect(parseValue('abc', 'float')).toBe(0);
    });

    it('parses currency values', () => {
      expect(parseValue('99.99', 'currency')).toBe(99.99);
      expect(parseValue('abc', 'currency')).toBe(0);
    });

    it('parses array of strings from comma-separated string', () => {
      expect(parseValue('a, b, c', 'array of strings')).toEqual(['a', 'b', 'c']);
      expect(parseValue('', 'array of strings')).toEqual([]);
    });

    it('parses array of strings from array input', () => {
      expect(parseValue(['x', 'y'], 'array of strings')).toEqual(['x', 'y']);
      expect(parseValue(123, 'array of strings')).toEqual([]);
    });

    it('parses tag list and rejects tags with spaces', () => {
      expect(parseValue('one, two, three', 'tag list')).toEqual(['one', 'two', 'three']);
      expect(parseValue(['hello world', 'foo'], 'tag list')).toEqual(['foo']);
    });

    it('parses location values', () => {
      expect(parseValue('', 'location')).toEqual({
        latitude: '0.00',
        longitude: '0.00',
        altitude: '0.00',
      });
      expect(parseValue('{"latitude":1.5,"longitude":2.5,"altitude":3.5}', 'location')).toEqual({
        latitude: '1.5',
        longitude: '2.5',
        altitude: '3.5',
      });
      expect(parseValue({ latitude: 1, longitude: 2 }, 'location')).toEqual({
        latitude: '1',
        longitude: '2',
        altitude: '0.00',
      });
      expect(parseValue('invalid json', 'location')).toEqual({
        latitude: '0.00',
        longitude: '0.00',
        altitude: '0.00',
      });
    });

    it('parses 3d coordinate values', () => {
      expect(parseValue('', '3d coordinates')).toEqual({
        x: '0.00',
        y: '0.00',
        z: '0.00',
      });
      expect(parseValue('{"x":1.5,"y":2.5,"z":3.5}', '3d coordinates')).toEqual({
        x: '1.5',
        y: '2.5',
        z: '3.5',
      });
      expect(parseValue({ x: 1, y: 2 }, '3d coordinates')).toEqual({
        x: '1',
        y: '2',
        z: '0.00',
      });
      expect(parseValue('invalid json', '3d coordinates')).toEqual({
        x: '0.00',
        y: '0.00',
        z: '0.00',
      });
    });

    it('parses json values', () => {
      expect(parseValue('{"foo":"bar"}', 'json')).toEqual({ foo: 'bar' });
      expect(parseValue('invalid', 'json')).toEqual({});
      expect(parseValue({ foo: 'bar' }, 'json')).toEqual({ foo: 'bar' });
    });

    it('parses date values', () => {
      const date = new Date('2024-01-15T00:00:00.000Z');
      expect(parseValue(date, 'date')).toBe('2024-01-15');
      expect(parseValue('2024-01-15', 'date')).toBe('2024-01-15');
      expect(parseValue('', 'date')).toBe('');
    });

    it('parses datetime values', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(parseValue(date, 'datetime')).toBe(date.toISOString());
      expect(parseValue('2024-01-15T10:30:00Z', 'datetime')).toBe('2024-01-15T10:30:00Z');
      expect(parseValue('', 'datetime')).toBe('');
    });

    it('parses url and string values', () => {
      expect(parseValue('https://example.com', 'url')).toBe('https://example.com');
      expect(parseValue('', 'url')).toBe('');
      expect(parseValue('hello', 'string')).toBe('hello');
      expect(parseValue('', 'string')).toBe('');
    });

    it('parses dropdown values as strings', () => {
      expect(parseValue('active', 'dropdown')).toBe('active');
      expect(parseValue('', 'dropdown')).toBe('');
    });
  });

  describe('validateValue', () => {
    it('considers empty values always valid', () => {
      expect(validateValue('', 'integer')).toBe(true);
      expect(validateValue(null, 'json')).toBe(true);
      expect(validateValue(undefined, 'url')).toBe(true);
    });

    it('validates numeric types', () => {
      expect(validateValue('42', 'number')).toBe(true);
      expect(validateValue('abc', 'number')).toBe(false);
      expect(validateValue('3.14', 'float')).toBe(true);
      expect(validateValue('42', 'integer')).toBe(true);
      expect(validateValue('3.14', 'integer')).toBe(false);
      expect(validateValue('99.99', 'currency')).toBe(true);
    });

    it('validates date and datetime types', () => {
      expect(validateValue('2024-01-15', 'date')).toBe(true);
      expect(validateValue('not a date', 'date')).toBe(false);
      expect(validateValue('2024-01-15T10:30:00Z', 'datetime')).toBe(true);
      expect(validateValue('invalid', 'datetime')).toBe(false);
    });

    it('validates URL type', () => {
      expect(validateValue('https://example.com', 'url')).toBe(true);
      expect(validateValue('not a url', 'url')).toBe(false);
    });

    it('validates location type', () => {
      expect(validateValue('{"latitude":1,"longitude":2,"altitude":3}', 'location')).toBe(true);
      expect(validateValue('{"latitude":1,"longitude":2}', 'location')).toBe(false);
      expect(validateValue('not json', 'location')).toBe(false);
    });

    it('validates 3d coordinates type', () => {
      expect(validateValue('{"x":1,"y":2,"z":3}', '3d coordinates')).toBe(true);
      expect(validateValue('{"x":1,"y":2}', '3d coordinates')).toBe(false);
      expect(validateValue('not json', '3d coordinates')).toBe(false);
    });

    it('validates json type', () => {
      expect(validateValue('{"foo":"bar"}', 'json')).toBe(true);
      expect(validateValue('not json', 'json')).toBe(false);
      expect(validateValue({ foo: 'bar' }, 'json')).toBe(true);
    });

    it('validates tag list type', () => {
      expect(validateValue('one, two, three', 'tag list')).toBe(true);
      expect(validateValue('hello world, foo', 'tag list')).toBe(false);
      expect(validateValue(['one', 'two'], 'tag list')).toBe(true);
      expect(validateValue(['hello world'], 'tag list')).toBe(false);
    });

    it('considers booleans, strings, and array of strings always valid', () => {
      expect(validateValue('anything', 'boolean')).toBe(true);
      expect(validateValue('anything', 'string')).toBe(true);
      expect(validateValue('a, b, c with spaces', 'array of strings')).toBe(true);
    });

    it('considers dropdown values always valid', () => {
      expect(validateValue('active', 'dropdown')).toBe(true);
      expect(validateValue('', 'dropdown')).toBe(true);
    });
  });

  describe('formatValueForInput', () => {
    it('formats arrays as comma-separated strings', () => {
      expect(formatValueForInput(['a', 'b', 'c'], 'array of strings')).toBe('a, b, c');
      expect(formatValueForInput(['a', 'b'], 'tag list')).toBe('a, b');
    });

    it('formats objects as pretty-printed JSON', () => {
      const obj = { foo: 'bar' };
      expect(formatValueForInput(obj, 'json')).toBe(JSON.stringify(obj, null, 2));
      expect(formatValueForInput(obj, 'location')).toBe(JSON.stringify(obj, null, 2));
      expect(formatValueForInput(obj, '3d coordinates')).toBe(JSON.stringify(obj, null, 2));
    });

    it('formats currency to two decimal places', () => {
      expect(formatValueForInput(99.9, 'currency')).toBe('99.90');
      expect(formatValueForInput('99.9', 'currency')).toBe('99.9');
    });

    it('formats integer to zero decimal places', () => {
      expect(formatValueForInput(42, 'integer')).toBe('42');
    });

    it('formats date values', () => {
      const date = new Date('2024-01-15T00:00:00.000Z');
      expect(formatValueForInput(date, 'date')).toBe('2024-01-15');
    });

    it('formats datetime values to datetime-local input format', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const pad = (n) => String(n).padStart(2, '0');
      const expected = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      expect(formatValueForInput(date, 'datetime')).toBe(expected);
    });

    it('passes through already-formatted datetime strings', () => {
      expect(formatValueForInput('2024-01-15T10:30', 'datetime')).toBe('2024-01-15T10:30');
    });

    it('returns value unchanged for unknown types', () => {
      expect(formatValueForInput('hello', 'string')).toBe('hello');
      expect(formatValueForInput(42, 'unknown')).toBe(42);
    });

    it('formats dropdown values as strings', () => {
      expect(formatValueForInput('active', 'dropdown')).toBe('active');
      expect(formatValueForInput('', 'dropdown')).toBe('');
    });
  });

  describe('convertJSONToRows', () => {
    it('converts a JSON object to editor rows', () => {
      const rows = convertJSONToRows({
        name: 'John',
        age: 30,
        active: true,
        tags: ['one', 'two'],
      });

      expect(rows).toEqual([
        { key: 'name', type: 'string', value: 'John' },
        { key: 'age', type: 'integer', value: 30 },
        { key: 'active', type: 'boolean', value: true },
        { key: 'tags', type: 'tag list', value: ['one', 'two'] },
      ]);
    });

    it('returns an empty array for an empty object', () => {
      expect(convertJSONToRows({})).toEqual([]);
    });

    it('loads schema array format with optionsUrl', () => {
      const rows = convertJSONToRows([
        { key: 'name', type: 'string', value: 'Task' },
        { key: 'status', type: 'dropdown', value: 'active', optionsUrl: 'options.json' },
      ]);

      expect(rows).toEqual([
        { key: 'name', type: 'string', value: 'Task', optionsUrl: '', endpoint: '' },
        { key: 'status', type: 'dropdown', value: 'active', optionsUrl: 'options.json', endpoint: '' },
      ]);
    });
  });

  describe('convertRowsToJSON', () => {
    it('converts rows back to a JSON object', () => {
      const json = convertRowsToJSON([
        { key: 'name', type: 'string', value: 'John' },
        { key: 'age', type: 'integer', value: '30' },
        { key: 'active', type: 'boolean', value: 'true' },
      ]);

      expect(json).toEqual({
        name: 'John',
        age: 30,
        active: true,
      });
    });

    it('skips rows with empty keys', () => {
      const json = convertRowsToJSON([
        { key: 'name', type: 'string', value: 'John' },
        { key: '', type: 'string', value: 'ignored' },
      ]);

      expect(json).toEqual({ name: 'John' });
    });

    it('returns an empty object for empty rows', () => {
      expect(convertRowsToJSON([])).toEqual({});
    });
  });
});
