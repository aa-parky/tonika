/* ======================================================================
   Tonika Theme Manager
   ----------------------------------------------------------------------
   - Loads theme manifest (css/themes/themes.json)
   - Injects theme CSS links (if not already present)
   - Applies theme via <html data-theme="...">
   - Persists selection to localStorage
   - Wires Settings UI (#theme-selector, #high-contrast-toggle)
   - Falls back to scanning existing <link> tags if manifest missing
   - Emits Tonika.Bus events if available
   ====================================================================== */

(function () {
  "use strict";

  const MANIFEST_URL = "css/themes/themes.json";
  const STORAGE_KEYS = {
    theme: "tonika-theme",
    mode: "tonika-mode",
    highContrast: "tonika-high-contrast"
  };

  const root = document.documentElement;
  const body = document.body;

  // Dispatch helper (safe even if Bus is missing)
  function bus(evt, detail = {}) {
    try {
      if (window.Tonika && Tonika.Bus && typeof Tonika.Bus.dispatchEvent === "function") {
        Tonika.Bus.dispatchEvent(new CustomEvent(evt, { detail }));
      }
    } catch (e) {
      // no-op
    }
  }

  // Utility: Title-case from slug
  function niceNameFromValue(value) {
    return value
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }

  // Utility: generate stable "value" from filename (brown_01.css -> brown-01)
  function valueFromFilename(file) {
    return file.replace(/\.css$/i, "").replace(/_/g, "-");
  }

  // Inject <link> for a theme file if not already present
  function ensureLinkForTheme(file, value) {
    const id = `theme-${value}`;
    const existingById = document.getElementById(id);
    if (existingById) return existingById;

    // Check if an equivalent href is already present (when user had links in HTML)
    const existingHref = Array.from(
      document.querySelectorAll('link[rel="stylesheet"]')
    ).find((lnk) => (lnk.getAttribute("href") || "").endsWith(`/css/themes/${file}`));
    if (existingHref) return existingHref;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.id = id;
    link.href = `css/themes/${file}`;
    document.head.appendChild(link);
    return link;
  }

  // Build the <select> with theme options
  function populateSelector(themes) {
    const selector = document.getElementById("theme-selector");
    if (!selector) return;

    selector.innerHTML = "";

    for (const t of themes) {
      const opt = document.createElement("option");
      opt.value = t.value;
      opt.textContent = t.name || niceNameFromValue(t.value);
      selector.appendChild(opt);
    }
  }

  // Apply the chosen theme
  function applyTheme(themeValue) {
    if (!themeValue) return;
    root.setAttribute("data-theme", themeValue);
    localStorage.setItem(STORAGE_KEYS.theme, themeValue);
    bus("theme:applied", { value: themeValue });
  }

  // Toggle light/dark mode
  function applyMode(mode) {
    const normalized = mode === "dark" ? "dark" : "light";
    root.setAttribute("data-mode", normalized);
    localStorage.setItem(STORAGE_KEYS.mode, normalized);
    bus("theme:mode-toggled", { mode: normalized });
  }

  // High contrast toggle (uses body class expected by tonika-accessibility.css)
  function applyHighContrast(enabled) {
    body.classList.toggle("tonika--high-contrast", !!enabled);
    localStorage.setItem(STORAGE_KEYS.highContrast, enabled ? "1" : "0");
    bus("theme:contrast-toggled", { enabled: !!enabled });
  }

  // Wire the Settings UI controls
  function wireControls(themes) {
    const selector = document.getElementById("theme-selector");
    if (selector) {
      selector.addEventListener("change", (e) => {
        applyTheme(e.target.value);
      });

      // Initialize to saved or first theme
      const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
      const initial = savedTheme && themes.some(t => t.value === savedTheme)
        ? savedTheme
        : (themes[0]?.value || "");
      selector.value = initial;
      applyTheme(initial);
    }

    const hcToggle = document.getElementById("high-contrast-toggle");
    if (hcToggle) {
      const savedHC = localStorage.getItem(STORAGE_KEYS.highContrast) === "1";
      hcToggle.checked = savedHC;
      applyHighContrast(savedHC);
      hcToggle.addEventListener("change", (e) => applyHighContrast(e.target.checked));
    }

    // Mode: restore last mode
    const savedMode = localStorage.getItem(STORAGE_KEYS.mode) || "light";
    applyMode(savedMode);
  }

  // Public API
  const TonikaTheme = {
    applyTheme, // optional external use
    toggleMode() {
      const current = root.getAttribute("data-mode") || "light";
      applyMode(current === "light" ? "dark" : "light");
    },
    setMode(mode) {
      applyMode(mode);
    },
    enableHighContrast() {
      applyHighContrast(true);
    },
    disableHighContrast() {
      applyHighContrast(false);
    }
  };

  // Expose globally
  window.TonikaTheme = TonikaTheme;

  // Load manifest → inject links → wire UI
  async function init() {
    // If DOM isn't ready yet, wait for it
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
      return;
    }

    // Try manifest first
    let themes = [];
    try {
      const res = await fetch(MANIFEST_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      themes = await res.json();

      // Basic validation/normalization
      themes = (themes || [])
        .filter(t => t && (t.file || t.href || t.value))
        .map(t => {
          const file = t.file || t.href || "";
          const value = t.value || valueFromFilename(file);
          const name = t.name || niceNameFromValue(value);
          return { name, value, file };
        });

      bus("theme:manifest-loaded", { count: themes.length });
    } catch (err) {
      console.warn("[TonikaTheme] Failed to load themes.json, falling back:", err);

      // Fallback 1: scan already linked stylesheets in head
      const linked = Array.from(
        document.querySelectorAll('link[rel="stylesheet"][href*="css/themes/"]')
      ).map((lnk) => {
        const href = lnk.getAttribute("href") || "";
        const file = href.split("/").pop() || "";
        const value = valueFromFilename(file);
        return {
          name: niceNameFromValue(value),
          value,
          file
        };
      });

      // Deduplicate by value
      const dedup = new Map(linked.map(t => [t.value, t]));
      themes = Array.from(dedup.values());

      if (themes.length === 0) {
        // Fallback 2: minimal hardcoded list (keeps app functional)
        themes = [
          { name: "Nocturne", value: "nocturne", file: "nocturne.css" }
        ];
      }

      bus("theme:fallback-used", { count: themes.length });
    }

    // Ensure each theme CSS is linked
    themes.forEach(t => {
      if (t.file) ensureLinkForTheme(t.file, t.value);
    });

    // Build selector + apply saved
    populateSelector(themes);
    wireControls(themes);
  }

  // Kick off
  init();
})();
