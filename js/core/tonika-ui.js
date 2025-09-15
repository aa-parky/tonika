// tonika-ui.js — tiny UI helpers (tabs and delegate to TonikaTheme)
// Exposes API at window.Tonika.UI and auto-binds on DOM ready.
(() => {
  const Tonika = (window.Tonika = window.Tonika || {});
  const UI = (Tonika.UI = Tonika.UI || {});

  // ---------------------------------------------------------------------
  // High Contrast (Accessibility) — global + module sync
  // ---------------------------------------------------------------------
  const HC_STORAGE_KEY = "tonika:highContrast";
  const BODY_HC_CLASS = "tonika--high-contrast";
  const CLAV_KB_SELECTOR = ".clavonika__keyboard";
  const CLAV_KB_HC_CLASS = "clavonika__keyboard--high-contrast";

  function applyHighContrastEnabled(enabled) {
    // Global tokens via <body> modifier
    document.body.classList.toggle(BODY_HC_CLASS, !!enabled);

    // Module-specific skin: Clavonika keys (if present)
    document.querySelectorAll(CLAV_KB_SELECTOR).forEach((el) => {
      el.classList.toggle(CLAV_KB_HC_CLASS, !!enabled);
    });
  }

  function loadHighContrastPreference() {
    try {
      const v = localStorage.getItem(HC_STORAGE_KEY);
      if (v === null) return null;
      return v === "1";
    } catch {
      return null;
    }
  }

  function saveHighContrastPreference(enabled) {
    try {
      localStorage.setItem(HC_STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function bindHighContrastToggle() {
    const checkbox = document.getElementById("high-contrast-toggle");
    if (!checkbox) return;

    // Initial state: prefer saved setting; else reflect current <body> state
    const saved = loadHighContrastPreference();
    const initial =
      saved !== null ? saved : document.body.classList.contains(BODY_HC_CLASS);

    checkbox.checked = !!initial;
    applyHighContrastEnabled(initial);

    checkbox.addEventListener("change", () => {
      const enabled = checkbox.checked;
      applyHighContrastEnabled(enabled);
      saveHighContrastPreference(enabled);
    });
  }

  // If modules mount after init (e.g., Clavonika builds SVG later),
  // re-apply the current HC setting when we see app:status on the Bus.
  function bindBusSyncForHighContrast() {
    const bus = window.Tonika && window.Tonika.Bus;
    if (!bus || !bus.addEventListener) return;

    const checkbox = document.getElementById("high-contrast-toggle");
    if (!checkbox) return;

    bus.addEventListener("app:status", () => {
      applyHighContrastEnabled(!!checkbox.checked);
    });
  }

  // ---------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------
  function openTab(index) {
    const tabs = document.querySelectorAll(".tabs button");
    const sections = document.querySelectorAll(".tab-content section");
    tabs.forEach((tab, i) => {
      tab.classList.toggle("active", i === index);
      sections[i]?.classList.toggle("active", i === index);
    });
  }

  // Theme toggle → delegate to TonikaTheme
  function toggleTheme() {
    if (window.TonikaTheme && typeof window.TonikaTheme.toggleMode === "function") {
      window.TonikaTheme.toggleMode();
    } else {
      console.warn("TonikaTheme.toggleMode() not available");
    }
  }

  function bindTabs() {
    const tabs = document.querySelectorAll(".tabs button");
    tabs.forEach((btn, i) => {
      if (!btn.dataset.bound) {
        btn.addEventListener("click", () => openTab(i));
        btn.dataset.bound = "1";
      }
    });
  }

  function bindThemeToggle() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action='toggle-theme']");
      if (btn) toggleTheme();
    });
  }

  // ---------------------------------------------------------------------
  // Layout Examples
  // ---------------------------------------------------------------------
  const layoutExamples = {
    "2x2": {
      html: `
<div class="tonika-grid-2">
  <div class="tonika-module">R1 C1</div>
  <div class="tonika-module">R1 C2</div>
  <div class="tonika-module">R2 C1</div>
  <div class="tonika-module">R2 C2</div>
</div>`.trim()
    },
    "left-stack-right": {
      html: `
<div class="tonika-grid-2">
  <div class="tonika-module">Left Column (R1 C1)</div>
  <div class="tonika-grid-1-stack">
    <div class="tonika-module">Right Top (R1 C2)</div>
    <div class="tonika-module">Right Bottom (R2 C2)</div>
  </div>
</div>`.trim()
    },
    "single-column": {
      html: `
<div class="tonika-grid-1-stack">
  <div class="tonika-module">Block 1</div>
  <div class="tonika-module">Block 2</div>
</div>`.trim()
    }
  };

  function renderLayoutExample(value) {
    const config = layoutExamples[value];
    const preview = document.getElementById("layout-preview");
    const code = document.getElementById("layout-code");

    if (!config || !preview || !code) return;

    preview.innerHTML = config.html;
    preview.className = ""; // <-- Clear previous classes
    code.textContent = config.html;
  }

  function bindLayoutDropdown() {
    const dropdown = document.getElementById("layout-selector");
    if (dropdown) {
      dropdown.addEventListener("change", (e) =>
        renderLayoutExample(e.target.value)
      );
      renderLayoutExample(dropdown.value); // Init on load
    }
  }

  // ---------------------------------------------------------------------
  // Init + Public API
  // ---------------------------------------------------------------------
  function init() {
    bindTabs();
    bindThemeToggle();
    bindLayoutDropdown();
    bindHighContrastToggle();
    bindBusSyncForHighContrast();
  }

  function copyLayoutCode() {
    const codeBlock = document.getElementById("layout-code");
    const range = document.createRange();
    range.selectNode(codeBlock);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    try {
      document.execCommand("copy");
      console.log("Layout code copied to clipboard.");
    } catch (err) {
      console.error("Copy failed:", err);
    }
    selection.removeAllRanges();
  }

  // Expose API (backwards compat + convenience)
  UI.openTab = openTab;
  UI.toggleTheme = toggleTheme;
  UI.copyLayoutCode = copyLayoutCode;
  UI.init = init;

  // Optional external control:
  UI.setHighContrast = applyHighContrastEnabled;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();