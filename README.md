

# JSON Editor

A visual JSON/YAML editor built with vanilla JavaScript. Edit structured data using an intuitive row-based interface with type selection, validation, and bi-directional YAML/JSON conversion.





## Installation

Clone the Repository: 

To install the project dependencies, run the following command:

```bash
git clone git@github.com:lnsy-dev/pochade-js.git
```

or use the  "Use Template" function on Github and clone that repository.

```bash
npm install
```

## Running the Project

To run the project in development mode, use the following command:

```bash
npm run start
```

This will start a development server. By default, it runs on port 3000. You can view the project in your browser.

## Building the Project

To build the project for production, use the following command:

```bash
npm run build
```

This will create a `dist` folder with the bundled and optimized files.

## Customizing the Build

You can customize the build output by creating a `.env` file in the root of the project.

### Output Filename

To change the name of the output file, set the `OUTPUT_FILE_NAME` variable in your `.env` file.

**.env**
```
OUTPUT_FILE_NAME=my-custom-filename.js
```

If this variable is not set, the output file will default to `dist/main.min.js`.

### Development Server Port

You can also change the development server port by setting the `PORT` variable in your `.env` file.

**.env**
```
PORT=8080
```

If this variable is not set, the port will default to `3000`.

## Usage

### Basic Usage

Add the `<json-editor>` custom element to your HTML:

```html
<json-editor></json-editor>
```

Or load JSON from a URL:

```html
<json-editor src="path/to/data.json"></json-editor>
```

### Visual Editor Features

The JSON editor provides a row-based interface where each row represents a key-value pair:

- **Add rows**: Click the `+` button to add new key-value pairs
- **Type selection**: Choose from multiple data types (string, number, boolean, date, datetime, url, array, json, etc.)
- **Validation**: Real-time validation with visual indicators (✓ for valid, ✗ for invalid)
- **Delete rows**: Click the `×` button to remove a row

### Supported Data Types

- **string** - Text values
- **number** - Numeric values
- **boolean** - True/false checkbox
- **currency** - Decimal values with 2 decimal places
- **date** - Date picker (YYYY-MM-DD)
- **datetime** - Date and time picker
- **url** - URL with validation
- **array of strings** - Comma-separated list
- **tag list** - Comma-separated tags (single words only)
- **location** - JSON object with latitude, longitude, altitude
- **json** - Nested JSON objects

### YAML/JSON Conversion API

The editor supports programmatic conversion between YAML and JSON formats:

```javascript
const editor = document.querySelector('json-editor');

// Load data from JSON string
const jsonString = '{"name": "John", "age": 30}';
editor.setJSON(jsonString);

// Load data from YAML string
const yamlString = 'name: Jane\nage: 28';
editor.setYaml(yamlString);

// Export current data as JSON
const json = editor.getJSON();
console.log(json);

// Export current data as YAML
const yaml = editor.getYaml();
console.log(yaml);
```

### Events

The editor emits a `JSON-UPDATED` event whenever data changes:

```javascript
const editor = document.querySelector('json-editor');

editor.addEventListener('JSON-UPDATED', (event) => {
  console.log('Data updated:', event.detail.json);
});
```

### Example Application

See `index.html` for a complete example with test buttons that demonstrate:
- Loading sample JSON data
- Loading sample YAML data
- Converting editor content to JSON
- Converting editor content to YAML

## Dependencies

- **dataroom-js** - Custom element framework
- **js-yaml** - YAML parsing and conversion
- **@rspack/cli** - Build tool

## Icons

Globe by Komardews from <a href="https://thenounproject.com/browse/icons/term/globe/" target="_blank" title="Globe Icons">Noun Project</a> (CC BY 3.0)

text by Gregor Cresnar from <a href="https://thenounproject.com/browse/icons/term/text/" target="_blank" title="text Icons">Noun Project</a> (CC BY 3.0)

Calendar by Feri Saputra from <a href="https://thenounproject.com/browse/icons/term/calendar/" target="_blank" title="Calendar Icons">Noun Project</a> (CC BY 3.0)

Tag by Yo! Baba from <a href="https://thenounproject.com/browse/icons/term/tag/" target="_blank" title="Tag Icons">Noun Project</a> (CC BY 3.0)

array by YOSHA from <a href="https://thenounproject.com/browse/icons/term/array/" target="_blank" title="array Icons">Noun Project</a> (CC BY 3.0)

link by Hassan ali from <a href="https://thenounproject.com/browse/icons/term/link/" target="_blank" title="link Icons">Noun Project</a> (CC BY 3.0)

json by Lourenchyus from <a href="https://thenounproject.com/browse/icons/term/json/" target="_blank" title="json Icons">Noun Project</a> (CC BY 3.0)


currency by fahmionline from <a href="https://thenounproject.com/browse/icons/term/currency/" target="_blank" title="currency Icons">Noun Project</a> (CC BY 3.0)

checkbox on by Jan Klever from <a href="https://thenounproject.com/browse/icons/term/checkbox-on/" target="_blank" title="checkbox on Icons">Noun Project</a> (CC BY 3.0)

Number by Mustofa Bayu from <a href="https://thenounproject.com/browse/icons/term/number/" target="_blank" title="Number Icons">Noun Project</a> (CC BY 3.0)

Time by Nursila from <a href="https://thenounproject.com/browse/icons/term/time/" target="_blank" title="Time Icons">Noun Project</a> (CC BY 3.0)
