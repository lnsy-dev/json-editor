/**
 * YAML Converter Unit Tests
 *
 * Unit tests for the pure YAML/JSON conversion logic in src/yaml-converter.js.
 *
 * These tests run in Node with Vitest and are the suite that Stryker
 * mutates, so every branch should be pinned down by an exact assertion.
 */

import { describe, it, expect, vi } from 'vitest';
import YAMLConverter from '../../src/yaml-converter.js';

describe('YAMLConverter', () => {
  describe('constructor', () => {
    it('initializes with empty data object', () => {
      const converter = new YAMLConverter();
      expect(converter.getData()).toEqual({});
    });
  });

  describe('setYaml / getData', () => {
    it('parses a valid YAML string into data', () => {
      const converter = new YAMLConverter();
      const yaml = `name: Jane Smith
age: 28
tags:
  - manager
  - analyst
isActive: true`;

      const result = converter.setYaml(yaml);

      expect(result).toBe(true);
      expect(converter.getData()).toEqual({
        name: 'Jane Smith',
        age: 28,
        tags: ['manager', 'analyst'],
        isActive: true,
      });
    });

    it('returns false and logs an error for invalid YAML', () => {
      const converter = new YAMLConverter();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = converter.setYaml('not: valid: yaml:[');

      expect(result).toBe(false);
      expect(converter.getData()).toEqual({});
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getYaml', () => {
    it('serializes data to a YAML string', () => {
      const converter = new YAMLConverter();
      converter.setData({
        name: 'John',
        age: 30,
        active: true,
      });

      const yaml = converter.getYaml();

      expect(yaml).toContain('name: John');
      expect(yaml).toContain('age: 30');
      expect(yaml).toContain('active: true');
    });

    it('returns empty string when serialization fails', () => {
      const converter = new YAMLConverter();
      const circular = {};
      circular.self = circular;
      converter.setData(circular);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = converter.getYaml();

      expect(result).toBe('');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('setJSON / getData', () => {
    it('parses a valid JSON string into data', () => {
      const converter = new YAMLConverter();
      const json = '{"name":"John","age":30,"active":false}';

      const result = converter.setJSON(json);

      expect(result).toBe(true);
      expect(converter.getData()).toEqual({
        name: 'John',
        age: 30,
        active: false,
      });
    });

    it('returns false for invalid JSON', () => {
      const converter = new YAMLConverter();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = converter.setJSON('{not json');

      expect(result).toBe(false);
      expect(converter.getData()).toEqual({});
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getJSON', () => {
    it('serializes data to a formatted JSON string', () => {
      const converter = new YAMLConverter();
      converter.setData({ name: 'Jane', age: 28 });

      const json = converter.getJSON();

      expect(JSON.parse(json)).toEqual({ name: 'Jane', age: 28 });
      expect(json).toContain('\n');
    });

    it('returns empty string when JSON serialization fails', () => {
      const converter = new YAMLConverter();
      const circular = {};
      circular.self = circular;
      converter.setData(circular);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = converter.getJSON();

      expect(result).toBe('');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('setData / getData', () => {
    it('round-trips arbitrary data', () => {
      const converter = new YAMLConverter();
      const data = { nested: { key: ['a', 'b'] } };

      converter.setData(data);

      expect(converter.getData()).toEqual(data);
    });
  });
});
