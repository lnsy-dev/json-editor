
class MockJSONEditor {
    constructor() {
        this.rows = [
            { key: "name", type: "string", value: "John Doe" },
            { key: "age", type: "number", value: "30" },
            { key: "isActive", type: "boolean", value: "true" }
        ];
    }

    parseValue(value, type) {
        // Simplified parseValue from the actual component for testing logic
        if (type === 'number') return parseFloat(value);
        if (type === 'boolean') return value === 'true';
        return value;
    }

    exportJSONWithSchema() {
        return this.rows.map(row => ({
            key: row.key,
            type: row.type,
            value: this.parseValue(row.value, row.type)
        }));
    }
}

const editor = new MockJSONEditor();
const result = editor.exportJSONWithSchema();

console.log(JSON.stringify(result, null, 2));

const expected = [
    { key: "name", type: "string", value: "John Doe" },
    { key: "age", type: "number", value: 30 },
    { key: "isActive", type: "boolean", value: true }
];

const assert = require('assert');
try {
    assert.deepStrictEqual(result, expected);
    console.log("Test Passed!");
} catch (e) {
    console.error("Test Failed", e);
    process.exit(1);
}
