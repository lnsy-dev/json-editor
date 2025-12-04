# FOR-LLMS.md

## @lnsy/json-editor - Implementation Guide for LLMs

This document provides implementation guidance for Large Language Models helping developers use the `@lnsy/json-editor` package.

---

## Package Overview

**Package Name:** `@lnsy/json-editor`  
**Version:** 0.5.5  
**Type:** Web Component (Custom Element)  
**Purpose:** Visual JSON/YAML editor with row-based interface, type validation, and bi-directional format conversion

---

## Installation

```bash
npm install @lnsy/json-editor
```

---

## Basic Implementation

### 1. Import the Component

The package exports a bundled JavaScript file that registers the custom element. Import it in your JavaScript:

```javascript
// ES Module import
import '@lnsy/json-editor/dist/main.min.js';
```

Or include it directly in HTML:

```html
<script type="module" src="node_modules/@lnsy/json-editor/dist/main.min.js"></script>
```

### 2. Add the Custom Element to HTML

```html
<!-- Empty editor -->
<json-editor></json-editor>

<!-- Load JSON from URL -->
<json-editor src="path/to/data.json"></json-editor>
```

---

## Component API

### Attributes

- **`src`** (optional): URL to load JSON data from

### Methods

#### Data Loading

**`setJSON(jsonString)`**
- Loads data from a JSON string
- Parameters: `jsonString` (string) - Valid JSON string
- Returns: `boolean` - Success status
- Example:
  ```javascript
  const editor = document.querySelector('json-editor');
  const success = editor.setJSON('{"name": "John", "age": 30}');
  ```

**`setYaml(yamlString)`**
- Loads data from a YAML string
- Parameters: `yamlString` (string) - Valid YAML string
- Returns: `boolean` - Success status
- Example:
  ```javascript
  const editor = document.querySelector('json-editor');
  const success = editor.setYaml('name: Jane\nage: 28');
  ```

#### Data Export

**`getJSON()`**
- Exports current editor data as JSON string
- Returns: `string` - Formatted JSON (2-space indent)
- Example:
  ```javascript
  const jsonString = editor.getJSON();
  console.log(jsonString);
  ```

**`getYaml()`**
- Exports current editor data as YAML string
- Returns: `string` - Formatted YAML
- Example:
  ```javascript
  const yamlString = editor.getYaml();
  console.log(yamlString);
  ```

**`exportJSON()`**
- Returns current data as JavaScript object (not string)
- Returns: `Object` - Raw data object
- Example:
  ```javascript
  const dataObject = editor.exportJSON();
  ```

### Events

**`JSON-UPDATED`**
- Fired whenever editor data changes (add/edit/delete rows)
- Event detail: `{ json: Object }` - Current data as object
- Example:
  ```javascript
  editor.addEventListener('JSON-UPDATED', (event) => {
    console.log('Data changed:', event.detail.json);
  });
  ```

---

## Supported Data Types

The editor auto-detects and validates these types:

| Type | Description | Input Type | Validation |
|------|-------------|------------|------------|
| **string** | Text values | text | Always valid |
| **number** | Numeric values | number | Must be valid number |
| **boolean** | True/false | checkbox | Always valid |
| **currency** | Decimal with 2 places | number (step=0.01) | Must be valid number |
| **date** | Date only (YYYY-MM-DD) | date | Must be valid date |
| **datetime** | Date and time | datetime-local | Must be valid datetime |
| **url** | Web URLs | url | Must be valid URL |
| **array of strings** | Comma-separated list | text | Always valid |
| **tag list** | Single-word tags | text | No spaces in tags |
| **location** | Lat/long/altitude JSON | textarea | Must have all 3 fields |
| **json** | Nested JSON objects | textarea | Must be valid JSON |

### Type Detection Logic

When loading data, the component automatically detects types:

- **boolean**: JavaScript boolean values
- **number**: Numeric values (detects currency if has 2 decimal places)
- **array**: Arrays (detects tag list if all items are single words)
- **object**: Objects (detects location if has latitude/longitude/altitude keys)
- **string**: Checks for URL format, datetime format (with time), or date format
- **Default**: Falls back to string type

---

## Complete Usage Example

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>JSON Editor Example</title>
  <script type="module" src="node_modules/@lnsy/json-editor/dist/main.min.js"></script>
