/**
 * JSON Editor Logic
 *
 * Pure logic extracted from the json-editor component for testability.
 * These functions have no DOM dependencies and can be exercised by the
 * Vitest unit suite and Stryker mutation tests.
 */

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
    if (
      value.every((item) => typeof item === 'string' && !item.includes(' '))
    ) {
      return 'tag list';
    }
    return 'array of strings';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (['latitude', 'longitude', 'altitude'].every((k) => keys.includes(k))) {
      return 'location';
    }
    return 'json';
  }
  if (typeof value === 'number') {
    // Check if it might be currency (has 2 decimal places)
    if (value.toString().match(/^\d+\.\d{2}$/)) {
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
    } catch { }
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
      return parseFloat(value) || 0.0;
    case 'array of strings':
      if (typeof value === 'string') {
        return value
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s);
      }
      return Array.isArray(value) ? value : [];
    case 'tag list':
      if (typeof value === 'string') {
        return value
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s && !s.includes(' '));
      }
      return Array.isArray(value)
        ? value.filter((s) => !s.includes(' '))
        : [];
    case 'location':
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') {
          return { latitude: '0.00', longitude: '0.00', altitude: '0.00' };
        }
        try {
          const obj = JSON.parse(value);
          return {
            latitude: String(obj?.latitude ?? '0.00'),
            longitude: String(obj?.longitude ?? '0.00'),
            altitude: String(obj?.altitude ?? '0.00'),
          };
        } catch {
          return { latitude: '0.00', longitude: '0.00', altitude: '0.00' };
        }
      }
      if (typeof value === 'object' && value !== null) {
        return {
          latitude: String(value.latitude ?? '0.00'),
          longitude: String(value.longitude ?? '0.00'),
          altitude: String(value.altitude ?? '0.00'),
        };
      }
      return { latitude: '0.00', longitude: '0.00', altitude: '0.00' };
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
      return !isNaN(parseFloat(value)) && isFinite(value);
    case 'float':
      return !isNaN(parseFloat(value)) && isFinite(value);
    case 'integer':
      return Number.isInteger(parseFloat(value));
    case 'currency':
      const currencyVal = parseFloat(value);
      return !isNaN(currencyVal) && isFinite(currencyVal);
    case 'date':
      const date = new Date(value);
      return date instanceof Date && !isNaN(date);
    case 'datetime':
      const dt = new Date(value);
      return dt instanceof Date && !isNaN(dt);
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
    case 'location':
      try {
        const obj = typeof value === 'string' ? JSON.parse(value) : value;
        if (!obj || typeof obj !== 'object') return false;
        const hasKeys = ['latitude', 'longitude', 'altitude'].every((k) => Object.prototype.hasOwnProperty.call(obj, k));
        if (!hasKeys) return false;
        const vals = [obj.latitude, obj.longitude, obj.altitude];
        return vals.every((v) => v === '' || v === null || v === undefined || !isNaN(parseFloat(v)));
      } catch {
        return false;
      }
    case 'json':
      try {
        if (typeof value === 'string') {
          JSON.parse(value);
        }
        return true;
      } catch {
        return false;
      }
    case 'tag list':
      const tags =
        typeof value === 'string'
          ? value
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s)
          : Array.isArray(value)
            ? value
            : [];
      return tags.every((tag) => !tag.includes(' '));
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
      return Array.isArray(value) ? value.join(', ') : value;
    case 'location':
    case 'json':
      return typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : value;
    case 'currency':
      return typeof value === 'number' ? value.toFixed(2) : value;
    case 'float':
      return typeof value === 'number' ? value : value;
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
      // Convert to input[type=datetime-local] format (YYYY-MM-DDTHH:MM) in local time when possible
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
    default:
      return value;
  }
}

/**
 * Convert a JSON object into editor rows.
 *
 * @param {Object} jsonData - The JSON data object
 * @returns {Array<{key: string, type: string, value: *}>} - Editor rows
 */
export function convertJSONToRows(jsonData) {
  // Schema format: array of { key, type, value, optionsUrl? }
  if (Array.isArray(jsonData)) {
    return jsonData.map((row) => ({
      key: row.key || '',
      type: row.type || 'string',
      value: row.value,
      optionsUrl: row.optionsUrl || '',
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
