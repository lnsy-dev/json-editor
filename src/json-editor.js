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

    // Load initial content if src attribute is provided
    if (this.attrs.src) {
      await this.loadJSON(this.attrs.src);
    }

    // Listen for attribute changes
    this.on("NODE-CHANGED", (data) => {
      if (data.attribute === "src" && data.newValue) {
        this.loadJSON(data.newValue);
      }
      if (data.attribute === "interact-only" || data.attribute === "read-only") {
        this.render();
      }
    });

    this.render();
  }

  /**
   * Load JSON from URL
   */
  async loadJSON(url) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        this.jsonData = data;
        this.convertJSONToRows();
        this.render();
        this.handleDataChange();
      } else {
        console.error("Failed to load JSON from:", url);
      }
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
    return this.attrs['interact-only'] !== undefined;
  }

  /**
   * Check if the read-only attribute is set.
   * When set, no interaction is allowed; the editor only displays information.
   */
  readOnly() {
    return this.attrs['read-only'] !== undefined;
  }

  /**
   * Determine whether the add button should be shown.
   */
  canAddRows() {
    return !this.interactOnly() && !this.readOnly();
  }

  /**
   * Determine whether delete buttons should be shown.
   */
  canDeleteRows() {
    return !this.interactOnly() && !this.readOnly();
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
    const oldDetails = this.querySelector('.json-editor-details');
    const isOpen = oldDetails ? oldDetails.open : false;

    // Clear existing content
    this.innerHTML = "";

    this.create("summary", {});
    const container = this.create("div", { class: "json-editor-container" });

    // If no src and no rows, show only the add button (when allowed)
    if (!this.attrs.src && this.rows.length === 0) {
      if (this.canAddRows()) {
        const addButton = this.create(
          "button",
          {
            class: "json-editor-add-btn",
            content: "+",
            type: "button",
          }, container
        );

        addButton.addEventListener("click", () => {
          this.addRow()
        });
      }
      return;
    }

    // Create header with add button

    // Create rows container
    const rowsContainer = this.create(
      "div",
      { class: "json-editor-rows" },
      container,
    );

    // Render each row
    this.rows.forEach((row, index) => {
      this.renderRow(row, index, rowsContainer);
    });

    if (this.canAddRows()) {
      const addButton = this.create(
        "button",
        {
          class: "json-editor-add-btn",
          content: "+",
          type: "button",
        }, container
      );

      addButton.addEventListener("click", () => {
        this.addRow()
      });
    }

  }

  /**
   * Render a single row
   */
  async renderRow(row, index, container) {
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

    // Type dropdown with SVG icons
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
      const oldType = this.rows[index].type;
      this.rows[index].type = newType;

      // Try to convert the value to the new type
      const currentValue = this.rows[index].value;

      // If current value is invalid for new type, keep it as-is for user to fix
      if (!this.validateValue(currentValue, newType)) {
        // Keep the raw value, don't parse it
        this.rows[index].value = currentValue;
      } else {
        // Re-parse the value with new type
        this.rows[index].value = this.parseValue(currentValue, newType);
      }

      this.handleDataChange();
      // Re-render to update input type if needed
      this.render();
    });

    // Key input
    const keyInput = this.create(
      "input",
      {
        type: "text",
        class: "json-editor-key",
        placeholder: "Key",
        value: row.key || "",
        ...this.readOnlyAttr(),
      },
      rowElement,
    );

    keyInput.addEventListener("change", (e) => {
      this.rows[index].key = e.target.value;
      this.handleDataChange();
    });



    // Value input (varies by type)
    let valueInput;

    if (row.type === 'boolean') {
      valueInput = this.create(
        'input',
        {
          type: 'checkbox',
          class: 'json-editor-value',
          ...this.readOnlyAttr(),
        },
        rowElement
      );
      valueInput.checked = parseValue(row.value, 'boolean');
      valueInput.addEventListener('change', (e) => {
        this.rows[index].value = e.target.checked;
        this.handleDataChange();
      });
    } else if (row.type === "dropdown") {
      valueInput = this.create(
        "select",
        {
          class: "json-editor-value json-editor-dropdown-select",
          ...this.readOnlyAttr(),
        },
        rowElement,
      );

      await this.populateDropdownOptions(valueInput, row.optionsUrl);
      valueInput.value = this.formatValueForInput(row.value, row.type) || "";
    } else if (this.isFuzzyType(row.type)) {
      // Fuzzy search / fuzzy tag search editor
      const fuzzyAttrs = {
        class: "json-editor-value json-editor-fuzzy",
        value: JSON.stringify(parseValue(row.value, row.type) || []),
        ...this.readOnlyAttr(),
      };
      if (row.optionsUrl) fuzzyAttrs["options-url"] = row.optionsUrl;
      if (row.endpoint) fuzzyAttrs["search-endpoint"] = row.endpoint;
      if (row.type === "fuzzy tag search") fuzzyAttrs.tags = "";

      valueInput = this.create("json-fuzzy-search", fuzzyAttrs, rowElement);

      valueInput.addEventListener("VALUE-CHANGED", (e) => {
        this.rows[index].value = e.detail.value;
        this.handleDataChange();
      });
    } else if (row.type === "location" || row.type === "3d coordinates") {
      const isLocation = row.type === "location";
      const fields = isLocation
        ? ["latitude", "longitude", "altitude"]
        : ["x", "y", "z"];
      const placeholders = isLocation
        ? ["Latitude", "Longitude", "Altitude"]
        : ["X", "Y", "Z"];

      valueInput = this.create(
        "div",
        {
          class: `json-editor-value json-editor-coordinates json-editor-${isLocation ? "location" : "3d-coordinates"}`,
        },
        rowElement,
      );

      const currentValue = parseValue(row.value, row.type);
      const fieldInputs = {};

      fields.forEach((field) => {
        const input = this.create(
          "input",
          {
            type: "number",
            class: `json-editor-coordinate json-editor-coordinate-${field}`,
            placeholder: placeholders[fields.indexOf(field)],
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
            if (isValid) {
              fieldInput.classList.remove("json-editor-invalid");
              fieldInput.removeAttribute("title");
            } else {
              fieldInput.classList.add("json-editor-invalid");
              fieldInput.setAttribute(
                "title",
                `Invalid ${row.type} value`,
              );
            }
          });

          if (isValid) {
            validationIndicator.classList.remove("invalid");
            validationIndicator.classList.add("valid");
            validationIndicator.textContent = "✓";
            validationIndicator.setAttribute("title", "Valid");
          } else {
            validationIndicator.classList.remove("valid");
            validationIndicator.classList.add("invalid");
            validationIndicator.textContent = "✗";
            validationIndicator.setAttribute(
              "title",
              `Invalid ${row.type} value`,
            );
          }
        });
      });

      // Initial validation check for coordinate rows
      const isValid = this.validateValue(row.value, row.type);
      if (!isValid) {
        Object.values(fieldInputs).forEach((fieldInput) => {
          fieldInput.classList.add("json-editor-invalid");
          fieldInput.setAttribute("title", `Invalid ${row.type} value`);
        });
        validationIndicator.classList.remove("valid");
        validationIndicator.classList.add("invalid");
        validationIndicator.textContent = "✗";
        validationIndicator.setAttribute("title", `Invalid ${row.type} value`);
      } else {
        validationIndicator.classList.add("valid");
        validationIndicator.textContent = "✓";
      }
    } else if (row.type === "json") {
      valueInput = this.create(
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
    } else if (row.type === "datetime") {
      valueInput = this.create(
        "input",
        {
          type: "datetime-local",
          class: "json-editor-value",
          value: this.formatValueForInput(row.value, row.type) || "",
          ...this.readOnlyAttr(),
        },
        rowElement,
      );
    } else if (row.type === "date") {
      valueInput = this.create(
        "input",
        {
          type: "date",
          class: "json-editor-value",
          value: this.formatValueForInput(row.value, row.type),
          ...this.readOnlyAttr(),
        },
        rowElement,
      );
    } else if (row.type === "number" || row.type === "currency" || row.type === "float" || row.type === "integer") {
      valueInput = this.create(
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
    } else if (row.type === "url") {
      valueInput = this.create(
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
    } else {
      valueInput = this.create(
        "input",
        {
          type: "text",
          class: "json-editor-value",
          placeholder:
            row.type === "array of strings"
              ? "value1, value2, value3"
              : row.type === "tag list"
                ? "tag1, tag2, tag3"
                : "Value",
          value: this.formatValueForInput(row.value, row.type),
          ...this.readOnlyAttr(),
        },
        rowElement,
      );
    }

    if (row.type === 'boolean') {
      validationIndicator.classList.add("valid");
      validationIndicator.textContent = "✓";
    } else if (this.isFuzzyType(row.type)) {
      validationIndicator.classList.add("valid");
      validationIndicator.textContent = "✓";
      validationIndicator.setAttribute("title", "Valid");
    } else if (row.type !== 'location' && row.type !== '3d coordinates') {
      valueInput.addEventListener("change", (e) => {
        this.rows[index].value = e.target.value;
        this.handleDataChange();

        // Validate and update visual indicator
        const isValid = this.validateValue(e.target.value, this.rows[index].type);

        if (isValid) {
          valueInput.classList.remove("json-editor-invalid");
          valueInput.removeAttribute("title");
          validationIndicator.classList.remove("invalid");
          validationIndicator.classList.add("valid");
          validationIndicator.textContent = "✓";
          validationIndicator.setAttribute("title", "Valid");
        } else {
          valueInput.classList.add("json-editor-invalid");
          valueInput.setAttribute(
            "title",
            `Invalid ${this.rows[index].type} value`,
          );
          validationIndicator.classList.remove("valid");
          validationIndicator.classList.add("invalid");
          validationIndicator.textContent = "✗";
          validationIndicator.setAttribute(
            "title",
            `Invalid ${this.rows[index].type} value`,
          );
        }
      });

      // Initial validation check
      const isValid = this.validateValue(row.value, row.type);

      if (!isValid) {
        valueInput.classList.add("json-editor-invalid");
        valueInput.setAttribute("title", `Invalid ${row.type} value`);
        validationIndicator.classList.remove("valid");
        validationIndicator.classList.add("invalid");
        validationIndicator.textContent = "✗";
        validationIndicator.setAttribute("title", `Invalid ${row.type} value`);
      } else {
        validationIndicator.classList.add("valid");
        validationIndicator.textContent = "✓";
      }
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
   */
  async populateDropdownOptions(selectElement, url) {
    selectElement.innerHTML = "";
    this.create("option", { value: "", content: "-- Select --" }, selectElement);

    if (!url) return;

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