</head>
<body>
  <h1>JSON Editor Demo</h1>
  
  <div>
    <button id="load-json">Load JSON</button>
    <button id="load-yaml">Load YAML</button>
    <button id="export-json">Export JSON</button>
    <button id="export-yaml">Export YAML</button>
  </div>

  <json-editor id="editor"></json-editor>

  <pre id="output"></pre>

  <script type="module">
    const editor = document.getElementById('editor');
    const output = document.getElementById('output');

    // Sample data
    const sampleJSON = JSON.stringify({
      name: "Alice",
      age: 25,
      email: "alice@example.com",
      isActive: true,
      salary: 75000.50,
      tags: ["developer", "designer"],
      website: "https://example.com"
    }, null, 2);

    const sampleYAML = `name: Bob
age: 30
email: bob@example.com
isActive: false
salary: 85000.75
tags:
  - manager
  - analyst
website: https://example.org`;

    // Load JSON
    document.getElementById('load-json').addEventListener('click', () => {
      editor.setJSON(sampleJSON);
    });

    // Load YAML
    document.getElementById('load-yaml').addEventListener('click', () => {
      editor.setYaml(sampleYAML);
    });

    // Export JSON
    document.getElementById('export-json').addEventListener('click', () => {
      output.textContent = editor.getJSON();
    });

    // Export YAML
    document.getElementById('export-yaml').addEventListener('click', () => {
      output.textContent = editor.getYaml();
    });

    // Listen for changes
    editor.addEventListener('JSON-UPDATED', (event) => {
      console.log('Editor updated:', event.detail.json);
    });
  </script>
</body>
</html>
```

---

## User Interaction Features

The visual editor provides:

1. **Add Row**: Click the `+` button to add new key-value pairs
2. **Type Selection**: Dropdown with icons for each data type
3. **Validation**: Real-time validation with ✓ (valid) or ✗ (invalid) indicators
4. **Delete Row**: Click the `×` button to remove a row
5. **Type Conversion**: Changing type attempts to convert existing value

---

## Common Implementation Patterns

### Pattern 1: Form Integration

```javascript
const form = document.querySelector('form');
const editor = document.querySelector('json-editor');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const jsonData = editor.getJSON();
  
  // Send to server
  fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonData
  });
});
```

### Pattern 2: Configuration Editor

```javascript
// Load existing config
fetch('/api/config')
  .then(res => res.json())
  .then(config => {
    const editor = document.querySelector('json-editor');
    editor.setJSON(JSON.stringify(config));
  });

// Auto-save on changes
editor.addEventListener('JSON-UPDATED', debounce((event) => {
  fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event.detail.json)
  });
}, 1000));
```

### Pattern 3: YAML/JSON Converter Tool

```javascript
const editor = document.querySelector('json-editor');
const formatToggle = document.querySelector('#format-toggle');
const output = document.querySelector('#output');

formatToggle.addEventListener('change', (e) => {
  if (e.target.value === 'json') {
    output.textContent = editor.getJSON();
  } else {
    output.textContent = editor.getYaml();
  }
});
```

---

## Dependencies

The package has two runtime dependencies:

- **dataroom-js** (^0.6.0): Custom element framework
- **js-yaml** (^4.1.0): YAML parsing and conversion

These are bundled in the distributed file, so no additional imports are needed.

---

## Styling

The component includes default styles. To customize:

```css
/* Override CSS variables */
json-editor {
  --primary-color: #007bff;
  --border-color: #ddd;
  --error-color: #dc3545;
}

/* Target specific elements */
json-editor .json-editor-row {
  padding: 0.5em;
}

json-editor .json-editor-key {
  font-weight: bold;
}
```

---

## Troubleshooting

### Issue: Component not rendering
- Ensure the script is loaded as a module: `<script type="module">`
- Check browser console for errors
- Verify the custom element is registered: `customElements.get('json-editor')`

### Issue: setJSON/setYaml returns false
- Validate the input string is properly formatted
- Check console for parsing errors
- Ensure strings are properly escaped

### Issue: Validation showing errors
- Check the value matches the selected type
- For JSON/location types, ensure valid JSON syntax
- For tag lists, ensure no spaces in individual tags
- For URLs, include protocol (https://)

---

## Best Practices for LLM Assistance

When helping developers implement this component:

1. **Always use `type="module"`** for script tags
2. **Check method return values** - setJSON/setYaml return boolean success status
3. **Use event listeners** for reactive updates rather than polling
4. **Validate data types** - the component is strict about type validation
5. **Format strings correctly** - JSON must be valid JSON, YAML must be valid YAML
6. **Handle errors gracefully** - wrap setJSON/setYaml in try-catch or check return value

---

## Version Information

This guide is for version **0.5.5** of `@lnsy/json-editor`.

For updates and issues, see: https://github.com/DATAROOM-NETWORK/json-editor
