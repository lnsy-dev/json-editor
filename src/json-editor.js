/*
  JSON Editor Component

  Usage:
  <json-editor src="link-to-template-json-here.json"></json-editor>

  This component provides a visual JSON editor with row-based editing,
  type selection (MySQL-compatible types), and live JSON updates.
*/

import DataroomElement from "dataroom-js";
import "./json-entry-dropdown.js";
import "./json-fuzzy-search.js";
import YAMLConverter from "./yaml-converter.js";
import {
  detectType,
  parseValue,
  validateValue,
  formatValueForInput,
  convertJSONToRows as convertJSONToRowsLogic,
  convertRowsToJSON as convertRowsToJSONLogic,
} from "./json-editor-logic.js";

class JSONEditor extends DataroomElement {
  /**
   * Initialize the JSON Editor component
   */
  async initialize() {
    this.log("JSON Editor initialized");

    // Initialize data structure
    this.jsonData = {};
    this.rows = [];
    this.yamlConverter = new YAMLConverter();
    this.loadSequence = 0;

    // Listen for attribute changes before any awaited loading so changes
    // made while the initial src is fetching are never missed.
    this.on("NODE-CHANGED", (data) => {
      if (data.attribute === "src" && data.newValue) {
        this.loadJSON(data.newValue);
      }
      if (
        data.attribute === "interact-only" ||
        data.attribute === "read-only" ||
        data.attribute === "form-mode"
      ) {
        this.render();
      }
    });

    // Load initial content if src attribute is provided
    if (this.attrs.src) {
      await this.loadJSON(this.attrs.src);
    }

    this.render();
  }

