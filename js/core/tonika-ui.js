// tonika-ui.js — tiny UI helpers for dev template (tabs + theme)
// Exposes a minimal API at window.Tonika.UI and auto-binds on DOM ready.
(() => {
  const Tonika = (window.Tonika = window.Tonika || {});
  const UI = (Tonika.UI = Tonika.UI || {});

  // Tab switching: expects .tabs button order to match .tab-content section order.
  function openTab(index) {
    const tabs = document.querySelectorAll(".tabs button");
    const sections = document.querySelectorAll(".tab-content section");
    tabs.forEach((tab, i) => {
      tab.classList.toggle("active", i === index);
      sections[i]?.classList.toggle("active", i === index);
    });
  }

  // Theme toggle between light/dark test themes
  function toggleTheme() {
    const body = document.body;
    const DARK = "tonika-theme-dark";
    const LIGHT = "tonika-theme-light";
    if (body.classList.contains(DARK)) {
      body.classList.remove(DARK);
      body.classList.add(LIGHT);
    } else {
      body.classList.remove(LIGHT);
      body.classList.add(DARK);
    }
  }

  // Optional: bind click handlers without inline attributes
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

  function init() {
    bindTabs();
    bindThemeToggle();
  }

  // Expose API for backward-compat with inline onclick
  UI.openTab = openTab;
  UI.toggleTheme = toggleTheme;
  UI.init = init;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
