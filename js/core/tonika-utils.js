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
  // MUSIC THEORY UTILITIES
  // ==========================================================================

  // ==========================================================================
  // TIMING AND RHYTHM UTILITIES
  // ==========================================================================

  // ==========================================================================
  // DOM AND UI UTILITIES
  // ==========================================================================

  // ==========================================================================
  // AUDIO CONTEXT UTILITIES
  // ==========================================================================

  // ==========================================================================
  // VALIDATION AND TYPE CHECKING
  // ==========================================================================

  // ==========================================================================
  // ARRAY AND OBJECT UTILITIES
  // ==========================================================================

  // ==========================================================================
  // STORAGE AND PERSISTENCE
  // ==========================================================================

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
  // PERFORMANCE UTILITIES
  // ==========================================================================

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
    if (typeof enabled === "boolean") {
      container.classList.toggle("synthonika--debug", enabled);
    } else {
      container.classList.toggle("synthonika--debug");
    }
  }

  /**
   * Reset styles (background, textures, shadows) on a module container.
   * Used to restore a "clean" default dev state without a page refresh.
   * @param {HTMLElement} container - The module container.
   * @param {object} [options] - Optional references to controls to reset.
   * @param {HTMLInputElement} [options.bgColorPicker]
   * @param {HTMLSelectElement} [options.textureSelect]
   * @param {HTMLSelectElement} [options.textureMode]
   * @param {HTMLSelectElement} [options.textureScale]
   */
  function resetModuleStyles(container, options = {}) {
    if (!container) return;

    container.style.background = "var(--color-bg)";
    container.style.backgroundColor = "";
    container.style.backgroundSize = "auto";

    // Clear shadows
    container.querySelectorAll("div").forEach(el => {
      el.style.boxShadow = "";
    });

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
   */
  function applyBleedTint(container, color) {
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

    container.querySelectorAll('.synthonika__button').forEach(el => {
      el.style.boxShadow = `0 0 6px ${tint} inset, 0 0 10px ${tint}`;
    });
    container.querySelectorAll('.synthonika__rotary').forEach(el => {
      el.style.boxShadow = `0 0 10px ${tint} inset, 0 0 18px ${tint}`;
    });
    container.querySelectorAll('.synthonika__touchbar').forEach(el => {
      el.style.boxShadow = `0 0 3px ${tint} inset, 0 0 6px ${tint}`;
    });
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