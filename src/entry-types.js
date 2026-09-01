/**
 * Entry Type Registry
 *
 * Single source of truth for the value types supported by the json-editor.
 * The json-entry-dropdown component renders this list, and the unit suite
 * uses it to verify that every registered type is fully handled by the
 * parse / validate / format logic, so the UI and the logic can never drift
 * apart.
 *
 * Each entry:
 * - value:  the canonical type identifier used by rows, logic and events
 * - label:  human-readable label shown in the dropdown menu
 * - iconKey: key into src/icons.js
 * - name:   name attribute for the menu item
 */

export const ENTRY_TYPES = [
  { value: 'string', iconKey: 'text', label: 'String', name: 'string' },
  { value: 'number', iconKey: 'number', label: 'Number', name: 'number' },
  { value: 'float', iconKey: 'float', label: 'Float', name: 'float' },
  { value: 'integer', iconKey: 'integer', label: 'Integer', name: 'integer' },
  { value: 'date', iconKey: 'calendar', label: 'Date', name: 'date' },
  { value: 'datetime', iconKey: 'datetime', label: 'Datetime', name: 'datetime' },
  { value: 'array of strings', iconKey: 'array', label: 'Array of strings', name: 'array of strings' },
  { value: 'tag list', iconKey: 'tag', label: 'Tag list', name: 'tag list' },
  { value: 'url', iconKey: 'link', label: 'URL', name: 'url' },
  { value: 'dropdown', iconKey: 'dropdown', label: 'Dropdown', name: 'dropdown' },
  { value: 'fuzzy search', iconKey: 'search', label: 'Fuzzy search', name: 'fuzzy search' },
  { value: 'fuzzy tag search', iconKey: 'tag', label: 'Fuzzy tag search', name: 'fuzzy tag search' },
  { value: 'location', iconKey: 'globe', label: 'Location', name: 'location' },
  { value: '3d coordinates', iconKey: '3d', label: '3D Coordinates', name: '3d coordinates' },
  { value: 'json', iconKey: 'json', label: 'JSON', name: 'json' },
  { value: 'currency', iconKey: 'currency', label: 'currency', name: 'currency' },
  { value: 'boolean', iconKey: 'checkbox', label: 'Boolean', name: 'boolean' },
];

/**
 * The set of canonical type identifiers.
 *
 * @returns {string[]} All registered type values
 */
export function entryTypeValues() {
  return ENTRY_TYPES.map((entry) => entry.value);
}
