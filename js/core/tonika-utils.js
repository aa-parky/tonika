
/*!
 * Tonika Utils — Shared utility functions for Tonika modules
 * Location: js/core/tonika-utils.js
 *
 * Purpose:
 *   Provides pure utility functions used across multiple Tonika modules.
 *   Prevents code duplication and ensures consistent behavior.
 *
 * Inclusion Criteria:
 *   ✅ Function must be used by 2+ modules to justify inclusion
 *   ✅ Function must be pure (no side effects, same input = same output)
 *   ✅ Function must do ONE thing well (Unix philosophy)
 *   ✅ Function must be generic enough to be useful across different contexts
 *   ❌ No module-specific business logic
 *   ❌ No DOM manipulation that's specific to one module's UI
 *   ❌ No functions that maintain state or have side effects
 */

/* eslint-env browser, node */

(function () {
  "use strict";

  // ==========================================================================
  // ERROR HANDLING AND LOGGING
  // ==========================================================================

  /**
   * Standardized debug logger for Tonika modules.
   *
   * @param {string} moduleName - The module name (from moduleInfo.name).
   * @param {string} eventName  - The event being logged.
   * @param {object} [detail={}] - Optional detail object.
   */
  function debugLog(moduleName, eventName, detail = {}) {
    if (!window.Tonika?.debug) return;
    try {
      console.log(`[${moduleName}] → ${eventName}`, detail);
    } catch (e) {
      console.log(`[${moduleName}] → ${eventName}`);
    }
  }

  // ==========================================================================
  // DEV/DEMO UTILITIES
  // ==========================================================================
  /**
   * Toggle debug grid/outline mode on a container.
   * @param {HTMLElement} container - The module container.
   * @param {boolean} [enabled] - Optional explicit state, otherwise toggles.
   */
  function toggleDebug(container, enabled) {
    if (!container) return;
    const debugClass = 'tonika--debug'; // Generic class
    if (typeof enabled === "boolean") {
      container.classList.toggle(debugClass, enabled);
    } else {
      container.classList.toggle(debugClass);
    }
  }

  /**
   * Reset styles (background, textures, shadows) on a module container.
   * @param {HTMLElement} container - The module container.
   * @param {object} [options] - Optional references to controls to reset.
   * @param {object} [options.config] - Configuration with selectors for buttons, rotaries, etc.
   */
  function resetModuleStyles(container, options = {}) {
    if (!container) return;

    container.style.background = "var(--color-bg)";
    container.style.backgroundColor = "";
    container.style.backgroundSize = "auto";

    // Clear shadows from configured elements
    if (options.config) {
      const selectors = Object.values(options.config).join(',');
      if (selectors) {
        container.querySelectorAll(selectors).forEach(el => {
          el.style.boxShadow = "";
        });
      }
    }

    // Reset controls if provided
    if (options.bgColorPicker) options.bgColorPicker.value = "#2c2c2c";
    if (options.textureSelect) options.textureSelect.value = "";
    if (options.textureMode) options.textureMode.value = "tile";
    if (options.textureScale) options.textureScale.value = "200";
  }

  /**
   * Apply a tinted bleed effect to elements inside a container.
   * @param {HTMLElement} container - The module container.
   * @param {string} color - Hex color string (#rrggbb).
   * @param {object} config - Configuration object with selectors.
   * @param {string} [config.buttons] - Selector for button elements.
   * @param {string} [config.rotaries] - Selector for rotary elements.
   * @param {string} [config.touchbars] - Selector for touchbar elements.
   */
  function applyBleedTint(container, color, config = {}) {
    if (!container || !color) return;

    let r = parseInt(color.substr(1, 2), 16);
    let g = parseInt(color.substr(3, 2), 16);
    let b = parseInt(color.substr(5, 2), 16);
    let brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    if (brightness < 80) {
      r = Math.min(255, r + 60);
      g = Math.min(255, g + 60);
      b = Math.min(255, b + 60);
    }
    const tint = `rgba(${r}, ${g}, ${b}, 0.3)`;

    if (config.buttons) {
      container.querySelectorAll(config.buttons).forEach(el => {
        el.style.boxShadow = `0 0 6px ${tint} inset, 0 0 10px ${tint}`;
      });
    }
    if (config.rotaries) {
      container.querySelectorAll(config.rotaries).forEach(el => {
        el.style.boxShadow = `0 0 10px ${tint} inset, 0 0 18px ${tint}`;
      });
    }
    if (config.touchbars) {
      container.querySelectorAll(config.touchbars).forEach(el => {
        el.style.boxShadow = `0 0 3px ${tint} inset, 0 0 6px ${tint}`;
      });
    }
  }

  /**
   * Apply a texture background to a container.
   * @param {HTMLElement} container - The module container.
   * @param {string} file - URL of the texture (or "" for none).
   * @param {string} mode - "tile" or "stretch".
   * @param {string|number} scale - Size in px for tiling.
   */
  function applyTexture(container, file, mode = "tile", scale = 200) {
    if (!container) return;

    if (!file) {
      container.style.background = "var(--color-bg)";
      container.style.backgroundSize = "auto";
      return;
    }
    if (mode === "tile") {
      container.style.background = `url('${file}') repeat`;
      container.style.backgroundSize = `${scale}px ${scale}px`;
    } else {
      container.style.background = `url('${file}') center/cover no-repeat`;
      container.style.backgroundSize = "cover";
    }
  }

  // ==========================================================================
  // EXPORT STRUCTURE
  // ==========================================================================

  const TonikaUtils = {
    // Error Handling
    debugLog: debugLog,

    // Dev/Demo
    toggleDebug: toggleDebug,
    resetModuleStyles: resetModuleStyles,
    applyBleedTint: applyBleedTint,
    applyTexture: applyTexture,
  };

  // --- Exports ---------------------------------------------------------------
  if (typeof window !== "undefined") {
    window.Tonika = window.Tonika || {};
    window.Tonika.Utils = TonikaUtils;
  }

  // CommonJS support for testing
  if (typeof module !== "undefined" && module.exports) {
    module.exports = TonikaUtils;
  }

})();

