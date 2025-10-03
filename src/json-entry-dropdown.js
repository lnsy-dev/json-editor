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
      { value: "string", iconKey: "text", label: "String" },
      { value: "number", iconKey: "number", label: "Number" },
      { value: "date", iconKey: "calendar", label: "Date" },
      { value: "datetime", iconKey: "datetime", label: "Datetime" },
      { value: "array of strings", iconKey: "array", label: "Array of strings" },
      { value: "tag list", iconKey: "tag", label: "Tag list" },
      { value: "url", iconKey: "link", label: "URL" },
      { value: "location", iconKey: "globe", label: "Location" },
      { value: "json", iconKey: "json", label: "JSON" },
      { value: "money", iconKey: "money", label: "Money" },
      { value: "boolean", iconKey: "checkbox", label: "Boolean" },
    ];

    this.value = this.attrs.value || "string";

    // Basic styles (scoped since element doesn't use shadow DOM)
    const style = document.createElement("style");
    style.textContent = `
      .jed-root { position: relative; display: inline-block; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .jed-button { display: inline-flex; align-items: center; gap: 6px; padding: 4px 6px; border: none; border-radius: 4px; background: var(--bg-color); cursor: pointer; }
      .jed-button:hover { filter: brightness(0.97); }
      .jed-icon { width: 18px; height: 18px; display: inline-flex; }
      .jed-menu { position: absolute; z-index: 1000; top: calc(100% + 4px); left: 0; background: var(--bg-color); border: none; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.08); min-width: 160px; padding: 6px; display: none; max-height: 240px; overflow: auto; }
      .jed-menu.open { display: block; }
      .jed-item { display: flex; align-items: center; justify-content: center; padding: 6px; cursor: pointer; border-radius: 4px; }
      .jed-item:hover { background: rgba(0,0,0,0.05); }
      .jed-item.selected { outline: 2px solid rgba(0,0,0,0.15); }
    `;
    this.appendChild(style);

    this.root = this.create("div", { class: "jed-root" });

    this.button = this.create("button", { type: "button", class: "jed-button", title: this.getLabel(this.value) }, this.root);
    this.buttonIcon = this.create("span", { class: "jed-icon" }, this.button);

    this.menu = this.create("div", { class: "jed-menu" }, this.root);

    this.button.addEventListener("click", (e) => {
      e.stopPropagation();
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
      const item = this.create("div", { class: `jed-item${entry.value === this.value ? " selected" : ""}`, title: entry.label }, this.menu);
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

  toggleMenu() {
    if (this.menu.classList.contains("open")) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    this.menu.classList.add("open");
  }

  closeMenu() {
    this.menu.classList.remove("open");
  }

  handleDocClick = () => {
    this.closeMenu();
  };

  async disconnect() {
    document.removeEventListener("click", this.handleDocClick);
  }
}

customElements.define("json-entry-dropdown", JSONEntryDropdown);