  /**
   * Load JSON from URL. Stale responses are ignored so that rapid src
   * changes cannot clobber the data with an older fetch's result.
   */
  async loadJSON(url) {
    this.loadSequence += 1;
    const request = this.loadSequence;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error("Failed to load JSON from:", url);
        return;
      }
      const data = await response.json();
      if (request !== this.loadSequence) return; // superseded by a newer load
      this.jsonData = data;
      this.convertJSONToRows();
      this.render();
      this.handleDataChange();
    } catch (error) {
      console.error("Error loading JSON:", error);
    }
  }

  /**
   * Convert JSON object to rows array for editing
   */
  convertJSONToRows() {
    this.rows = convertJSONToRowsLogic(this.jsonData);
  }

  /**
   * Detect the type of a value
   */
  detectType(value) {
    return detectType(value);
  }

  /**
   * Convert rows back to JSON object
   */
  convertRowsToJSON() {
    return convertRowsToJSONLogic(this.rows);
  }

  /**
   * Parse value based on type
   */
  parseValue(value, type) {
    return parseValue(value, type);
  }

  /**
   * Validate value against type
   */
  validateValue(value, type) {
    return validateValue(value, type);
  }

  /**
   * Format value for display in input
   */
  formatValueForInput(value, type) {
    return formatValueForInput(value, type);
  }

  /**
   * Check whether a row type is handled by the fuzzy search editor.
   */
  isFuzzyType(type) {
    return type === 'fuzzy search' || type === 'fuzzy tag search';
  }

  /**
   * Check if the interact-only attribute is set.
   * When set, users can edit existing rows but cannot add or delete rows.
   */
  interactOnly() {
    return this.hasAttribute('interact-only');
  }

  /**
   * Check if the read-only attribute is set.
   * When set, no interaction is allowed; the editor only displays information.
   */
  readOnly() {
    return this.hasAttribute('read-only');
  }

  /**
   * Check if the form-mode attribute is set.
   * When set, the editor renders as a simple form: just keys and inputs,
   * no type dropdowns, no add/delete buttons. Users can tab between inputs.
   */
  formMode() {
    return this.hasAttribute('form-mode');
  }

  /**
   * Determine whether rows can be added or deleted in the current mode.
   */
  canModifyRows() {
    return !this.formMode() && !this.interactOnly() && !this.readOnly();
  }

  /**
   * Determine whether the add button should be shown.
   */
  canAddRows() {
    return this.canModifyRows();
  }

  /**
   * Determine whether delete buttons should be shown.
   */
  canDeleteRows() {
    return this.canModifyRows();
  }

  /**
   * Return an attributes object that disables an element when read-only.
   */
  readOnlyAttr() {
    return this.readOnly() ? { disabled: "" } : {};
  }

  /**
   * Render the component
   */
  render() {
    // Clear existing content
    this.innerHTML = "";

    const container = this.create("div", { class: "json-editor-container" });

    // If no src and no rows, show only the add button (when allowed)
    if (!this.attrs.src && this.rows.length === 0) {
      this.renderAddButton(container);
      return;
    }

    // Create rows container
    const rowsContainer = this.create(
      "div",
      {
        class: this.formMode()
          ? "json-editor-rows json-editor-form-mode"
          : "json-editor-rows",
      },
      container,
    );

    // Render each row
    this.rows.forEach((row, index) => {
      this.renderRow(row, index, rowsContainer);
    });

    this.renderAddButton(container);
  }

  /**
   * Append the add-row button to a container, when the mode allows it.
   */
  renderAddButton(container) {
    if (!this.canAddRows()) return;
    const addButton = this.create(
      "button",
      {
        class: "json-editor-add-btn",
        content: "+",
        type: "button",
      },
      container,
    );

    addButton.addEventListener("click", () => {
      this.addRow();
    });
  }

  /**
   * Render a single row
   */
  renderRow(row, index, container) {
    const rowElement = this.create(
      "div",
      { class: "json-editor-row", "data-index": index },
      container,
    );

    // Validation indicator
    const validationIndicator = this.create(
      "span",
      {
        class: "json-editor-validation-indicator",
        title: "Valid",
      },
      rowElement,
    );

    // Type dropdown with SVG icons (hidden entirely in form mode)
    if (!this.formMode()) {
      this.renderTypeDropdown(row, index, rowElement);
    }

    this.renderKeyInput(row, index, rowElement);

    const valueInput = this.renderValueInput(row, index, rowElement, validationIndicator);

    if (row.type === 'boolean' || this.isFuzzyType(row.type)) {
      // Booleans and fuzzy editors cannot hold invalid values
      this.setValidationIndicator(validationIndicator, true, row.type);
    } else if (
      row.type !== 'location' &&
      row.type !== '3d coordinates' &&
      row.type !== 'tag list'
    ) {
      // Coordinate and tag list rows wire their own validation inside
      // renderValueInput
      this.attachScalarValidation(row, index, valueInput, validationIndicator);
    }

    // Delete button
    if (this.canDeleteRows()) {
      const deleteButton = this.create(
        "button",
        {
          class: "json-editor-delete-btn",
          content: "×",
          type: "button",
          title: "Delete row",
        },
        rowElement,
      );

      deleteButton.addEventListener("click", () => {
        this.rows.splice(index, 1);
        this.handleDataChange();
        this.render();
      });
    }
  }

  /**
   * Render the type dropdown for a row and wire type changes.
   */
  renderTypeDropdown(row, index, rowElement) {
    const typeDropdown = this.create(
      "json-entry-dropdown",
      {
        class: "json-editor-type",
        value: row.type,
        ...this.readOnlyAttr(),
      },
      rowElement,
    );

    typeDropdown.addEventListener("TYPE-CHANGED", (e) => {
      const newType = e.detail.value;
      this.rows[index].type = newType;

      // If the current value is valid for the new type, re-parse it;
      // otherwise keep the raw value for the user to fix.
      const currentValue = this.rows[index].value;
      this.rows[index].value = this.validateValue(currentValue, newType)
        ? this.parseValue(currentValue, newType)
        : currentValue;

      this.handleDataChange();
      // Re-render to update input type if needed
      this.render();
    });
  }

  /**
   * Render the key input for a row.
   * In form mode keys are fixed: not editable and removed from the tab order.
   */
  renderKeyInput(row, index, rowElement) {
    const keyInput = this.create(
      "input",
      {
        type: "text",
        class: "json-editor-key",
        placeholder: "Key",
        value: row.key || "",
        ...(this.formMode()
          ? { readonly: "", tabindex: "-1", title: "Keys are fixed in form mode" }
          : {}),
        ...this.readOnlyAttr(),
      },
      rowElement,
    );

    keyInput.addEventListener("change", (e) => {
      this.rows[index].key = e.target.value;
      this.handleDataChange();
    });

    return keyInput;
  }

  /**
   * Create the value editor matching the row type.
   * Returns the created input element.
   */
  renderValueInput(row, index, rowElement, validationIndicator) {
    switch (row.type) {
      case 'boolean':
        return this.renderBooleanInput(row, index, rowElement);
      case 'dropdown':
        return this.renderDropdownInput(row, rowElement);
      case 'tag list':
        return this.renderTagListInput(row, index, rowElement, validationIndicator);
      case 'fuzzy search':
      case 'fuzzy tag search':
        return this.renderFuzzyInput(row, index, rowElement);
      case 'location':
      case '3d coordinates':
        return this.renderCoordinateInput(row, index, rowElement, validationIndicator);
      default:
        return this.renderScalarInput(row, rowElement);
    }
  }

  /**
   * Boolean rows render as a checkbox.
   */
  renderBooleanInput(row, index, rowElement) {
    const valueInput = this.create(
      'input',
      {
        type: 'checkbox',
        class: 'json-editor-value',
        ...this.readOnlyAttr(),
      },
      rowElement,
    );
    valueInput.checked = this.parseValue(row.value, 'boolean');
    valueInput.addEventListener('change', (e) => {
      this.rows[index].value = e.target.checked;
      this.handleDataChange();
    });
    return valueInput;
  }

  /**
   * Dropdown rows render as a select populated from the row's optionsUrl.
   */
  renderDropdownInput(row, rowElement) {
    const valueInput = this.create(
      "select",
      {
        class: "json-editor-value json-editor-dropdown-select",
        ...this.readOnlyAttr(),
      },
      rowElement,
    );

    const selectedValue = this.formatValueForInput(row.value, row.type) || "";
    this.populateDropdownOptions(valueInput, row.optionsUrl, selectedValue);
    return valueInput;
  }

  /**
   * Tag list rows render a json-fuzzy-search tag editor: tags are added
   * via the inline input and shown as removable chips with an 'x' at the
   * end, all inside a single input-styled box.
   */
  renderTagListInput(row, index, rowElement, validationIndicator) {
    const valueInput = this.create(
      "json-fuzzy-search",
      {
        class: "json-editor-value json-editor-fuzzy",
        tags: "",
        placeholder: "Add tag...",
        value: JSON.stringify(this.parseValue(row.value, row.type) || []),
        ...this.readOnlyAttr(),
      },
      rowElement,
    );

    valueInput.addEventListener("VALUE-CHANGED", (e) => {
      this.rows[index].value = e.detail.value;
      this.handleDataChange();

      const isValid = this.validateValue(e.detail.value, row.type);
      this.setValidationIndicator(validationIndicator, isValid, row.type);
    });

    // Initial validation check for the loaded tags
    const isValid = this.validateValue(row.value, row.type);
    this.setValidationIndicator(validationIndicator, isValid, row.type);

    return valueInput;
  }

  /**
   * Fuzzy search / fuzzy tag search rows render a json-fuzzy-search editor.
   */
  renderFuzzyInput(row, index, rowElement) {
    const fuzzyAttrs = {
      class: "json-editor-value json-editor-fuzzy",
      value: JSON.stringify(this.parseValue(row.value, row.type) || []),
      ...this.readOnlyAttr(),
    };
    if (row.optionsUrl) fuzzyAttrs["options-url"] = row.optionsUrl;
    if (row.endpoint) fuzzyAttrs["search-endpoint"] = row.endpoint;
    if (row.type === "fuzzy tag search") fuzzyAttrs.tags = "";

    const valueInput = this.create("json-fuzzy-search", fuzzyAttrs, rowElement);

    valueInput.addEventListener("VALUE-CHANGED", (e) => {
      this.rows[index].value = e.detail.value;
      this.handleDataChange();
    });
    return valueInput;
  }

  /**
   * Location / 3d coordinates rows render one numeric input per field.
   */
  renderCoordinateInput(row, index, rowElement, validationIndicator) {
    const isLocation = row.type === "location";
    const fields = isLocation
      ? ["latitude", "longitude", "altitude"]
      : ["x", "y", "z"];
    const placeholders = isLocation
      ? ["Latitude", "Longitude", "Altitude"]
      : ["X", "Y", "Z"];

    const valueInput = this.create(
      "div",
      {
        class: `json-editor-value json-editor-coordinates json-editor-${isLocation ? "location" : "3d-coordinates"}`,
      },
      rowElement,
    );

    const currentValue = this.parseValue(row.value, row.type);
    const fieldInputs = {};

    fields.forEach((field, fieldIndex) => {
      const input = this.create(
        "input",
        {
          type: "number",
          class: `json-editor-coordinate json-editor-coordinate-${field}`,
          placeholder: placeholders[fieldIndex],
          value: currentValue[field] || "",
          ...this.readOnlyAttr(),
        },
        valueInput,
      );
      fieldInputs[field] = input;

      input.addEventListener("change", () => {
        const newValue = {};
        fields.forEach((f) => {
          newValue[f] = fieldInputs[f].value;
        });
        this.rows[index].value = newValue;
        this.handleDataChange();

        const isValid = this.validateValue(newValue, row.type);
        Object.values(fieldInputs).forEach((fieldInput) => {
          this.applyInputValidity(fieldInput, isValid, row.type);
        });
        this.setValidationIndicator(validationIndicator, isValid, row.type);
      });
    });

    // Initial validation check for coordinate rows
    const isValid = this.validateValue(row.value, row.type);
    if (!isValid) {
      Object.values(fieldInputs).forEach((fieldInput) => {
        this.applyInputValidity(fieldInput, false, row.type);
      });
    }
    this.setValidationIndicator(validationIndicator, isValid, row.type);

    return valueInput;
  }

  /**
   * All other row types render a single themed input or textarea.
   */
  renderScalarInput(row, rowElement) {
    if (row.type === "json") {
      const valueInput = this.create(
        "textarea",
        {
          class: "json-editor-value json-editor-textarea",
          placeholder: "JSON value",
          rows: 1,
          ...this.readOnlyAttr(),
        },
        rowElement,
      );
      valueInput.value = this.formatValueForInput(row.value, row.type);
      return valueInput;
    }

    if (row.type === "datetime" || row.type === "date") {
      return this.create(
        "input",
        {
          type: row.type === "datetime" ? "datetime-local" : "date",
          class: "json-editor-value",
          value: this.formatValueForInput(row.value, row.type) || "",
          ...this.readOnlyAttr(),
        },
        rowElement,
      );
    }

    if (
      row.type === "number" ||
      row.type === "currency" ||
      row.type === "float" ||
      row.type === "integer"
    ) {
      return this.create(
        "input",
        {
          type: "number",
          class: "json-editor-value",
          placeholder: row.type === "currency" ? "0.00" : (row.type === "integer" ? "0" : "Number"),
          step: row.type === "currency" ? "0.01" : (row.type === "integer" ? "1" : "any"),
          value: this.formatValueForInput(row.value, row.type),
          ...this.readOnlyAttr(),
        },
        rowElement,
      );
    }

    if (row.type === "url") {
      return this.create(
        "input",
        {
          type: "url",
          class: "json-editor-value",
          placeholder: "https://example.com",
          value: this.formatValueForInput(row.value, row.type) || "",
          ...this.readOnlyAttr(),
        },
        rowElement,
      );
    }

    return this.create(
      "input",
      {
        type: "text",
        class: "json-editor-value",
        placeholder:
          row.type === "array of strings" ? "value1, value2, value3" : "Value",
        value: this.formatValueForInput(row.value, row.type),
        ...this.readOnlyAttr(),
      },
      rowElement,
    );
  }

  /**
   * Wire change handling and validation UI for single-input row types.
   */
  attachScalarValidation(row, index, valueInput, validationIndicator) {
    valueInput.addEventListener("change", (e) => {
      // Enforce currency standards: slice digits to two decimal places
      if (this.rows[index].type === "currency") {
        const sliced = this.parseValue(e.target.value, "currency");
        e.target.value = this.formatValueForInput(sliced, "currency");
        this.rows[index].value = sliced;
      } else {
        this.rows[index].value = e.target.value;
      }
      this.handleDataChange();

      const isValid = this.validateValue(e.target.value, this.rows[index].type);
      this.applyInputValidity(valueInput, isValid, this.rows[index].type);
      this.setValidationIndicator(validationIndicator, isValid, this.rows[index].type);
    });

    // Initial validation check
    const isValid = this.validateValue(row.value, row.type);
    this.applyInputValidity(valueInput, isValid, row.type);
    this.setValidationIndicator(validationIndicator, isValid, row.type);
  }

  /**
   * Mark or clear the invalid styling on an input element.
   */
  applyInputValidity(input, isValid, type) {
    if (isValid) {
      input.classList.remove("json-editor-invalid");
      input.removeAttribute("title");
    } else {
      input.classList.add("json-editor-invalid");
      input.setAttribute("title", `Invalid ${type} value`);
    }
  }

  /**
   * Update a row's validation indicator (✓ / ✗).
   */
  setValidationIndicator(indicator, isValid, type) {
    indicator.classList.toggle("valid", isValid);
    indicator.classList.toggle("invalid", !isValid);
    indicator.textContent = isValid ? "✓" : "✗";
    indicator.setAttribute("title", isValid ? "Valid" : `Invalid ${type} value`);
  }

  /**
   * Add a new row
   */
  addRow() {
    if (!this.canAddRows()) {
      return;
    }
    this.rows.push({
      key: "",
      type: "string",
      value: "",
    });
    this.render();
    this.handleDataChange();
  }

  /**
   * Handle data changes and emit event
   */
  handleDataChange() {
    this.jsonData = this.convertRowsToJSON();
    this.event("JSON-UPDATED", { json: this.jsonData });
  }

  /**
   * Fetch options from a URL and populate a select element.
   * Supports arrays of strings or arrays of { value, label } objects.
   * The selected value is applied once the options have been loaded.
   */
  async populateDropdownOptions(selectElement, url, selectedValue = "") {
    selectElement.innerHTML = "";
    this.create("option", { value: "", content: "-- Select --" }, selectElement);

    if (url) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const options = await response.json();
          if (Array.isArray(options)) {
            options.forEach((option) => {
              const optionValue =
                typeof option === "string" ? option : option.value;
              const optionLabel =
                typeof option === "string" ? option : (option.label || option.value);
              if (optionValue !== undefined && optionValue !== null) {
                this.create(
                  "option",
                  { value: String(optionValue), content: String(optionLabel) },
                  selectElement,
                );
              }
            });
          }
        }
      } catch (error) {
        console.error("Error loading dropdown options:", error);
      }
    }

    selectElement.value = selectedValue;
  }

  /**
   * Export current JSON
   */
  exportJSON() {
    return this.convertRowsToJSON();
  }

  /**
   * Export current JSON with schema (key, type, value)
   */
  exportJSONWithSchema() {
    return this.rows.map(row => ({
      key: row.key,
      type: row.type,
      value: parseValue(row.value, row.type),
      ...(row.optionsUrl ? { optionsUrl: row.optionsUrl } : {}),
      ...(row.endpoint ? { endpoint: row.endpoint } : {}),
    }));
  }

  /**
   * Set data from YAML string
   * @param {string} yamlString - YAML formatted string
   * @returns {boolean} - Success status
   */
  setYaml(yamlString) {
    const success = this.yamlConverter.setYaml(yamlString);
    if (success) {
      this.jsonData = this.yamlConverter.getData();
      this.convertJSONToRows();
      this.render();
      this.handleDataChange();
    }
    return success;
  }

  /**
   * Get current data as YAML string
   * @returns {string} - YAML formatted string
   */
  getYaml() {
    this.yamlConverter.setData(this.convertRowsToJSON());
    return this.yamlConverter.getYaml();
  }

  /**
   * Set data from JSON string
   * @param {string} jsonString - JSON formatted string
   * @returns {boolean} - Success status
   */
  setJSON(jsonString) {
    const success = this.yamlConverter.setJSON(jsonString);
    if (success) {
      this.jsonData = this.yamlConverter.getData();
      this.convertJSONToRows();
      this.render();
      this.handleDataChange();
    }
    return success;
  }

  /**
   * Get current data as JSON string
   * @returns {string} - JSON formatted string
   */
  getJSON() {
    this.yamlConverter.setData(this.convertRowsToJSON());
    return this.yamlConverter.getJSON();
  }

  /**
   * Clean up when component is disconnected
   */
  async disconnect() {
    this.log("JSON Editor disconnected");
  }
}

customElements.define("json-editor", JSONEditor);
