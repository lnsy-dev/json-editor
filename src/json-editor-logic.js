/**
 * JSON Editor Logic
 *
 * Pure logic extracted from the json-editor component for testability.
 * These functions have no DOM dependencies and can be exercised by the
 * Vitest unit suite and Stryker mutation tests.
 */

import { parseFuzzyValue } from './fuzzy-search-logic.js';

/** Field names for the two coordinate-like types. */
const COORDINATE_FIELDS = {
  location: ['latitude', 'longitude', 'altitude'],
  '3d coordinates': ['x', 'y', 'z'],
};

/** Default value shown for an unset coordinate field. */
const COORDINATE_DEFAULT = '0.00';

/**
 * Split a comma-separated string into a trimmed list of non-empty items.
 *
 * @param {string} value - The comma-separated input
 * @returns {string[]} The split items
 */
function splitCommaList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item);
}

/**
 * Detect the display/edit type of a value.
 *
 * @param {*} value - The value to classify
 * @returns {string} - The detected type label
 */
export function detectType(value) {
  if (typeof value === 'boolean') return 'boolean';
  if (value === null || value === undefined) return 'string';
  if (Array.isArray(value)) {
    // Check if it's a tag list (array of single words)
    if (value.every((item) => typeof item === 'string' && !item.includes(' '))) {
      return 'tag list';
    }
    return 'array of strings';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (COORDINATE_FIELDS.location.every((k) => keys.includes(k))) {
      return 'location';
    }
    if (COORDINATE_FIELDS['3d coordinates'].every((k) => keys.includes(k))) {
      return '3d coordinates';
    }
    return 'json';
  }
  if (typeof value === 'number') {
    // Check if it might be currency (has 2 decimal places)
    if (/^\d+\.\d{2}$/.test(value.toString())) {
      return 'currency';
    }
    if (Number.isInteger(value)) {
      return 'integer';
    }
    return 'float';
  }
  if (typeof value === 'string') {
    // Check if it's a URL
    try {
      new URL(value);
      return 'url';
    } catch {
      // Not a URL; fall through to date/datetime checks
    }
    // Check if it's a datetime (has time component)
    if (!isNaN(Date.parse(value)) && (value.includes('T') || value.match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/))) {
      return 'datetime';
    }
    // Check if it's a date
    if (!isNaN(Date.parse(value)) && value.match(/\d{4}-\d{2}-\d{2}/)) {
      return 'date';
    }
    return 'string';
  }
  return 'string';
}

/**
 * Slice a numeric value to at most two decimal places (truncation, not
 * rounding) to enforce currency standards.
 *
 * @param {*} value - The value to slice
 * @returns {number} - The value with at most two decimal digits
 */
export function sliceCurrencyDigits(value) {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return 0.0;
  const [intPart, decPart = ''] = num.toString().split('.');
  if (decPart.length <= 2) return num;
  return parseFloat(`${intPart}.${decPart.slice(0, 2)}`);
}

/**
 * Parse a coordinate-like value (location / 3d coordinates) into an object
 * with every field present as a string.
 *
 * @param {*} value - The raw value (JSON string, object, or other)
 * @param {string[]} fields - The coordinate field names
 * @returns {Object} - Object mapping every field to a string
 */
function parseCoordinateValue(value, fields) {
  const result = {};
  for (const field of fields) {
    result[field] = COORDINATE_DEFAULT;
  }
  let obj = null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed !== '') {
      try {
        obj = JSON.parse(trimmed);
      } catch {
        obj = null;
      }
    }
  } else if (typeof value === 'object' && value !== null) {
    obj = value;
  }
  if (obj) {
    for (const field of fields) {
      if (obj[field] !== undefined && obj[field] !== null) {
        result[field] = String(obj[field]);
      }
    }
  }
  return result;
}

/**
 * Validate a coordinate-like value: parseable object that carries all
 * required fields, each of them empty or numeric.
 *
 * @param {*} value - The raw value (JSON string or object)
 * @param {string[]} fields - The coordinate field names
 * @returns {boolean} - Whether the value is a valid coordinate object
 */
function validateCoordinateValue(value, fields) {
  try {
    const obj = typeof value === 'string' ? JSON.parse(value) : value;
    if (!obj || typeof obj !== 'object') return false;
    const hasKeys = fields.every((field) =>
      Object.prototype.hasOwnProperty.call(obj, field),
    );
    if (!hasKeys) return false;
    return fields.every((field) => {
      const v = obj[field];
      return v === '' || v === null || v === undefined || !isNaN(parseFloat(v));
    });
  } catch {
    return false;
  }
}

/**
 * Parse a raw value into the representation used by a given type.
 *
 * @param {*} value - The raw value
 * @param {string} type - The target type label
 * @returns {*} - The parsed value
 */
