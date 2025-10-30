/*
  JSON Editor Component

  Usage:
  <json-editor src="link-to-template-json-here.json"></json-editor>

  This component provides a visual JSON editor with row-based editing,
  type selection (MySQL-compatible types), and live JSON updates.
*/

import DataroomElement from "dataroom-js";
import "./json-entry-dropdown.js";

class JSONEditor extends DataroomElement {
  /**
   * Initialize the JSON Editor component
   */
  async initialize() {
    this.log("JSON Editor initialized");

    // Initialize data structure
    this.jsonData = {};
    this.rows = [];

    // Load initial content if src attribute is provided
    if (this.attrs.src) {
      await this.loadJSON(this.attrs.src);
    }

    // Listen for attribute changes
    this.on("NODE-CHANGED", (data) => {
      if (data.attribute === "src" && data.newValue) {
        this.loadJSON(data.newValue);
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
    this.rows = [];
    for (const [key, value] of Object.entries(this.jsonData)) {
      this.rows.push({
        key: key,
        type: this.detectType(value),
        value: value,
      });
    }
  }

  /**
   * Detect the type of a value
   */
  detectType(value) {
    if (typeof value === 'boolean') return 'boolean';
    if (value === null || value === undefined) return "string";
    if (Array.isArray(value)) {
      // Check if it's a tag list (array of single words)
      if (
        value.every((item) => typeof item === "string" && !item.includes(" "))
      ) {
        return "tag list";
      }
      return "array of strings";
    }
    if (typeof value === "object") {
      const keys = Object.keys(value);
      if (["latitude", "longitude", "altitude"].every((k) => keys.includes(k))) {
        return "location";
      }
      return "json";
    }
    if (typeof value === "number") {
      // Check if it might be money (has 2 decimal places)
      if (value.toString().match(/^\d+\.\d{2}$/)) {
        return "money";
      }
      return "number";
    }
    if (typeof value === "string") {
      // Check if it's a URL
      try {
        new URL(value);
        return "url";
      } catch {}
      // Check if it's a datetime (has time component)
      if (!isNaN(Date.parse(value)) && (value.includes("T") || value.match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/))) {
        return "datetime";
      }
      // Check if it's a date
      if (!isNaN(Date.parse(value)) && value.match(/\d{4}-\d{2}-\d{2}/)) {
        return "date";
      }
      return "string";
    }
    return "string";
  }

  /**
   * Convert rows back to JSON object
   */
  convertRowsToJSON() {
    const json = {};
    this.rows.forEach((row) => {
      if (row.key) {
        json[row.key] = this.parseValue(row.value, row.type);
      }
    });
    return json;
  }

  /**
   * Parse value based on type
   */
  parseValue(value, type) {
    switch (type) {
      case "boolean":
        return value === true || value === 'true';
      case "number":
        return parseFloat(value) || 0;
      case "money":
        return parseFloat(value) || 0.0;
      case "array of strings":
        if (typeof value === "string") {
          return value
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s);
        }
        return Array.isArray(value) ? value : [];
      case "tag list":
        if (typeof value === "string") {
          return value
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s && !s.includes(" "));
        }
        return Array.isArray(value)
          ? value.filter((s) => !s.includes(" "))
          : [];
      case "location":
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed === "") {
            return { latitude: "0.00", longitude: "0.00", altitude: "0.00" };
          }
          try {
            const obj = JSON.parse(value);
            return {
              latitude: String(obj?.latitude ?? "0.00"),
              longitude: String(obj?.longitude ?? "0.00"),
              altitude: String(obj?.altitude ?? "0.00"),
            };
          } catch {
            return { latitude: "0.00", longitude: "0.00", altitude: "0.00" };
          }
        }
        if (typeof value === "object" && value !== null) {
          return {
            latitude: String(value.latitude ?? "0.00"),
            longitude: String(value.longitude ?? "0.00"),
            altitude: String(value.altitude ?? "0.00"),
          };
        }
        return { latitude: "0.00", longitude: "0.00", altitude: "0.00" };
      case "json":
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return {};
          }
        }
        return typeof value === "object" ? value : {};
      case "date":
        if (value instanceof Date) {
          return value.toISOString().split("T")[0];
        }
        return value || "";
      case "datetime":
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value || "";
      case "url":
        return value || "";
      case "string":
      default:
        return value || "";
    }
  }

  /**
   * Validate value against type
   */
  validateValue(value, type) {
    // Empty values are always valid
    if (value === "" || value === null || value === undefined) return true;

    switch (type) {
      case "boolean":
        return true;
      case "number":
        return !isNaN(parseFloat(value)) && isFinite(value);
      case "money":
        const moneyVal = parseFloat(value);
        return !isNaN(moneyVal) && isFinite(moneyVal);
      case "date":
        const date = new Date(value);
        return date instanceof Date && !isNaN(date);
      case "datetime":
        const dt = new Date(value);
        return dt instanceof Date && !isNaN(dt);
      case "url":
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case "location":
        try {
          const obj = typeof value === "string" ? JSON.parse(value) : value;
          if (!obj || typeof obj !== "object") return false;
          const hasKeys = ["latitude", "longitude", "altitude"].every((k) => Object.prototype.hasOwnProperty.call(obj, k));
          if (!hasKeys) return false;
          const vals = [obj.latitude, obj.longitude, obj.altitude];
          return vals.every((v) => v === "" || v === null || v === undefined || !isNaN(parseFloat(v)));
        } catch {
          return false;
        }
      case "json":
        try {
          if (typeof value === "string") {
            JSON.parse(value);
          }
          return true;
        } catch {
          return false;
        }
      case "tag list":
        const tags =
          typeof value === "string"
            ? value
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s)
            : Array.isArray(value)
              ? value
              : [];
        return tags.every((tag) => !tag.includes(" "));
      case "array of strings":
      case "string":
        return true; // These are always valid
      default:
        return true;
    }
  }

  /**
   * Format value for display in input
   */
  formatValueForInput(value, type) {
    switch (type) {
      case "array of strings":
      case "tag list":
        return Array.isArray(value) ? value.join(", ") : value;
      case "location":
      case "json":
        return typeof value === "object"
          ? JSON.stringify(value, null, 2)
          : value;
      case "money":
        return typeof value === "number" ? value.toFixed(2) : value;
      case "date":
        if (value instanceof Date) {
          return value.toISOString().split("T")[0];
        }
        return value;
      case "datetime":
        // Convert to input[type=datetime-local] format (YYYY-MM-DDTHH:MM) in local time when possible
        const formatLocal = (d) => {
          const pad = (n) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        if (value instanceof Date) {
          return formatLocal(value);
        }
        if (typeof value === "string") {
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
   * Render the component
   */
  render() {
    const oldDetails = this.querySelector('.json-editor-details');
    const isOpen = oldDetails ? oldDetails.open : false;

    // Clear existing content
    this.innerHTML = "";

    this.create("summary", {});
    const container = this.create("div", { class: "json-editor-container" });

    // If no src and no rows, show only the add button
    if (!this.attrs.src && this.rows.length === 0) {
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

    // Type dropdown with SVG icons
    const typeDropdown = this.create(
      "json-entry-dropdown",
      {
        value: row.type,
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
        },
        rowElement
      );
      valueInput.checked = this.parseValue(row.value, 'boolean');
      valueInput.addEventListener('change', (e) => {
        this.rows[index].value = e.target.checked;
        this.handleDataChange();
      });
    } else if (row.type === "location") {
      valueInput = this.create(
        "textarea",
        {
          class: "json-editor-value json-editor-textarea",
          placeholder: '{"latitude":"0.00","longitude":"0.00","altitude":"0.00"}',
          rows: 1,
        },
        rowElement,
      );
      valueInput.value = this.formatValueForInput(row.value, row.type);
    } else if (row.type === "json") {
      valueInput = this.create(
        "textarea",
        {
          class: "json-editor-value json-editor-textarea",
          placeholder: "JSON value",
          rows: 1,
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
        },
        rowElement,
      );
    } else if (row.type === "number" || row.type === "money") {
      valueInput = this.create(
        "input",
        {
          type: "number",
          class: "json-editor-value",
          placeholder: row.type === "money" ? "0.00" : "Number",
          step: row.type === "money" ? "0.01" : "any",
          value: this.formatValueForInput(row.value, row.type),
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
        },
        rowElement,
      );
    }

    if (row.type !== 'boolean') {
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
    } else {
        validationIndicator.classList.add("valid");
        validationIndicator.textContent = "✓";
    }

    // Delete button
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

  /**
   * Add a new row
   */
  addRow() {
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
   * Export current JSON
   */
  exportJSON() {
    return this.convertRowsToJSON();
  }

  /**
   * Clean up when component is disconnected
   */
  async disconnect() {
    this.log("JSON Editor disconnected");
  }
}

customElements.define("json-editor", JSONEditor);
