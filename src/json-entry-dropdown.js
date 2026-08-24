import DataroomElement from "dataroom-js";
import icons from "./icons.js";

/*
  json-entry-dropdown
  - Custom dropdown to select a JSON entry type using SVG icons
  - Attributes:
    - value: current selected type (e.g., "string", "number", ...)
  - Events:
    - TYPE-CHANGED: { value: string }
*/
class JSONEntryDropdown extends DataroomElement {
  async initialize() {
    // Supported types and their icon keys
    this.typeIconMap = [
      { value: "string", iconKey: "text", label: "String", name: "string" },
      { value: "number", iconKey: "number", label: "Number", name: "number" },
      { value: "float", iconKey: "float", label: "Float", name: "float" },
      { value: "integer", iconKey: "integer", label: "Integer", name: "integer" },
      { value: "date", iconKey: "calendar", label: "Date", name: "date" },
      { value: "datetime", iconKey: "datetime", label: "Datetime", name: "datetime" },
      { value: "array of strings", iconKey: "array", label: "Array of strings", name: "array of strings" },
      { value: "tag list", iconKey: "tag", label: "Tag list", name: "tag list" },
      { value: "url", iconKey: "link", label: "URL", name: "url" },
      { value: "dropdown", iconKey: "dropdown", label: "Dropdown", name: "dropdown" },
      { value: "fuzzy search", iconKey: "search", label: "Fuzzy search", name: "fuzzy search" },
      { value: "fuzzy tag search", iconKey: "tag", label: "Fuzzy tag search", name: "fuzzy tag search" },
      { value: "location", iconKey: "globe", label: "Location", name: "location" },
      { value: "3d coordinates", iconKey: "3d", label: "3D Coordinates", name: "3d coordinates" },
      { value: "json", iconKey: "json", label: "JSON", name: "json" },
      { value: "currency", iconKey: "currency", label: "currency", name: "currency" },
      { value: "boolean", iconKey: "checkbox", label: "Boolean", name: "boolean" },
    ];

    this.value = this.attrs.value || "string";

    this.root = this.create("div", { class: "jed-root" });

    this.button = this.create("button", { type: "button", class: "jed-button", title: this.getLabel(this.value) }, this.root);
    this.buttonIcon = this.create("span", { class: "jed-icon" }, this.button);

    this.menu = this.create("div", { class: "jed-menu" }, this.root);

    this.setDisabled(this.attrs.disabled !== undefined);

    this.button.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.disabled) return;
      this.toggleMenu();
    });

    document.addEventListener("click", this.handleDocClick);

    this.renderIcon(this.buttonIcon, this.value);
    this.renderMenu();

    // Respond to attribute changes
    this.on("NODE-CHANGED", (data) => {
      if (data.attribute === "value") {
        this.setValue(data.newValue);
      }
      if (data.attribute === "disabled") {
        this.setDisabled(data.newValue !== undefined && data.newValue !== null);
      }
    });
  }

  getLabel(val) {
    const found = this.typeIconMap.find((t) => t.value === val);
    return found ? found.label : val;
  }

  renderIcon(targetEl, typeValue) {
    const entry = this.typeIconMap.find((t) => t.value === typeValue);
    const svgStr = entry ? icons[entry.iconKey] : null;
    targetEl.innerHTML = svgStr || "";
  }

  renderMenu() {
    this.menu.innerHTML = "";
    this.typeIconMap.forEach((entry) => {
      const item = this.create("div", { class: `jed-item${entry.value === this.value ? " selected" : ""}`, title: entry.label, name: entry.name }, this.menu);
      const iconEl = this.create("span", { class: "jed-icon" }, item);
      iconEl.innerHTML = icons[entry.iconKey] || "";

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this.setValue(entry.value);
        this.closeMenu();
      });
    });
  }

  setValue(val) {
    if (!val || val === this.value) return;
    this.value = val;
    // Update UI
    this.button.setAttribute("title", this.getLabel(this.value));
    this.renderIcon(this.buttonIcon, this.value);
    this.renderMenu();
    // Emit event
    this.event("TYPE-CHANGED", { value: this.value });
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    if (disabled) {
      this.button.setAttribute("disabled", "");
      this.closeMenu();
    } else {
      this.button.removeAttribute("disabled");
    }
  }

  toggleMenu() {
    if (this.menu.classList.contains("open")) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    // Calculate available space
    const buttonRect = this.button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const minHeightNeeded = 200; // Approximate height of the menu

    if (spaceBelow < minHeightNeeded) {
      this.menu.classList.add("above");
      this.menu.classList.remove("below");
    } else {
      this.menu.classList.add("below");
      this.menu.classList.remove("above");
    }

    this.menu.classList.add("open");
  }

  closeMenu() {
    this.menu.classList.remove("open");
    this.menu.classList.remove("above", "below");
  }

  handleDocClick = () => {
    this.closeMenu();
  };

  async disconnect() {
    document.removeEventListener("click", this.handleDocClick);
  }
}

customElements.define("json-entry-dropdown", JSONEntryDropdown);
