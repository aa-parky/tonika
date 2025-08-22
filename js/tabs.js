// tabs.js - Tab switching functionality for Tonika supporting area

(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function switchTab(targetTabId) {
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach((btn) => btn.classList.remove("active"));

    // Hide all tab panels
    const tabPanels = document.querySelectorAll(".tab-panel");
    tabPanels.forEach((panel) => panel.classList.remove("active"));

    // Activate the target tab button
    const targetButton = document.querySelector(`[data-tab="${targetTabId}"]`);
    if (targetButton) {
      targetButton.classList.add("active");
    }

    // Show the target tab panel
    const targetPanel = document.getElementById(`tab-${targetTabId}`);
    if (targetPanel) {
      targetPanel.classList.add("active");
    }

    // Store the active tab in localStorage for persistence
    localStorage.setItem("tonika-active-tab", targetTabId);
  }

  function initializeTabs() {
    // Add click event listeners to tab buttons
    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const tabId = button.getAttribute("data-tab");
        if (tabId) {
          switchTab(tabId);
        }
      });
    });

    // Restore the last active tab from localStorage
    const savedTab = localStorage.getItem("tonika-active-tab");
    if (savedTab && document.getElementById(`tab-${savedTab}`)) {
      switchTab(savedTab);
    } else {
      // Default to 'takes' tab if no saved tab or saved tab doesn't exist
      switchTab("takes");
    }

    // Sync settings between main dialog and settings tab
    syncSettingsControls();
  }

  function syncSettingsControls() {
    // Sync big chord scale slider
    const mainSlider = document.getElementById("bigChordScale");
    const tabSlider = document.getElementById("bigChordScaleTab");
    const mainValue = document.getElementById("bigChordScaleVal");
    const tabValue = document.getElementById("bigChordScaleTabVal");

    if (mainSlider && tabSlider) {
      // Sync from main to tab
      mainSlider.addEventListener("input", () => {
        tabSlider.value = mainSlider.value;
        if (tabValue) {
          tabValue.textContent = Math.round(mainSlider.value * 100) + "%";
        }
      });

      // Sync from tab to main
      tabSlider.addEventListener("input", () => {
        mainSlider.value = tabSlider.value;
        if (mainValue) {
          mainValue.textContent = Math.round(tabSlider.value * 100) + "%";
        }
        // Trigger the main slider's input event to update the app
        mainSlider.dispatchEvent(new Event("input"));
      });

      // Initial sync
      tabSlider.value = mainSlider.value;
      if (tabValue) {
        tabValue.textContent = Math.round(mainSlider.value * 100) + "%";
      }
    }

    // Sync theory explanations checkbox
    const mainCheckbox = document.getElementById("showTheoryExplanations");
    const tabCheckbox = document.getElementById("showTheoryExplanationsTab");

    if (mainCheckbox && tabCheckbox) {
      // Sync from main to tab
      mainCheckbox.addEventListener("change", () => {
        tabCheckbox.checked = mainCheckbox.checked;
      });

      // Sync from tab to main
      tabCheckbox.addEventListener("change", () => {
        mainCheckbox.checked = tabCheckbox.checked;
        // Trigger the main checkbox's change event to update the app
        mainCheckbox.dispatchEvent(new Event("change"));
      });

      // Initial sync
      tabCheckbox.checked = mainCheckbox.checked;
    }
  }

  // Keyboard shortcuts for tab navigation
  function handleKeyboardShortcuts(e) {
    // Tab key (when not in an input field) cycles through tabs
    if (
      e.key === "Tab" &&
      !e.target.matches("input, select, textarea, button")
    ) {
      e.preventDefault();
      const tabButtons = document.querySelectorAll(".tab-btn");
      const activeButton = document.querySelector(".tab-btn.active");

      if (activeButton && tabButtons.length > 0) {
        const currentIndex = Array.from(tabButtons).indexOf(activeButton);
        const nextIndex = (currentIndex + 1) % tabButtons.length;
        const nextTab = tabButtons[nextIndex].getAttribute("data-tab");
        if (nextTab) {
          switchTab(nextTab);
        }
      }
    }
  }

  ready(() => {
    initializeTabs();

    // Add keyboard shortcut listener
    document.addEventListener("keydown", handleKeyboardShortcuts);
  });

  // Export functions for external use
  window.TonikaTabSystem = {
    switchTab: switchTab,
    getCurrentTab: () => {
      const activeButton = document.querySelector(".tab-btn.active");
      return activeButton ? activeButton.getAttribute("data-tab") : null;
    },
  };
})();