export function parseValue(value, type) {
  switch (type) {
    case 'boolean':
      return value === true || value === 'true';
    case 'number':
      return parseFloat(value) || 0;
    case 'float':
      return parseFloat(value) || 0.0;
    case 'integer':
      return parseInt(value, 10) || 0;
    case 'currency':
      return sliceCurrencyDigits(parseFloat(value) || 0.0);
    case 'array of strings':
      if (typeof value === 'string') {
        return splitCommaList(value);
      }
      return Array.isArray(value) ? value.map((item) => String(item)) : [];
    case 'tag list':
      if (typeof value === 'string') {
        return splitCommaList(value).filter((tag) => !tag.includes(' '));
      }
      return Array.isArray(value)
        ? value
            .map((tag) => String(tag))
            .filter((tag) => tag && !tag.includes(' '))
        : [];
    case 'location':
      return parseCoordinateValue(value, COORDINATE_FIELDS.location);
    case '3d coordinates':
      return parseCoordinateValue(value, COORDINATE_FIELDS['3d coordinates']);
    case 'json':
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      }
      return typeof value === 'object' ? value : {};
    case 'date':
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }
      return value || '';
    case 'datetime':
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value || '';
    case 'url':
      return value || '';
    case 'dropdown':
      return value || '';
    case 'fuzzy search':
    case 'fuzzy tag search':
      return parseFuzzyValue(value);
    case 'string':
    default:
      return value || '';
  }
}

/**
 * Validate a raw value against a given type.
 *
 * @param {*} value - The value to validate
 * @param {string} type - The type label to validate against
 * @returns {boolean} - Whether the value is valid for the type
 */
export function validateValue(value, type) {
  // Empty values are always valid
  if (value === '' || value === null || value === undefined) return true;

  switch (type) {
    case 'boolean':
      return true;
    case 'number':
    case 'float':
      return !isNaN(parseFloat(value)) && isFinite(value);
    case 'integer':
      return Number.isInteger(parseFloat(value));
    case 'currency':
      return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
    case 'date':
    case 'datetime':
      return !isNaN(new Date(value).getTime());
    case 'url':
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    case 'dropdown':
    case 'string':
      return true; // These are always valid
    case 'fuzzy search':
    case 'fuzzy tag search':
      return true;
    case 'location':
      return validateCoordinateValue(value, COORDINATE_FIELDS.location);
    case '3d coordinates':
      return validateCoordinateValue(value, COORDINATE_FIELDS['3d coordinates']);
    case 'json':
      try {
        if (typeof value === 'string') {
          JSON.parse(value);
        }
        return true;
      } catch {
        return false;
      }
    case 'tag list': {
      const tags =
        typeof value === 'string'
          ? splitCommaList(value)
          : Array.isArray(value)
            ? value
            : [];
      return tags.every((tag) => !String(tag).includes(' '));
    }
    case 'array of strings':
      return true;
    default:
      return true;
  }
}

/**
 * Format a parsed value for display in an input control.
 *
 * @param {*} value - The value to format
 * @param {string} type - The type label
 * @returns {*} - The formatted value
 */
export function formatValueForInput(value, type) {
  switch (type) {
    case 'array of strings':
    case 'tag list':
    case 'fuzzy search':
    case 'fuzzy tag search':
      return Array.isArray(value) ? value.join(', ') : value;
    case 'location':
    case 'json':
    case '3d coordinates':
      return typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : value;
    case 'currency':
      return typeof value === 'number'
        ? sliceCurrencyDigits(value).toFixed(2)
        : value;
    case 'integer':
      return typeof value === 'number' ? value.toFixed(0) : value;
    case 'date':
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }
      return value;
    case 'dropdown':
      return value || '';
    case 'datetime':
      return formatDatetimeLocal(value);
    default:
      return value;
  }
}

/**
 * Convert a datetime value to input[type=datetime-local] format
 * (YYYY-MM-DDTHH:MM) in local time when possible.
 *
 * @param {*} value - A Date, a datetime string, or anything else
 * @returns {*} The formatted string, or the value unchanged
 */
function formatDatetimeLocal(value) {
  const formatLocal = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  if (value instanceof Date) {
    return formatLocal(value);
  }
  if (typeof value === 'string') {
    // If already in acceptable format, return as-is
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (!isNaN(d)) return formatLocal(d);
  }
  return value;
}

/**
 * Convert a JSON object into editor rows.
 *
 * @param {Object} jsonData - The JSON data object
 * @returns {Array<{key: string, type: string, value: *}>} - Editor rows
 */
export function convertJSONToRows(jsonData) {
  // Schema format: array of { key, type, value, optionsUrl?, endpoint? }
  if (Array.isArray(jsonData)) {
    return jsonData.map((row) => ({
      key: row.key || '',
      type: row.type || 'string',
      value: row.value,
      optionsUrl: row.optionsUrl || '',
      endpoint: row.endpoint || '',
    }));
  }

  const rows = [];
  for (const [key, value] of Object.entries(jsonData)) {
    rows.push({
      key: key,
      type: detectType(value),
      value: value,
    });
  }
  return rows;
}

/**
 * Convert editor rows back into a JSON object.
 *
 * @param {Array<{key: string, type: string, value: *}>} rows - Editor rows
 * @returns {Object} - The resulting JSON object
 */
export function convertRowsToJSON(rows) {
  const json = {};
  rows.forEach((row) => {
    if (row.key) {
      json[row.key] = parseValue(row.value, row.type);
    }
  });
  return json;
}
