import DataroomElement from "dataroom-js";
import {
  fuzzyFilter,
  normalizeOptions,
  parseFuzzyValue,
  stripWikilinks,
} from "./fuzzy-search-logic.js";

/*
  json-fuzzy-search
  - Fuzzy search value editor used by json-editor's "fuzzy search" and
    "fuzzy tag search" row types.
  - Attributes:
    - value: JSON-encoded array of selected values
    - options-url: path to a JSON file with candidate entries
      (array of strings or { value, label } objects)
    - search-endpoint: endpoint for server-side fuzzy search;
      queried as `${endpoint}?q=<query>` returning JSON results
    - tags: present = tag mode ("fuzzy tag search")
    - disabled: present = read-only
  - Events:
    - VALUE-CHANGED: { value: string[] }
*/
class JSONFuzzySearch extends DataroomElement {
  async initialize() {
    this.selected = [];
    try {
      this.selected = parseFuzzyValue(JSON.parse(this.attrs.value || "[]"));
    } catch {
      this.selected = [];
    }

    this.options = []; // candidates from options-url / endpoint
    this.results = [];
    this.searchEndpoint = this.attrs["search-endpoint"] || "";
    this.tagMode = this.attrs.tags !== undefined;

    this.root = this.create("div", { class: "jfs-root" });

    // Div holding selected values (chips); wikilinks render without brackets
    this.chipsContainer = this.create("div", { class: "jfs-chips" }, this.root);

    const searchWrap = this.create("div", { class: "jfs-search-wrap" }, this.root);

    this.input = this.create(
      "input",
      {
        type: "text",
        class: "jfs-input",
        autocomplete: "off",
        placeholder: this.tagMode ? "Search tags..." : "Search files...",
      },
      searchWrap,
    );

    this.resultsEl = this.create("div", { class: "jfs-results" }, searchWrap);

    this.setDisabled(this.attrs.disabled !== undefined);

    this.renderChips();
    await this.loadOptions();

    this.input.addEventListener("input", () => this.handleInput());
    this.input.addEventListener("keydown", (e) => this.handleKeydown(e));

    this.handleDocClick = (e) => {
      if (!this.contains(e.target)) {
        this.hideResults();
      }
    };
    document.addEventListener("click", this.handleDocClick);

    this.on("NODE-CHANGED", (data) => {
      if (data.attribute === "disabled") {
        this.setDisabled(data.newValue !== undefined && data.newValue !== null);
      }
    });
  }

  /**
   * Load candidate options from the options-url JSON file.
   */
  async loadOptions() {
    const url = this.attrs["options-url"];
    if (!url) return;
    try {
      const response = await fetch(url);
      if (response.ok) {
        this.options = normalizeOptions(await response.json());
      } else {
        console.error("Failed to load fuzzy search options from:", url);
      }
    } catch (error) {
      console.error("Error loading fuzzy search options:", error);
    }
  }

  /**
   * Query the fuzzy search endpoint (if configured) and merge the
   * results with locally available options before fuzzy filtering.
   */
  async handleInput() {
    if (this.disabled) return;
    const query = this.input.value.trim();
    this.debounceToken = (this.debounceToken || 0) + 1;
    const token = this.debounceToken;

    let candidates = this.options;

    if (query && this.searchEndpoint) {
      try {
        const url = new URL(this.searchEndpoint, window.location.href);
        url.searchParams.set("q", query);
        const response = await fetch(url.toString());
        if (response.ok) {
          const remote = normalizeOptions(await response.json());
          // Merge remote results ahead of local options, de-duplicated
          const seen = new Set(remote.map((o) => o.value));
          candidates = remote.concat(
            this.options.filter((o) => !seen.has(o.value)),
          );
        }
      } catch (error) {
        console.error("Error querying fuzzy search endpoint:", error);
      }
    }

    // Ignore stale responses after newer keystrokes
    if (token !== this.debounceToken) return;

    this.results = query ? fuzzyFilter(query, candidates) : [];
    this.renderResults();
  }

  handleKeydown(e) {
    if (this.disabled) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (this.results.length > 0) {
        this.addValue(this.results[0].value);
      } else {
        // Allow adding raw values typed directly, including [[wikilinks]]
        const raw = this.input.value.trim();
        if (raw) this.addValue(raw);
      }
    } else if (e.key === "Escape") {
      this.input.value = "";
      this.hideResults();
    }
  }

  addValue(value) {
    if (!value || this.selected.includes(value)) {
      this.input.value = "";
      this.hideResults();
      return;
    }
    this.selected.push(value);
    this.input.value = "";
    this.hideResults();
    this.renderChips();
    this.event("VALUE-CHANGED", { value: [...this.selected] });
  }

  removeValue(value) {
    this.selected = this.selected.filter((v) => v !== value);
    this.renderChips();
    this.event("VALUE-CHANGED", { value: [...this.selected] });
  }

  setValue(values) {
    this.selected = parseFuzzyValue(values);
    this.renderChips();
  }

  getValue() {
    return [...this.selected];
  }

  renderChips() {
    this.chipsContainer.innerHTML = "";
    this.selected.forEach((value) => {
      const chip = this.create("span", { class: "jfs-chip" }, this.chipsContainer);
      this.create("span", { class: "jfs-chip-label", content: stripWikilinks(value) }, chip);
      if (!this.disabled) {
        const removeBtn = this.create(
          "button",
          {
            type: "button",
            class: "jfs-chip-remove",
            content: "×",
            title: `Remove ${stripWikilinks(value)}`,
          },
          chip,
        );
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.removeValue(value);
        });
      }
    });
  }

  renderResults() {
    this.resultsEl.innerHTML = "";
    if (this.results.length === 0) {
      this.hideResults();
      return;
    }
    this.results.forEach((result) => {
      const item = this.create(
        "div",
        { class: "jfs-result", title: result.value },
        this.resultsEl,
      );
      // Wikilink-style results are rendered without their brackets
      this.create("span", { class: "jfs-result-label", content: stripWikilinks(result.label) }, item);
      item.addEventListener("click", () => this.addValue(result.value));
    });
    this.resultsEl.classList.add("open");
  }

  hideResults() {
    this.resultsEl.classList.remove("open");
    this.resultsEl.innerHTML = "";
    // Drop stale matches so Enter always reflects what is currently typed
    this.results = [];
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    if (disabled) {
      this.input.setAttribute("disabled", "");
      this.hideResults();
    } else {
      this.input.removeAttribute("disabled");
    }
    this.renderChips();
  }

  async disconnect() {
    document.removeEventListener("click", this.handleDocClick);
  }
}

customElements.define("json-fuzzy-search", JSONFuzzySearch);
